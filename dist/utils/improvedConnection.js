import jsforce from 'jsforce';
import { ConnectionType } from '../types/connection.js';
import { persistentTokenStore } from './persistentTokenStore.js';
import { logger } from './logger.js';
import https from 'https';
import querystring from 'querystring';
/**
 * Enhanced connection utility with improved error handling and token management
 */
export class SalesforceConnectionError extends Error {
    constructor(message, code, statusCode = 500, isRetryable = false) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.isRetryable = isRetryable;
        this.name = 'SalesforceConnectionError';
    }
}
/**
 * Creates a Salesforce connection using either username/password or OAuth 2.0 Client Credentials Flow
 * @param config Optional connection configuration
 * @returns Connected jsforce Connection instance
 */
export async function createSalesforceConnection(config) {
    const connectionType = config?.type ||
        process.env.SALESFORCE_CONNECTION_TYPE ||
        ConnectionType.User_Password;
    const loginUrl = config?.loginUrl ||
        process.env.SALESFORCE_INSTANCE_URL ||
        'https://login.salesforce.com';
    try {
        if (connectionType === ConnectionType.OAuth_2_0_Client_Credentials) {
            return await createClientCredentialsConnection(loginUrl);
        }
        else {
            return await createUsernamePasswordConnection(loginUrl);
        }
    }
    catch (error) {
        logger.error('Failed to create Salesforce connection', {
            connectionType,
            loginUrl: loginUrl.replace(/\/\/.*@/, '//***@'), // Mask credentials in URL
            error: error instanceof Error ? error.message : String(error)
        });
        throw error;
    }
}
async function createClientCredentialsConnection(loginUrl) {
    const clientId = process.env.SALESFORCE_CLIENT_ID;
    const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new SalesforceConnectionError('SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET are required for OAuth 2.0 Client Credentials Flow', 'MISSING_CREDENTIALS', 400);
    }
    logger.info('Connecting to Salesforce using OAuth 2.0 Client Credentials Flow');
    const instanceUrl = loginUrl;
    const tokenUrl = new URL('/services/oauth2/token', instanceUrl);
    const requestBody = querystring.stringify({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
    });
    const tokenResponse = await makeTokenRequest(tokenUrl, requestBody);
    const conn = new jsforce.Connection({
        instanceUrl: tokenResponse.instance_url,
        accessToken: tokenResponse.access_token
    });
    // Test the connection
    await testConnection(conn);
    return conn;
}
async function createUsernamePasswordConnection(loginUrl) {
    const username = process.env.SALESFORCE_USERNAME;
    const password = process.env.SALESFORCE_PASSWORD;
    const token = process.env.SALESFORCE_TOKEN;
    if (!username || !password) {
        throw new SalesforceConnectionError('SALESFORCE_USERNAME and SALESFORCE_PASSWORD are required for Username/Password authentication', 'MISSING_CREDENTIALS', 400);
    }
    logger.info('Connecting to Salesforce using Username/Password authentication');
    const conn = new jsforce.Connection({ loginUrl });
    try {
        await conn.login(username, password + (token || ''));
        await testConnection(conn);
        return conn;
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('INVALID_LOGIN')) {
                throw new SalesforceConnectionError('Invalid username, password, or security token', 'INVALID_LOGIN', 401);
            }
            else if (error.message.includes('API_DISABLED_FOR_ORG')) {
                throw new SalesforceConnectionError('API access is disabled for this organization', 'API_DISABLED', 403);
            }
        }
        throw error;
    }
}
/**
 * Creates a Salesforce connection for a specific user using stored tokens
 */
export async function createUserSalesforceConnection(userId) {
    const userConnection = await persistentTokenStore.getConnectionByUserId(userId);
    if (!userConnection) {
        throw new SalesforceConnectionError(`No Salesforce connection found for user: ${userId}`, 'NO_CONNECTION', 401);
    }
    let refreshed = false;
    let conn;
    try {
        conn = new jsforce.Connection({
            instanceUrl: userConnection.tokens.instanceUrl,
            accessToken: userConnection.tokens.accessToken,
            refreshToken: userConnection.tokens.refreshToken
        });
        // Set up automatic token refresh
        conn.on('refresh', async (accessToken, res) => {
            logger.info('Token automatically refreshed', { userId });
            refreshed = true;
            await persistentTokenStore.updateTokens(userId, {
                accessToken,
                expiresAt: res.expires_in ? new Date(Date.now() + (res.expires_in * 1000)) : undefined
            });
        });
        // Test the connection
        await testConnection(conn);
        return { connection: conn, refreshed };
    }
    catch (error) {
        logger.error('Failed to create user connection', {
            userId,
            error: error instanceof Error ? error.message : String(error)
        });
        if (error instanceof Error && error.message.includes('Session expired')) {
            // Try to refresh the token manually
            try {
                const refreshResult = await refreshUserToken(userConnection);
                if (refreshResult) {
                    conn = new jsforce.Connection({
                        instanceUrl: userConnection.tokens.instanceUrl,
                        accessToken: refreshResult.accessToken
                    });
                    await testConnection(conn);
                    return { connection: conn, refreshed: true };
                }
            }
            catch (refreshError) {
                logger.error('Token refresh failed', { userId, refreshError });
            }
            throw new SalesforceConnectionError('Session expired and refresh failed. Please re-authenticate.', 'SESSION_EXPIRED', 401);
        }
        throw new SalesforceConnectionError(`Failed to create connection for user ${userId}`, 'CONNECTION_FAILED', 500, true);
    }
}
/**
 * Creates a Salesforce connection for a specific session
 */
export async function createSessionSalesforceConnection(sessionId) {
    const userConnection = await persistentTokenStore.getConnectionBySession(sessionId);
    if (!userConnection) {
        throw new SalesforceConnectionError(`No Salesforce connection found for session: ${sessionId}`, 'NO_SESSION', 401);
    }
    return createUserSalesforceConnection(userConnection.userId);
}
async function makeTokenRequest(tokenUrl, requestBody) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            method: 'POST',
            hostname: tokenUrl.hostname,
            path: tokenUrl.pathname,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(requestBody)
            },
            timeout: 30000 // 30 second timeout
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    if (res.statusCode !== 200) {
                        const error = new SalesforceConnectionError(`OAuth token request failed: ${parsedData.error} - ${parsedData.error_description}`, 'TOKEN_REQUEST_FAILED', res.statusCode || 500, res.statusCode === 429 || res.statusCode >= 500);
                        reject(error);
                    }
                    else {
                        resolve(parsedData);
                    }
                }
                catch (e) {
                    reject(new SalesforceConnectionError(`Failed to parse OAuth response: ${e instanceof Error ? e.message : String(e)}`, 'PARSE_ERROR', 500));
                }
            });
        });
        req.on('error', (e) => {
            reject(new SalesforceConnectionError(`OAuth request error: ${e.message}`, 'NETWORK_ERROR', 500, true));
        });
        req.on('timeout', () => {
            req.destroy();
            reject(new SalesforceConnectionError('OAuth request timeout', 'TIMEOUT', 504, true));
        });
        req.write(requestBody);
        req.end();
    });
}
async function testConnection(conn) {
    try {
        // Simple test to verify the connection works
        const limits = await conn.query('SELECT Id FROM Organization LIMIT 1');
        logger.debug('Connection test successful', { recordCount: limits.totalSize });
    }
    catch (error) {
        logger.error('Connection test failed', { error: error instanceof Error ? error.message : String(error) });
        throw new SalesforceConnectionError('Connection test failed', 'CONNECTION_TEST_FAILED', 500);
    }
}
async function refreshUserToken(userConnection) {
    try {
        // This would typically use the OAuth refresh flow
        // For now, return null to indicate refresh is not possible
        logger.warn('Manual token refresh not implemented', { userId: userConnection.userId });
        return null;
    }
    catch (error) {
        logger.error('Token refresh failed', {
            userId: userConnection.userId,
            error: error instanceof Error ? error.message : String(error)
        });
        return null;
    }
}
/**
 * Connection health check
 */
export async function checkConnectionHealth(conn) {
    const start = Date.now();
    try {
        await conn.query('SELECT Id FROM Organization LIMIT 1');
        const latency = Date.now() - start;
        return { healthy: true, latency };
    }
    catch (error) {
        return {
            healthy: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
/**
 * Cleanup connections
 */
export async function cleanupConnections() {
    try {
        await persistentTokenStore.cleanup();
        logger.info('Connection cleanup completed');
    }
    catch (error) {
        logger.error('Connection cleanup failed', {
            error: error instanceof Error ? error.message : String(error)
        });
    }
}
