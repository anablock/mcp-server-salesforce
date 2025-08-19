#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as dotenv from "dotenv";

// Import utilities and middleware
import { validateConfig, validateSalesforceConfig } from "./utils/config.js";
import { logger, requestLogger, errorLogger, auditLogger } from "./utils/logger.js";
import { persistentTokenStore } from "./utils/persistentTokenStore.js";
import { SalesforceOAuth } from "./utils/salesforceOAuth.js";
import { createUserSalesforceConnection, createSessionSalesforceConnection, SalesforceConnectionError } from "./utils/improvedConnection.js";
import { createSecurityMiddleware, csrfProtection, generateCSRFToken, validateRequest, securityHeaders, requestTimeout, healthCheckBypass } from "./middleware/security.js";
import { createTokenRefreshMiddleware, requireAuth } from "./middleware/tokenRefresh.js";
import { healthCheckHandler, pingHandler, readinessHandler, livenessHandler, startPeriodicHealthChecks } from "./utils/healthCheck.js";
import { createGracefulShutdown, createShutdownHealthCheck } from "./utils/gracefulShutdown.js";

// Import all tool handlers
import { SEARCH_OBJECTS, handleSearchObjects } from "./tools/search.js";
import { DESCRIBE_OBJECT, handleDescribeObject } from "./tools/describe.js";
import { QUERY_RECORDS, handleQueryRecords, QueryArgs } from "./tools/query.js";
import { DML_RECORDS, handleDMLRecords, DMLArgs } from "./tools/dml.js";
import { MANAGE_OBJECT, handleManageObject, ManageObjectArgs } from "./tools/manageObject.js";
import { MANAGE_FIELD, handleManageField, ManageFieldArgs } from "./tools/manageField.js";
import { SEARCH_ALL, handleSearchAll, SearchAllArgs, WithClause } from "./tools/searchAll.js";
import { READ_APEX, handleReadApex, ReadApexArgs } from "./tools/readApex.js";
import { WRITE_APEX, handleWriteApex, WriteApexArgs } from "./tools/writeApex.js";
import { READ_APEX_TRIGGER, handleReadApexTrigger, ReadApexTriggerArgs } from "./tools/readApexTrigger.js";
import { WRITE_APEX_TRIGGER, handleWriteApexTrigger, WriteApexTriggerArgs } from "./tools/writeApexTrigger.js";
import { EXECUTE_ANONYMOUS, handleExecuteAnonymous, ExecuteAnonymousArgs } from "./tools/executeAnonymous.js";
import { MANAGE_DEBUG_LOGS, handleManageDebugLogs, ManageDebugLogsArgs } from "./tools/manageDebugLogs.js";

dotenv.config();

async function startServer() {
  try {
    // Validate configuration
    const config = validateConfig();
    logger.info('Starting Salesforce MCP SSO Server', {
      nodeEnv: config.nodeEnv,
      port: config.port,
      version: process.env.npm_package_version || '0.0.0'
    });

    // Validate Salesforce configuration
    await validateSalesforceConfig(config);

    const app = express();
    const security = createSecurityMiddleware(config);

    // Initialize Salesforce OAuth
    const salesforceOAuth = new SalesforceOAuth({
      clientId: config.salesforce.clientId,
      clientSecret: config.salesforce.clientSecret,
      redirectUri: config.salesforce.redirectUri,
      loginUrl: config.salesforce.loginUrl
    });

    // Session store setup
    let sessionStore;
    if (config.database) {
      const PgSession = connectPgSimple(session);
      sessionStore = new PgSession({
        conString: config.database.url,
        createTableIfMissing: true,
        tableName: 'session'
      });
    }

    // Trust proxy for correct IP addresses
    app.set('trust proxy', 1);

    // Global middleware
    app.use(healthCheckBypass);
    app.use(requestTimeout(30000));
    app.use(securityHeaders);
    app.use(security.helmet);
    app.use(requestLogger);

    // Session configuration
    app.use(session({
      store: sessionStore,
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      name: 'mcp.sid',
      cookie: {
        secure: config.nodeEnv === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
      },
      rolling: true // Reset expiration on activity
    }));

    // CORS configuration
    app.use(cors({
      origin: config.allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
    }));

    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // Validation middleware
    app.use(validateRequest);

    // CSRF protection
    app.use(generateCSRFToken);

    // Rate limiting
    app.use('/auth', security.authRateLimit);
    app.use('/mcp', security.mcpRateLimit);
    app.use(security.generalRateLimit);

    // Token refresh middleware
    const tokenRefreshMiddleware = createTokenRefreshMiddleware({ oauth: salesforceOAuth });
    app.use(tokenRefreshMiddleware);

    // Health check endpoints (no authentication required)
    app.get('/health', healthCheckHandler);
    app.get('/ping', pingHandler);
    app.get('/readiness', readinessHandler);
    app.get('/liveness', livenessHandler);

    // OAuth endpoints
    app.get('/auth/salesforce/login', (req, res) => {
      try {
        const userId = req.query.user_id as string;
        const returnUrl = req.query.return_url as string;

        if (!userId) {
          return res.status(400).json({
            error: 'Missing user_id parameter',
            code: 'MISSING_USER_ID',
            message: 'user_id parameter is required'
          });
        }

        // Generate session ID if not exists
        if (!req.session.id) {
          req.session.regenerate(() => {});
        }

        // Store return URL in session
        if (returnUrl) {
          req.session.returnUrl = returnUrl;
        }

        const authUrl = salesforceOAuth.generateAuthUrl(userId, req.session.id);
        
        auditLogger.loginAttempt(userId, true, req);
        logger.info('OAuth flow initiated', { userId, sessionId: req.session.id });

        res.redirect(authUrl);
      } catch (error) {
        logger.error('OAuth login error', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
          error: 'OAuth initialization failed',
          code: 'OAUTH_INIT_ERROR',
          message: 'Failed to initialize OAuth flow'
        });
      }
    });

    app.get('/auth/salesforce/callback', async (req, res) => {
      try {
        const { code, state, error } = req.query;

        if (error) {
          logger.warn('OAuth error received', { error, state });
          return res.status(400).json({
            error: 'OAuth error',
            code: 'OAUTH_ERROR',
            message: `OAuth error: ${error}`
          });
        }

        if (!code || !state) {
          logger.warn('Missing OAuth parameters', { hasCode: !!code, hasState: !!state });
          return res.status(400).json({
            error: 'Missing OAuth parameters',
            code: 'MISSING_PARAMS',
            message: 'Missing authorization code or state parameter'
          });
        }

        // Validate state and get user info
        const stateInfo = salesforceOAuth.validateState(state as string);
        if (!stateInfo) {
          logger.warn('Invalid OAuth state', { state });
          return res.status(400).json({
            error: 'Invalid OAuth state',
            code: 'INVALID_STATE',
            message: 'Invalid or expired state parameter'
          });
        }

        // Exchange code for tokens
        const tokenData = await salesforceOAuth.exchangeCodeForTokens(code as string);

        // Store tokens in persistent store
        const connectionId = await persistentTokenStore.storeConnection(stateInfo.userId, stateInfo.sessionId, {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          instanceUrl: tokenData.instance_url,
          createdAt: new Date(),
          expiresAt: tokenData.issued_at ? new Date(parseInt(tokenData.issued_at)) : undefined
        });

        // Get user info from Salesforce
        const userInfo = await salesforceOAuth.getUserInfo(tokenData.access_token, tokenData.instance_url);

        // Store user info in session
        req.session.userId = stateInfo.userId;
        req.session.salesforceUserId = userInfo.user_id;
        req.session.salesforceOrgId = userInfo.organization_id;

        auditLogger.loginAttempt(stateInfo.userId, true, req);
        logger.info('OAuth callback successful', {
          userId: stateInfo.userId,
          orgId: userInfo.organization_id,
          connectionId
        });

        // Redirect to return URL or success page
        const returnUrl = req.session.returnUrl || '/auth/success';
        delete req.session.returnUrl;

        const redirectUrl = `${returnUrl}?connected=true&org_id=${userInfo.organization_id}&connection_id=${connectionId}`;
        res.redirect(redirectUrl);

      } catch (error) {
        logger.error('OAuth callback error', { error: error instanceof Error ? error.message : String(error) });
        
        if (error instanceof SalesforceConnectionError) {
          res.status(error.statusCode).json({
            error: error.message,
            code: error.code,
            message: 'Authentication failed'
          });
        } else {
          res.status(500).json({
            error: 'Authentication failed',
            code: 'AUTH_ERROR',
            message: 'Failed to complete authentication'
          });
        }
      }
    });

    app.post('/auth/salesforce/logout', requireAuth, (req, res) => {
      const userId = req.userId!;
      
      persistentTokenStore.removeConnection(userId);
      auditLogger.logout(userId, req);
      
      req.session.destroy(() => {
        logger.info('User logged out', { userId });
        res.json({
          success: true,
          message: 'Logged out successfully'
        });
      });
    });

    app.get('/auth/status', async (req, res) => {
      const userId = req.userId;
      
      if (!userId) {
        return res.json({ connected: false });
      }

      try {
        const hasConnection = await persistentTokenStore.hasActiveConnection(userId);
        const connection = await persistentTokenStore.getConnectionByUserId(userId);

        res.json({
          connected: hasConnection,
          userId: userId,
          salesforceOrgId: req.session.salesforceOrgId,
          instanceUrl: connection?.tokens.instanceUrl,
          lastUsed: connection?.lastUsed
        });
      } catch (error) {
        logger.error('Auth status check failed', { userId, error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
          error: 'Status check failed',
          code: 'STATUS_ERROR'
        });
      }
    });

    // CSRF token endpoint
    app.get('/auth/csrf', (req, res) => {
      res.json({
        csrfToken: req.session.csrfToken
      });
    });

    // Success page
    app.get('/auth/success', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Salesforce Connected</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 100px auto; text-align: center; padding: 20px; }
              .success { color: #28a745; }
              .info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .detail { font-size: 14px; color: #666; margin: 5px 0; }
            </style>
          </head>
          <body>
            <h1 class="success">✅ Successfully Connected to Salesforce!</h1>
            <p>Your Salesforce account has been connected and is ready to use with the MCP server.</p>
            <div class="info">
              <div class="detail"><strong>Organization ID:</strong> ${req.query.org_id || 'N/A'}</div>
              <div class="detail"><strong>Connection ID:</strong> ${req.query.connection_id || 'N/A'}</div>
              <div class="detail"><strong>Timestamp:</strong> ${new Date().toISOString()}</div>
            </div>
            <p style="margin-top: 40px; font-size: 14px; color: #666;">
              You can now close this window and return to your application.
            </p>
          </body>
        </html>
      `);
    });

    // MCP Tool endpoints
    app.get('/mcp/tools', (req, res) => {
      res.json({
        tools: [
          SEARCH_OBJECTS, DESCRIBE_OBJECT, QUERY_RECORDS, DML_RECORDS,
          MANAGE_OBJECT, MANAGE_FIELD, SEARCH_ALL, READ_APEX, WRITE_APEX,
          READ_APEX_TRIGGER, WRITE_APEX_TRIGGER, EXECUTE_ANONYMOUS, MANAGE_DEBUG_LOGS
        ]
      });
    });

    app.post('/mcp/call', requireAuth, csrfProtection, async (req, res) => {
      const startTime = Date.now();
      
      try {
        const { name, arguments: args } = req.body;
        const sessionId = req.session.id;
        const userId = req.userId!;

        if (!args) {
          return res.status(400).json({
            error: 'Arguments are required',
            code: 'MISSING_ARGS'
          });
        }

        logger.info('MCP tool call', { userId, toolName: name, sessionId });

        // Get connection for this session
        const connectionResult = await createSessionSalesforceConnection(sessionId);
        const conn = connectionResult.connection;

        let result;
        
        // Handle tool calls with comprehensive error handling
        try {
          result = await handleToolCall(name, args, conn);
          auditLogger.mcpToolCall(userId, name, true, Date.now() - startTime);
        } catch (error) {
          auditLogger.mcpToolCall(userId, name, false, Date.now() - startTime);
          throw error;
        }

        res.json(result);

      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('MCP tool call error', {
          userId: req.userId,
          toolName: req.body.name,
          duration: `${duration}ms`,
          error: error instanceof Error ? error.message : String(error)
        });

        if (error instanceof SalesforceConnectionError) {
          res.status(error.statusCode).json({
            error: error.message,
            code: error.code,
            isRetryable: error.isRetryable
          });
        } else {
          res.status(500).json({
            error: error instanceof Error ? error.message : String(error),
            code: 'TOOL_CALL_ERROR',
            isError: true
          });
        }
      }
    });

    // Error handling middleware
    app.use(errorLogger);
    app.use((error: any, req: any, res: any, next: any) => {
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
          message: config.nodeEnv === 'development' ? error.message : 'Something went wrong'
        });
      }
    });

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not found',
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.originalUrl} not found`
      });
    });

    // Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info(`Salesforce MCP SSO Server running on port ${config.port}`, {
        baseUrl: config.baseUrl,
        redirectUri: config.salesforce.redirectUri,
        environment: config.nodeEnv
      });
    });

    // Setup graceful shutdown
    const gracefulShutdown = createGracefulShutdown(server, {
      timeout: 30000,
      signals: ['SIGTERM', 'SIGINT']
    });

    // Add shutdown health check
    app.get('/health/shutdown', createShutdownHealthCheck(gracefulShutdown));

    // Start periodic health checks in production
    if (config.nodeEnv === 'production') {
      startPeriodicHealthChecks(5 * 60 * 1000); // Every 5 minutes
    }

    logger.info('Salesforce MCP SSO Server started successfully');
    
  } catch (error) {
    logger.error('Failed to start server', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  }
}

// Tool call handler with improved error handling
async function handleToolCall(name: string, args: any, conn: any) {
  switch (name) {
    case "salesforce_search_objects": {
      const { searchPattern } = args as { searchPattern: string };
      if (!searchPattern) throw new Error('searchPattern is required');
      return await handleSearchObjects(conn, searchPattern);
    }

    case "salesforce_describe_object": {
      const { objectName } = args as { objectName: string };
      if (!objectName) throw new Error('objectName is required');
      return await handleDescribeObject(conn, objectName);
    }

    case "salesforce_query_records": {
      const queryArgs = args as Record<string, unknown>;
      if (!queryArgs.objectName || !Array.isArray(queryArgs.fields)) {
        throw new Error('objectName and fields array are required for query');
      }
      const validatedArgs: QueryArgs = {
        objectName: queryArgs.objectName as string,
        fields: queryArgs.fields as string[],
        whereClause: queryArgs.whereClause as string | undefined,
        orderBy: queryArgs.orderBy as string | undefined,
        limit: queryArgs.limit as number | undefined
      };
      return await handleQueryRecords(conn, validatedArgs);
    }

    case "salesforce_dml_records": {
      const dmlArgs = args as Record<string, unknown>;
      if (!dmlArgs.operation || !dmlArgs.objectName || !Array.isArray(dmlArgs.records)) {
        throw new Error('operation, objectName, and records array are required for DML');
      }
      const validatedArgs: DMLArgs = {
        operation: dmlArgs.operation as 'insert' | 'update' | 'delete' | 'upsert',
        objectName: dmlArgs.objectName as string,
        records: dmlArgs.records as Record<string, any>[],
        externalIdField: dmlArgs.externalIdField as string | undefined
      };
      return await handleDMLRecords(conn, validatedArgs);
    }

    case "salesforce_manage_object": {
      const manageObjectArgs = args as Record<string, unknown>;
      if (!manageObjectArgs.operation) {
        throw new Error('operation is required for manage object');
      }
      const validatedArgs: ManageObjectArgs = {
        operation: manageObjectArgs.operation as 'create' | 'delete' | 'describe',
        objectName: manageObjectArgs.objectName as string | undefined,
        objectDefinition: manageObjectArgs.objectDefinition as any
      };
      return await handleManageObject(conn, validatedArgs);
    }

    case "salesforce_manage_field": {
      const manageFieldArgs = args as Record<string, unknown>;
      if (!manageFieldArgs.operation || !manageFieldArgs.objectName) {
        throw new Error('operation and objectName are required for manage field');
      }
      const validatedArgs: ManageFieldArgs = {
        operation: manageFieldArgs.operation as 'create' | 'update' | 'delete',
        objectName: manageFieldArgs.objectName as string,
        fieldName: manageFieldArgs.fieldName as string | undefined,
        fieldDefinition: manageFieldArgs.fieldDefinition as any
      };
      return await handleManageField(conn, validatedArgs);
    }

    case "salesforce_search_all": {
      const searchAllArgs = args as Record<string, unknown>;
      if (!searchAllArgs.searchTerm) {
        throw new Error('searchTerm is required for search all');
      }
      const validatedArgs: SearchAllArgs = {
        searchTerm: searchAllArgs.searchTerm as string,
        objectTypes: searchAllArgs.objectTypes as string[] | undefined,
        fieldsToReturn: searchAllArgs.fieldsToReturn as string[] | undefined,
        whereClause: searchAllArgs.whereClause as string | undefined,
        limit: searchAllArgs.limit as number | undefined,
        withClause: searchAllArgs.withClause as WithClause | undefined
      };
      return await handleSearchAll(conn, validatedArgs);
    }

    case "salesforce_read_apex": {
      const readApexArgs = args as Record<string, unknown>;
      if (!readApexArgs.className) {
        throw new Error('className is required for read apex');
      }
      const validatedArgs: ReadApexArgs = {
        className: readApexArgs.className as string
      };
      return await handleReadApex(conn, validatedArgs);
    }

    case "salesforce_write_apex": {
      const writeApexArgs = args as Record<string, unknown>;
      if (!writeApexArgs.className || !writeApexArgs.apexCode) {
        throw new Error('className and apexCode are required for write apex');
      }
      const validatedArgs: WriteApexArgs = {
        className: writeApexArgs.className as string,
        apexCode: writeApexArgs.apexCode as string
      };
      return await handleWriteApex(conn, validatedArgs);
    }

    case "salesforce_read_apex_trigger": {
      const readTriggerArgs = args as Record<string, unknown>;
      if (!readTriggerArgs.triggerName) {
        throw new Error('triggerName is required for read apex trigger');
      }
      const validatedArgs: ReadApexTriggerArgs = {
        triggerName: readTriggerArgs.triggerName as string
      };
      return await handleReadApexTrigger(conn, validatedArgs);
    }

    case "salesforce_write_apex_trigger": {
      const writeTriggerArgs = args as Record<string, unknown>;
      if (!writeTriggerArgs.triggerName || !writeTriggerArgs.triggerCode) {
        throw new Error('triggerName and triggerCode are required for write apex trigger');
      }
      const validatedArgs: WriteApexTriggerArgs = {
        triggerName: writeTriggerArgs.triggerName as string,
        triggerCode: writeTriggerArgs.triggerCode as string,
        objectName: writeTriggerArgs.objectName as string
      };
      return await handleWriteApexTrigger(conn, validatedArgs);
    }

    case "salesforce_execute_anonymous": {
      const executeArgs = args as Record<string, unknown>;
      if (!executeArgs.apexCode) {
        throw new Error('apexCode is required for execute anonymous');
      }
      const validatedArgs: ExecuteAnonymousArgs = {
        apexCode: executeArgs.apexCode as string
      };
      return await handleExecuteAnonymous(conn, validatedArgs);
    }

    case "salesforce_manage_debug_logs": {
      const debugArgs = args as Record<string, unknown>;
      if (!debugArgs.operation) {
        throw new Error('operation is required for manage debug logs');
      }
      const validatedArgs: ManageDebugLogsArgs = {
        operation: debugArgs.operation as 'list' | 'get' | 'delete',
        logId: debugArgs.logId as string | undefined
      };
      return await handleManageDebugLogs(conn, validatedArgs);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

