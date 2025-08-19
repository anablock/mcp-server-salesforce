"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSalesforceConnection = createSalesforceConnection;
exports.createUserSalesforceConnection = createUserSalesforceConnection;
exports.createSessionSalesforceConnection = createSessionSalesforceConnection;
const jsforce_1 = __importDefault(require("jsforce"));
const connection_js_1 = require("../types/connection.js");
const tokenStore_js_1 = require("./tokenStore.js");
const https_1 = __importDefault(require("https"));
const querystring_1 = __importDefault(require("querystring"));
/**
 * Creates a Salesforce connection using either username/password or OAuth 2.0 Client Credentials Flow
 * @param config Optional connection configuration
 * @returns Connected jsforce Connection instance
 */
async function createSalesforceConnection(config) {
    // Determine connection type from environment variables or config
    const connectionType = config?.type ||
        process.env.SALESFORCE_CONNECTION_TYPE ||
        connection_js_1.ConnectionType.User_Password;
    // Set login URL from config or environment variable
    const loginUrl = config?.loginUrl ||
        process.env.SALESFORCE_INSTANCE_URL ||
        'https://login.salesforce.com';
    try {
        if (connectionType === connection_js_1.ConnectionType.OAuth_2_0_Client_Credentials) {
            // OAuth 2.0 Client Credentials Flow
            const clientId = process.env.SALESFORCE_CLIENT_ID;
            const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
            if (!clientId || !clientSecret) {
                throw new Error('SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET are required for OAuth 2.0 Client Credentials Flow');
            }
            console.error('Connecting to Salesforce using OAuth 2.0 Client Credentials Flow');
            // Get the instance URL from environment variable or config
            const instanceUrl = loginUrl;
            // Create the token URL
            const tokenUrl = new URL('/services/oauth2/token', instanceUrl);
            // Prepare the request body
            const requestBody = querystring_1.default.stringify({
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret
            });
            // Make the token request
            const tokenResponse = await new Promise((resolve, reject) => {
                const req = https_1.default.request({
                    method: 'POST',
                    hostname: tokenUrl.hostname,
                    path: tokenUrl.pathname,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Content-Length': Buffer.byteLength(requestBody)
                    }
                }, (res) => {
                    let data = '';
                    res.on('data', (chunk) => {
                        data += chunk;
                    });
                    res.on('end', () => {
                        try {
                            const parsedData = JSON.parse(data);
                            if (res.statusCode !== 200) {
                                reject(new Error(`OAuth token request failed: ${parsedData.error} - ${parsedData.error_description}`));
                            }
                            else {
                                resolve(parsedData);
                            }
                        }
                        catch (e) {
                            reject(new Error(`Failed to parse OAuth response: ${e instanceof Error ? e.message : String(e)}`));
                        }
                    });
                });
                req.on('error', (e) => {
                    reject(new Error(`OAuth request error: ${e.message}`));
                });
                req.write(requestBody);
                req.end();
            });
            // Create connection with the access token
            const conn = new jsforce_1.default({
                instanceUrl: tokenResponse.instance_url,
                accessToken: tokenResponse.access_token
            });
            return conn;
        }
        else {
            // Default: Username/Password Flow with Security Token
            const username = process.env.SALESFORCE_USERNAME;
            const password = process.env.SALESFORCE_PASSWORD;
            const token = process.env.SALESFORCE_TOKEN;
            if (!username || !password) {
                throw new Error('SALESFORCE_USERNAME and SALESFORCE_PASSWORD are required for Username/Password authentication');
            }
            console.error('Connecting to Salesforce using Username/Password authentication');
            // Create connection with login URL
            const conn = new jsforce_1.default({ loginUrl });
            await conn.login(username, password + (token || ''));
            return conn;
        }
    }
    catch (error) {
        console.error('Error connecting to Salesforce:', error);
        throw error;
    }
}
/**
 * Creates a Salesforce connection for a specific user using stored tokens
 * @param userId User identifier
 * @returns Connected jsforce Connection instance
 */
async function createUserSalesforceConnection(userId) {
    const userConnection = tokenStore_js_1.tokenStore.getConnectionByUserId(userId);
    if (!userConnection) {
        throw new Error(`No Salesforce connection found for user: ${userId}`);
    }
    const conn = new jsforce_1.default({
        instanceUrl: userConnection.tokens.instanceUrl,
        accessToken: userConnection.tokens.accessToken,
        refreshToken: userConnection.tokens.refreshToken
    });
    // Set up automatic token refresh
    conn.on('refresh', (accessToken, res) => {
        tokenStore_js_1.tokenStore.updateTokens(userId, {
            accessToken,
            expiresAt: new Date(Date.now() + (res.expires_in * 1000))
        });
    });
    return conn;
}
/**
 * Creates a Salesforce connection for a specific session
 * @param sessionId Session identifier
 * @returns Connected jsforce Connection instance
 */
async function createSessionSalesforceConnection(sessionId) {
    const userConnection = tokenStore_js_1.tokenStore.getConnectionBySession(sessionId);
    if (!userConnection) {
        throw new Error(`No Salesforce connection found for session: ${sessionId}`);
    }
    return createUserSalesforceConnection(userConnection.userId);
}
