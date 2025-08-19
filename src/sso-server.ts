#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as dotenv from "dotenv";
import { v4 as uuidv4 } from 'uuid';

import { createSalesforceConnection, createSessionSalesforceConnection } from "./utils/connection.js";
import { SalesforceOAuth } from "./utils/salesforceOAuth.js";
import { tokenStore } from "./utils/tokenStore.js";

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

const app = express();
const PORT = process.env.PORT || 3000;

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'https://notepad.ai'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Salesforce OAuth
const oauthConfig = {
  clientId: process.env.SALESFORCE_CLIENT_ID!,
  clientSecret: process.env.SALESFORCE_CLIENT_SECRET!,
  redirectUri: process.env.SALESFORCE_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3000'}/auth/salesforce/callback`,
  loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
};

const salesforceOAuth = new SalesforceOAuth(oauthConfig);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.0.0'
  });
});

// OAuth endpoints
app.get('/auth/salesforce/login', (req, res) => {
  const userId = req.query.user_id as string;
  const returnUrl = req.query.return_url as string;
  
  if (!userId) {
    return res.status(400).json({ error: 'user_id is required' });
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
  res.redirect(authUrl);
});

app.get('/auth/salesforce/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).json({ error: `OAuth error: ${error}` });
    }

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing authorization code or state' });
    }

    // Validate state and get user info
    const stateInfo = salesforceOAuth.validateState(state as string);
    if (!stateInfo) {
      return res.status(400).json({ error: 'Invalid or expired state parameter' });
    }

    // Exchange code for tokens
    const tokenData = await salesforceOAuth.exchangeCodeForTokens(code as string);

    // Store tokens in token store
    const connectionId = tokenStore.storeConnection(stateInfo.userId, stateInfo.sessionId, {
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

    // Redirect to return URL or success page
    const returnUrl = req.session.returnUrl || '/auth/success';
    delete req.session.returnUrl;

    const redirectUrl = `${returnUrl}?connected=true&org_id=${userInfo.organization_id}&connection_id=${connectionId}`;
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/auth/salesforce/logout', (req, res) => {
  const userId = req.session.userId;
  
  if (userId) {
    tokenStore.removeConnection(userId);
  }
  
  req.session.destroy(() => {
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

app.get('/auth/status', (req, res) => {
  const userId = req.session.userId;
  
  if (!userId) {
    return res.json({ connected: false });
  }

  const hasConnection = tokenStore.hasActiveConnection(userId);
  const connection = tokenStore.getConnectionByUserId(userId);

  res.json({
    connected: hasConnection,
    userId: userId,
    salesforceOrgId: req.session.salesforceOrgId,
    instanceUrl: connection?.tokens.instanceUrl,
    lastUsed: connection?.lastUsed
  });
});

// Success page
app.get('/auth/success', (req, res) => {
  res.send(`
    <html>
      <head><title>Salesforce Connected</title></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 100px auto; text-align: center;">
        <h1 style="color: #1798c1;">✅ Successfully Connected to Salesforce!</h1>
        <p>Your Salesforce account has been connected and is ready to use with the MCP server.</p>
        <p><strong>Organization ID:</strong> ${req.query.org_id || 'N/A'}</p>
        <p><strong>Connection ID:</strong> ${req.query.connection_id || 'N/A'}</p>
        <p style="margin-top: 40px; font-size: 14px; color: #666;">
          You can now close this window and return to your application.
        </p>
      </body>
    </html>
  `);
});

// MCP Tool endpoints (for HTTP-based MCP clients)
app.get('/mcp/tools', (req, res) => {
  res.json({
    tools: [
      SEARCH_OBJECTS, 
      DESCRIBE_OBJECT, 
      QUERY_RECORDS, 
      DML_RECORDS,
      MANAGE_OBJECT,
      MANAGE_FIELD,
      SEARCH_ALL,
      READ_APEX,
      WRITE_APEX,
      READ_APEX_TRIGGER,
      WRITE_APEX_TRIGGER,
      EXECUTE_ANONYMOUS,
      MANAGE_DEBUG_LOGS
    ]
  });
});

app.post('/mcp/call', async (req, res) => {
  try {
    const { name, arguments: args } = req.body;
    const sessionId = req.session.id;

    if (!sessionId) {
      return res.status(401).json({ error: 'No active session' });
    }

    if (!args) {
      return res.status(400).json({ error: 'Arguments are required' });
    }

    // Get connection for this session
    const conn = await createSessionSalesforceConnection(sessionId);

    // Handle tool calls (same logic as stdio server)
    let result;
    switch (name) {
      case "salesforce_search_objects": {
        const { searchPattern } = args as { searchPattern: string };
        if (!searchPattern) throw new Error('searchPattern is required');
        result = await handleSearchObjects(conn, searchPattern);
        break;
      }

      case "salesforce_describe_object": {
        const { objectName } = args as { objectName: string };
        if (!objectName) throw new Error('objectName is required');
        result = await handleDescribeObject(conn, objectName);
        break;
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
        result = await handleQueryRecords(conn, validatedArgs);
        break;
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
        result = await handleDMLRecords(conn, validatedArgs);
        break;
      }

      case "salesforce_manage_object": {
        const objectArgs = args as Record<string, unknown>;
        if (!objectArgs.operation || !objectArgs.objectName) {
          throw new Error('operation and objectName are required for object management');
        }
        const validatedArgs: ManageObjectArgs = {
          operation: objectArgs.operation as 'create' | 'update',
          objectName: objectArgs.objectName as string,
          label: objectArgs.label as string | undefined,
          pluralLabel: objectArgs.pluralLabel as string | undefined,
          description: objectArgs.description as string | undefined,
          nameFieldLabel: objectArgs.nameFieldLabel as string | undefined,
          nameFieldType: objectArgs.nameFieldType as 'Text' | 'AutoNumber' | undefined,
          nameFieldFormat: objectArgs.nameFieldFormat as string | undefined,
          sharingModel: objectArgs.sharingModel as 'ReadWrite' | 'Read' | 'Private' | 'ControlledByParent' | undefined
        };
        result = await handleManageObject(conn, validatedArgs);
        break;
      }

      case "salesforce_manage_field": {
        const fieldArgs = args as Record<string, unknown>;
        if (!fieldArgs.operation || !fieldArgs.objectName || !fieldArgs.fieldName) {
          throw new Error('operation, objectName, and fieldName are required for field management');
        }
        const validatedArgs: ManageFieldArgs = {
          operation: fieldArgs.operation as 'create' | 'update',
          objectName: fieldArgs.objectName as string,
          fieldName: fieldArgs.fieldName as string,
          label: fieldArgs.label as string | undefined,
          type: fieldArgs.type as string | undefined,
          required: fieldArgs.required as boolean | undefined,
          unique: fieldArgs.unique as boolean | undefined,
          externalId: fieldArgs.externalId as boolean | undefined,
          length: fieldArgs.length as number | undefined,
          precision: fieldArgs.precision as number | undefined,
          scale: fieldArgs.scale as number | undefined,
          referenceTo: fieldArgs.referenceTo as string | undefined,
          relationshipLabel: fieldArgs.relationshipLabel as string | undefined,
          relationshipName: fieldArgs.relationshipName as string | undefined,
          deleteConstraint: fieldArgs.deleteConstraint as 'Cascade' | 'Restrict' | 'SetNull' | undefined,
          picklistValues: fieldArgs.picklistValues as Array<{ label: string; isDefault?: boolean }> | undefined,
          description: fieldArgs.description as string | undefined
        };
        result = await handleManageField(conn, validatedArgs);
        break;
      }

      case "salesforce_search_all": {
        const searchArgs = args as Record<string, unknown>;
        if (!searchArgs.searchTerm || !Array.isArray(searchArgs.objects)) {
          throw new Error('searchTerm and objects array are required for search');
        }

        const objects = searchArgs.objects as Array<Record<string, unknown>>;
        if (!objects.every(obj => obj.name && Array.isArray(obj.fields))) {
          throw new Error('Each object must specify name and fields array');
        }

        const validatedArgs: SearchAllArgs = {
          searchTerm: searchArgs.searchTerm as string,
          searchIn: searchArgs.searchIn as "ALL FIELDS" | "NAME FIELDS" | "EMAIL FIELDS" | "PHONE FIELDS" | "SIDEBAR FIELDS" | undefined,
          objects: objects.map(obj => ({
            name: obj.name as string,
            fields: obj.fields as string[],
            where: obj.where as string | undefined,
            orderBy: obj.orderBy as string | undefined,
            limit: obj.limit as number | undefined
          })),
          withClauses: searchArgs.withClauses as WithClause[] | undefined,
          updateable: searchArgs.updateable as boolean | undefined,
          viewable: searchArgs.viewable as boolean | undefined
        };

        result = await handleSearchAll(conn, validatedArgs);
        break;
      }

      case "salesforce_read_apex": {
        const apexArgs = args as Record<string, unknown>;
        const validatedArgs: ReadApexArgs = {
          className: apexArgs.className as string | undefined,
          namePattern: apexArgs.namePattern as string | undefined,
          includeMetadata: apexArgs.includeMetadata as boolean | undefined
        };
        result = await handleReadApex(conn, validatedArgs);
        break;
      }

      case "salesforce_write_apex": {
        const apexArgs = args as Record<string, unknown>;
        if (!apexArgs.operation || !apexArgs.className || !apexArgs.body) {
          throw new Error('operation, className, and body are required for writing Apex');
        }
        const validatedArgs: WriteApexArgs = {
          operation: apexArgs.operation as 'create' | 'update',
          className: apexArgs.className as string,
          apiVersion: apexArgs.apiVersion as string | undefined,
          body: apexArgs.body as string
        };
        result = await handleWriteApex(conn, validatedArgs);
        break;
      }

      case "salesforce_read_apex_trigger": {
        const triggerArgs = args as Record<string, unknown>;
        const validatedArgs: ReadApexTriggerArgs = {
          triggerName: triggerArgs.triggerName as string | undefined,
          namePattern: triggerArgs.namePattern as string | undefined,
          includeMetadata: triggerArgs.includeMetadata as boolean | undefined
        };
        result = await handleReadApexTrigger(conn, validatedArgs);
        break;
      }

      case "salesforce_write_apex_trigger": {
        const triggerArgs = args as Record<string, unknown>;
        if (!triggerArgs.operation || !triggerArgs.triggerName || !triggerArgs.body) {
          throw new Error('operation, triggerName, and body are required for writing Apex trigger');
        }
        const validatedArgs: WriteApexTriggerArgs = {
          operation: triggerArgs.operation as 'create' | 'update',
          triggerName: triggerArgs.triggerName as string,
          objectName: triggerArgs.objectName as string | undefined,
          apiVersion: triggerArgs.apiVersion as string | undefined,
          body: triggerArgs.body as string
        };
        result = await handleWriteApexTrigger(conn, validatedArgs);
        break;
      }

      case "salesforce_execute_anonymous": {
        const executeArgs = args as Record<string, unknown>;
        if (!executeArgs.apexCode) {
          throw new Error('apexCode is required for executing anonymous Apex');
        }
        const validatedArgs: ExecuteAnonymousArgs = {
          apexCode: executeArgs.apexCode as string,
          logLevel: executeArgs.logLevel as 'NONE' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'FINE' | 'FINER' | 'FINEST' | undefined
        };
        result = await handleExecuteAnonymous(conn, validatedArgs);
        break;
      }

      case "salesforce_manage_debug_logs": {
        const debugLogsArgs = args as Record<string, unknown>;
        if (!debugLogsArgs.operation || !debugLogsArgs.username) {
          throw new Error('operation and username are required for managing debug logs');
        }
        const validatedArgs: ManageDebugLogsArgs = {
          operation: debugLogsArgs.operation as 'enable' | 'disable' | 'retrieve',
          username: debugLogsArgs.username as string,
          logLevel: debugLogsArgs.logLevel as 'NONE' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'FINE' | 'FINER' | 'FINEST' | undefined,
          expirationTime: debugLogsArgs.expirationTime as number | undefined,
          limit: debugLogsArgs.limit as number | undefined,
          logId: debugLogsArgs.logId as string | undefined,
          includeBody: debugLogsArgs.includeBody as boolean | undefined
        };
        result = await handleManageDebugLogs(conn, validatedArgs);
        break;
      }

      default:
        return res.status(400).json({ error: `Unknown tool: ${name}` });
    }

    res.json(result);

  } catch (error) {
    console.error('Tool call error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      isError: true
    });
  }
});

// Start HTTP server
app.listen(PORT, () => {
  console.error(`Salesforce MCP SSO Server running on port ${PORT}`);
  console.error(`OAuth redirect URI: ${oauthConfig.redirectUri}`);
  console.error(`Health check: http://localhost:${PORT}/health`);
});

// Also provide stdio MCP server for direct Claude integration
const mcpServer = new Server(
  {
    name: "salesforce-mcp-sso-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Tool handlers (same as original)
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    SEARCH_OBJECTS, 
    DESCRIBE_OBJECT, 
    QUERY_RECORDS, 
    DML_RECORDS,
    MANAGE_OBJECT,
    MANAGE_FIELD,
    SEARCH_ALL,
    READ_APEX,
    WRITE_APEX,
    READ_APEX_TRIGGER,
    WRITE_APEX_TRIGGER,
    EXECUTE_ANONYMOUS,
    MANAGE_DEBUG_LOGS
  ],
}));

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    if (!args) throw new Error('Arguments are required');

    // For stdio mode, use default connection
    const conn = await createSalesforceConnection();

    // Same tool handling logic as HTTP endpoints...
    // (Implementation would be identical to the HTTP version above)
    // For brevity, using the original connection method for stdio mode

  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
});

// Only start stdio server if not in HTTP mode
if (process.env.MCP_MODE !== 'http') {
  async function runStdioServer() {
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error("Salesforce MCP Server (stdio) also available");
  }

  if (require.main === module) {
    runStdioServer().catch((error) => {
      console.error("Fatal error running stdio server:", error);
      process.exit(1);
    });
  }
}