// Correct JSForce import and usage pattern
import jsforce from 'jsforce';
import https from 'https';
import querystring from 'querystring';
import { ConnectionType, ConnectionConfig } from '../types/connection.js';
import { tokenStore, UserConnection } from './tokenStore.js';
import { logger } from './logger.js';

// Type definition for jsforce Connection since it lacks TypeScript definitions
interface JSForceConnection {
  instanceUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  login(username: string, password: string): Promise<any>;
  on(event: string, handler: Function): void;
  query(soql: string): Promise<any>;
  identity(): Promise<any>;
}

// Keyed connection cache for multi-tenant support
interface CachedConnection {
  connection: JSForceConnection;
  expiry: number;
}

const connectionCache = new Map<string, CachedConnection>();
const connectionPromises = new Map<string, Promise<JSForceConnection>>();
const CONNECTION_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

function createConnectionFingerprint(config?: ConnectionConfig): string {
  const connectionType = config?.type || 
    (process.env.SALESFORCE_CONNECTION_TYPE as ConnectionType) || 
    ConnectionType.User_Password;
  
  const loginUrl = config?.loginUrl || 
    process.env.SALESFORCE_INSTANCE_URL || 
    'https://login.salesforce.com';

  if (connectionType === ConnectionType.OAuth_2_0_Client_Credentials) {
    const clientId = process.env.SALESFORCE_CLIENT_ID || '';
    return `oauth2:${loginUrl}:${clientId}`;
  } else {
    const username = process.env.SALESFORCE_USERNAME || '';
    return `userpass:${loginUrl}:${username}`;
  }
}

async function isConnectionHealthy(connection: JSForceConnection): Promise<boolean> {
  try {
    await connection.identity();
    return true;
  } catch (error) {
    logger.debug('Connection health check failed', { error });
    return false;
  }
}

async function createConnectionInternal(config?: ConnectionConfig): Promise<JSForceConnection> {
  // Determine connection type from environment variables or config
  const connectionType = config?.type || 
    (process.env.SALESFORCE_CONNECTION_TYPE as ConnectionType) || 
    ConnectionType.User_Password;
  
  // Set login URL from config or environment variable
  const loginUrl = config?.loginUrl || 
    process.env.SALESFORCE_INSTANCE_URL || 
    'https://login.salesforce.com';
  
  if (connectionType === ConnectionType.OAuth_2_0_Client_Credentials) {
    // OAuth 2.0 Client Credentials Flow
    const clientId = process.env.SALESFORCE_CLIENT_ID;
    const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET are required for OAuth 2.0 Client Credentials Flow');
    }
    
    logger.info('Connecting to Salesforce using OAuth 2.0 Client Credentials Flow');
    
    // Get the instance URL from environment variable or config
    const instanceUrl = loginUrl;
    
    // Create the token URL
    const tokenUrl = new URL('/services/oauth2/token', instanceUrl);
    
    // Prepare the request body
    const requestBody = querystring.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    });
    
    // Make the token request
    const tokenResponse = await new Promise<any>((resolve, reject) => {
      const req = https.request({
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
            } else {
              resolve(parsedData);
            }
          } catch (e: unknown) {
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
    
    // CORRECT: Use jsforce.Connection constructor
    const conn = new (jsforce as any).Connection({
      instanceUrl: tokenResponse.instance_url,
      accessToken: tokenResponse.access_token
    });
    
    return conn;
  } else {
    // Default: Username/Password Flow with Security Token
    const username = process.env.SALESFORCE_USERNAME;
    const password = process.env.SALESFORCE_PASSWORD;
    const token = process.env.SALESFORCE_TOKEN;
    
    if (!username || !password) {
      throw new Error('SALESFORCE_USERNAME and SALESFORCE_PASSWORD are required for Username/Password authentication');
    }
    
    logger.info('Connecting to Salesforce using Username/Password authentication');
    
    // CORRECT: Use jsforce.Connection constructor
    const conn = new (jsforce as any).Connection({ loginUrl });
    
    logger.info('Attempting Salesforce login');
    await conn.login(
      username,
      password + (token || '')
    );
    logger.info('Salesforce login successful');
    
    return conn;
  }
}

/**
 * Creates a Salesforce connection using either username/password or OAuth 2.0 Client Credentials Flow
 * @param config Optional connection configuration
 * @returns Connected jsforce Connection instance
 */
export async function createSalesforceConnection(config?: ConnectionConfig): Promise<JSForceConnection> {
  const cacheKey = createConnectionFingerprint(config);
  const now = Date.now();
  
  // Check keyed cache first for production performance
  const cached = connectionCache.get(cacheKey);
  if (cached && now < cached.expiry) {
    // Perform health check on cached connection
    if (await isConnectionHealthy(cached.connection)) {
      // Optionally refresh expiry on successful health check
      cached.expiry = now + CONNECTION_CACHE_DURATION;
      logger.info('Using cached Salesforce connection', { cacheKey });
      return cached.connection;
    } else {
      // Health check failed, invalidate cache
      logger.info('Health check failed for cached connection, invalidating cache', { cacheKey });
      connectionCache.delete(cacheKey);
    }
  }
  
  // Check if there's already a connection promise in progress for this key
  const existingPromise = connectionPromises.get(cacheKey);
  if (existingPromise) {
    logger.info('Awaiting existing connection promise', { cacheKey });
    return await existingPromise;
  }
  
  // Create new connection promise
  const connectionPromise = createConnectionInternal(config);
  connectionPromises.set(cacheKey, connectionPromise);
  
  try {
    const connection = await connectionPromise;
    
    // Cache the connection for production performance
    connectionCache.set(cacheKey, {
      connection,
      expiry: now + CONNECTION_CACHE_DURATION
    });
    
    return connection;
  } catch (error) {
    logger.error('Error connecting to Salesforce', { error });
    throw error;
  } finally {
    // Always clear the connection promise
    connectionPromises.delete(cacheKey);
  }
}

/**
 * Creates a Salesforce connection for a specific user using stored tokens
 * @param userId User identifier
 * @returns Connected jsforce Connection instance
 */
export async function createUserSalesforceConnection(userId: string): Promise<JSForceConnection> {
  const userConnection = tokenStore.getConnectionByUserId(userId);
  
  if (!userConnection) {
    throw new Error(`No Salesforce connection found for user: ${userId}`);
  }

  // CORRECT: Use jsforce.Connection constructor
  const conn = new (jsforce as any).Connection({
    instanceUrl: userConnection.tokens.instanceUrl,
    accessToken: userConnection.tokens.accessToken,
    refreshToken: userConnection.tokens.refreshToken
  });

  // Set up automatic token refresh
  conn.on('refresh', (accessToken: string, res: any) => {
    tokenStore.updateTokens(userId, {
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
export async function createSessionSalesforceConnection(sessionId: string): Promise<JSForceConnection> {
  const userConnection = tokenStore.getConnectionBySession(sessionId);
  
  if (!userConnection) {
    throw new Error(`No Salesforce connection found for session: ${sessionId}`);
  }

  return createUserSalesforceConnection(userConnection.userId);
}