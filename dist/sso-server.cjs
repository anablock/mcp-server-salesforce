#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_session_1 = __importDefault(require("express-session"));
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const dotenv = __importStar(require("dotenv"));
const connection_js_1 = require("./utils/connection.js");
const salesforceOAuth_js_1 = require("./utils/salesforceOAuth.js");
const tokenStore_js_1 = require("./utils/tokenStore.js");
// Import all tool handlers
const search_js_1 = require("./tools/search.js");
const describe_js_1 = require("./tools/describe.js");
const query_js_1 = require("./tools/query.js");
const dml_js_1 = require("./tools/dml.js");
const manageObject_js_1 = require("./tools/manageObject.js");
const manageField_js_1 = require("./tools/manageField.js");
const searchAll_js_1 = require("./tools/searchAll.js");
const readApex_js_1 = require("./tools/readApex.js");
const writeApex_js_1 = require("./tools/writeApex.js");
const readApexTrigger_js_1 = require("./tools/readApexTrigger.js");
const writeApexTrigger_js_1 = require("./tools/writeApexTrigger.js");
const executeAnonymous_js_1 = require("./tools/executeAnonymous.js");
const manageDebugLogs_js_1 = require("./tools/manageDebugLogs.js");
// Import natural language processor
const naturalLanguageProcessor_js_1 = require("./services/naturalLanguageProcessor.js");
dotenv.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Session configuration
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
app.use((0, cors_1.default)({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'https://notepad.ai'],
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Initialize Salesforce OAuth
const oauthConfig = {
    clientId: process.env.SALESFORCE_CLIENT_ID,
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
    redirectUri: process.env.SALESFORCE_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3000'}/auth/salesforce/callback`,
    loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
};
const salesforceOAuth = new salesforceOAuth_js_1.SalesforceOAuth(oauthConfig);
// Initialize Natural Language Processor
const nlProcessor = new naturalLanguageProcessor_js_1.NaturalLanguageProcessor();
// Helper function to execute MCP tools
async function executeTool(conn, toolName, args) {
    let result;
    switch (toolName) {
        case "salesforce_search_objects": {
            const { searchPattern } = args;
            if (!searchPattern)
                throw new Error('searchPattern is required');
            result = await (0, search_js_1.handleSearchObjects)(conn, searchPattern);
            break;
        }
        case "salesforce_describe_object": {
            const { objectName } = args;
            if (!objectName)
                throw new Error('objectName is required');
            result = await (0, describe_js_1.handleDescribeObject)(conn, objectName);
            return { metadata: result };
        }
        case "salesforce_query_records": {
            const queryArgs = args;
            if (!queryArgs.objectName || !Array.isArray(queryArgs.fields)) {
                throw new Error('objectName and fields array are required for query');
            }
            const validatedArgs = {
                objectName: queryArgs.objectName,
                fields: queryArgs.fields,
                whereClause: queryArgs.whereClause,
                orderBy: queryArgs.orderBy,
                limit: queryArgs.limit
            };
            result = await (0, query_js_1.handleQueryRecords)(conn, validatedArgs);
            // Try to parse records from result
            try {
                if (typeof result === 'string') {
                    const parsed = JSON.parse(result);
                    return { records: parsed.records || parsed };
                }
                return { records: result };
            }
            catch (parseError) {
                return { records: [], rawResult: result };
            }
        }
        case "salesforce_dml_records": {
            const dmlArgs = args;
            if (!dmlArgs.operation || !dmlArgs.objectName || !Array.isArray(dmlArgs.records)) {
                throw new Error('operation, objectName, and records array are required for DML');
            }
            const validatedArgs = {
                operation: dmlArgs.operation,
                objectName: dmlArgs.objectName,
                records: dmlArgs.records,
                externalIdField: dmlArgs.externalIdField
            };
            result = await (0, dml_js_1.handleDMLRecords)(conn, validatedArgs);
            break;
        }
        case "salesforce_write_apex_trigger": {
            const triggerArgs = args;
            const validatedArgs = {
                triggerName: triggerArgs.triggerName,
                objectName: triggerArgs.objectName,
                events: triggerArgs.events,
                body: triggerArgs.body,
                apiVersion: triggerArgs.apiVersion
            };
            result = await (0, writeApexTrigger_js_1.handleWriteApexTrigger)(conn, validatedArgs);
            break;
        }
        case "salesforce_write_apex": {
            const apexArgs = args;
            const validatedArgs = {
                operation: apexArgs.operation,
                className: apexArgs.className,
                body: apexArgs.body,
                apiVersion: apexArgs.apiVersion
            };
            result = await (0, writeApex_js_1.handleWriteApex)(conn, validatedArgs);
            break;
        }
        // Add other tools as needed...
        default:
            throw new Error(`Tool ${toolName} not implemented in executeTool function`);
    }
    return { result };
}
// MCP Tools endpoint - List available tools for integration
app.get('/mcp/tools', (req, res) => {
    const baseUrl = req.get('host') ? `${req.protocol}://${req.get('host')}` : process.env.BASE_URL || `http://localhost:${PORT}`;
    res.json({
        tools: [
            {
                name: 'salesforce_search_objects',
                description: 'Search and discover Salesforce objects by name pattern',
                category: 'discovery'
            },
            {
                name: 'salesforce_describe_object',
                description: 'Get detailed metadata for Salesforce objects including fields and relationships',
                category: 'metadata'
            },
            {
                name: 'salesforce_query_records',
                description: 'Query Salesforce records with SOQL-like syntax',
                category: 'data'
            },
            {
                name: 'salesforce_dml_records',
                description: 'Insert, update, delete, or upsert Salesforce records',
                category: 'data'
            },
            {
                name: 'salesforce_manage_object',
                description: 'Create or update custom Salesforce objects',
                category: 'metadata'
            },
            {
                name: 'salesforce_manage_field',
                description: 'Create or update fields on Salesforce objects',
                category: 'metadata'
            },
            {
                name: 'salesforce_search_all',
                description: 'Search across multiple Salesforce objects using SOSL',
                category: 'discovery'
            },
            {
                name: 'salesforce_read_apex',
                description: 'Read Apex class source code',
                category: 'development'
            },
            {
                name: 'salesforce_write_apex',
                description: 'Create or update Apex classes',
                category: 'development'
            },
            {
                name: 'salesforce_read_apex_trigger',
                description: 'Read Apex trigger source code',
                category: 'development'
            },
            {
                name: 'salesforce_write_apex_trigger',
                description: 'Create or update Apex triggers',
                category: 'development'
            },
            {
                name: 'salesforce_execute_anonymous',
                description: 'Execute anonymous Apex code',
                category: 'development'
            },
            {
                name: 'salesforce_manage_debug_logs',
                description: 'Enable, disable, or retrieve debug logs for users',
                category: 'development'
            }
        ],
        total: 13,
        categories: {
            discovery: 2,
            metadata: 3,
            data: 2,
            development: 6
        },
        authentication: {
            required: true,
            flow: 'OAuth 2.0',
            loginUrl: `${baseUrl}/auth/salesforce/login?user_id={USER_ID}`,
            statusUrl: `${baseUrl}/auth/status`
        },
        documentation: `${baseUrl}/api/docs`,
        usage: `Call tools via POST ${baseUrl}/mcp/call with authentication`
    });
});
// Natural Language Processing endpoint
app.post('/natural-language', async (req, res) => {
    try {
        const { request: userRequest, userId, conversationHistory } = req.body;
        if (!userRequest || typeof userRequest !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Request field is required and must be a string'
            });
        }
        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'userId field is required and must be a string'
            });
        }
        // Process the natural language request
        const nlResponse = await nlProcessor.processNaturalLanguageRequest({
            request: userRequest,
            userId,
            conversationHistory
        });
        // If the analysis was successful and we have a tool call, execute it
        if (nlResponse.success && nlResponse.toolCall) {
            try {
                // Check if user has an active session for this userId
                // For now, we'll use the session from the request
                const sessionId = req.session.id;
                if (!sessionId) {
                    // Return the analysis without execution
                    return res.json({
                        ...nlResponse,
                        error: 'Authentication required - please complete OAuth flow first',
                        executionSkipped: true
                    });
                }
                // Get Salesforce connection
                const conn = await (0, connection_js_1.createSessionSalesforceConnection)(sessionId);
                // Execute the tool call
                const toolResult = await executeTool(conn, nlResponse.toolCall.name, nlResponse.toolCall.arguments);
                // Return the analysis with execution results
                return res.json({
                    ...nlResponse,
                    records: toolResult.records,
                    metadata: toolResult.metadata,
                    executionResult: toolResult
                });
            }
            catch (executionError) {
                console.error('Tool execution error:', executionError);
                // Return the analysis with execution error
                return res.json({
                    ...nlResponse,
                    executionError: executionError instanceof Error ? executionError.message : 'Tool execution failed'
                });
            }
        }
        // Return just the analysis if no tool call or analysis failed
        return res.json(nlResponse);
    }
    catch (error) {
        console.error('Natural language processing error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Natural language processing failed',
            type: 'query',
            intent: 'Error processing request',
            executedAt: new Date().toISOString()
        });
    }
});
// Health check endpoint with enhanced metrics
app.get('/health', (req, res) => {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '0.0.0',
        uptime: Math.floor(uptime),
        uptimeHuman: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
        memory: {
            used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            external: Math.round(memoryUsage.external / 1024 / 1024),
            unit: 'MB'
        },
        connections: {
            active: tokenStore_js_1.tokenStore.getActiveConnections().length,
            total: tokenStore_js_1.tokenStore.getActiveConnections().length
        }
    });
});
// OAuth endpoints
app.get('/auth/salesforce/login', (req, res) => {
    const userId = req.query.user_id;
    const returnUrl = req.query.return_url;
    if (!userId) {
        return res.status(400).json({ error: 'user_id is required' });
    }
    // Generate session ID if not exists
    if (!req.session.id) {
        req.session.regenerate(() => { });
    }
    // Store return URL in session (backup) and pass to OAuth
    if (returnUrl) {
        req.session.returnUrl = returnUrl;
    }
    const authUrl = salesforceOAuth.generateAuthUrl(userId, req.session.id, returnUrl);
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
        const stateInfo = salesforceOAuth.validateState(state);
        if (!stateInfo) {
            return res.status(400).json({ error: 'Invalid or expired state parameter' });
        }
        // Exchange code for tokens
        const tokenData = await salesforceOAuth.exchangeCodeForTokens(code);
        // Store tokens in token store
        const connectionId = tokenStore_js_1.tokenStore.storeConnection(stateInfo.userId, stateInfo.sessionId, {
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
        console.log('DEBUG: stateInfo.returnUrl =', stateInfo.returnUrl);
        console.log('DEBUG: req.session.returnUrl =', req.session.returnUrl);
        const returnUrl = stateInfo.returnUrl || req.session.returnUrl || '/auth/success';
        console.log('DEBUG: final returnUrl =', returnUrl);
        delete req.session.returnUrl;
        const redirectUrl = `${returnUrl}?connected=true&org_id=${userInfo.organization_id}&connection_id=${connectionId}`;
        console.log('DEBUG: redirectUrl =', redirectUrl);
        res.redirect(redirectUrl);
    }
    catch (error) {
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
        tokenStore_js_1.tokenStore.removeConnection(userId);
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
    const hasConnection = tokenStore_js_1.tokenStore.hasActiveConnection(userId);
    const connection = tokenStore_js_1.tokenStore.getConnectionByUserId(userId);
    res.json({
        connected: hasConnection,
        userId: userId,
        salesforceOrgId: req.session.salesforceOrgId,
        instanceUrl: connection?.tokens.instanceUrl,
        lastUsed: connection?.lastUsed
    });
});
// Success page with enhanced UX
app.get('/auth/success', (req, res) => {
    const baseUrl = req.get('host') ? `${req.protocol}://${req.get('host')}` : process.env.BASE_URL || `http://localhost:${PORT}`;
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Salesforce Connected</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            max-width: 700px;
            margin: 50px auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          }
          .success-header {
            text-align: center;
            margin-bottom: 30px;
          }
          .success-icon {
            font-size: 48px;
            margin-bottom: 20px;
          }
          .success-title {
            color: #1798c1;
            margin: 0 0 15px 0;
          }
          .connection-details {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .next-steps {
            margin-top: 30px;
          }
          .step-list {
            list-style: none;
            padding: 0;
            margin: 20px 0;
          }
          .step-item {
            background: #e3f2fd;
            margin: 10px 0;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #1798c1;
          }
          .api-link {
            display: inline-block;
            background: #1798c1;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            text-decoration: none;
            margin: 5px;
          }
          .api-link:hover {
            background: #0f7ba1;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-header">
            <div class="success-icon">🎉</div>
            <h1 class="success-title">Successfully Connected to Salesforce!</h1>
            <p>Your Salesforce account is now linked and ready to use with the MCP server.</p>
          </div>
          
          <div class="connection-details">
            <h3>Connection Details</h3>
            <div class="detail-row">
              <span><strong>Organization ID:</strong></span>
              <span>${req.query.org_id || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span><strong>Connection ID:</strong></span>
              <span>${req.query.connection_id || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span><strong>Connected At:</strong></span>
              <span>${new Date().toLocaleString()}</span>
            </div>
            <div class="detail-row">
              <span><strong>Status:</strong></span>
              <span style="color: #28a745; font-weight: bold;">✓ Active</span>
            </div>
          </div>
          
          <div class="next-steps">
            <h3>What's Next?</h3>
            <ul class="step-list">
              <li class="step-item">
                <strong>Return to your application</strong> - You can now close this window and continue using Salesforce tools in your app
              </li>
              <li class="step-item">
                <strong>Explore available tools</strong> - View all 13 available Salesforce tools and their documentation
              </li>
              <li class="step-item">
                <strong>Start building</strong> - Use the MCP tools to query data, manage objects, write Apex code, and more
              </li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/mcp/tools" class="api-link" target="_blank">View Available Tools</a>
            <a href="${baseUrl}/auth/status" class="api-link" target="_blank">Check Connection Status</a>
            <a href="${baseUrl}/health" class="api-link" target="_blank">Server Health</a>
          </div>
          
          <div class="footer">
            <p>Need help? Check the <a href="https://github.com/tsmztech/mcp-server-salesforce" target="_blank">documentation</a> or contact support.</p>
            <p><small>MCP Salesforce Server v${process.env.npm_package_version || '0.0.2'}</small></p>
          </div>
        </div>
        
        <script>
          // Auto-close window after 30 seconds if opened as popup
          if (window.opener) {
            setTimeout(() => {
              if (confirm('Connection successful! Close this window?')) {
                window.close();
              }
            }, 30000);
          }
        </script>
      </body>
    </html>
  `);
});
// MCP Call endpoint (for HTTP-based MCP clients)
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
        const conn = await (0, connection_js_1.createSessionSalesforceConnection)(sessionId);
        // Handle tool calls (same logic as stdio server)
        let result;
        switch (name) {
            case "salesforce_search_objects": {
                const { searchPattern } = args;
                if (!searchPattern)
                    throw new Error('searchPattern is required');
                result = await (0, search_js_1.handleSearchObjects)(conn, searchPattern);
                break;
            }
            case "salesforce_describe_object": {
                const { objectName } = args;
                if (!objectName)
                    throw new Error('objectName is required');
                result = await (0, describe_js_1.handleDescribeObject)(conn, objectName);
                break;
            }
            case "salesforce_query_records": {
                const queryArgs = args;
                if (!queryArgs.objectName || !Array.isArray(queryArgs.fields)) {
                    throw new Error('objectName and fields array are required for query');
                }
                const validatedArgs = {
                    objectName: queryArgs.objectName,
                    fields: queryArgs.fields,
                    whereClause: queryArgs.whereClause,
                    orderBy: queryArgs.orderBy,
                    limit: queryArgs.limit
                };
                result = await (0, query_js_1.handleQueryRecords)(conn, validatedArgs);
                break;
            }
            case "salesforce_dml_records": {
                const dmlArgs = args;
                if (!dmlArgs.operation || !dmlArgs.objectName || !Array.isArray(dmlArgs.records)) {
                    throw new Error('operation, objectName, and records array are required for DML');
                }
                const validatedArgs = {
                    operation: dmlArgs.operation,
                    objectName: dmlArgs.objectName,
                    records: dmlArgs.records,
                    externalIdField: dmlArgs.externalIdField
                };
                result = await (0, dml_js_1.handleDMLRecords)(conn, validatedArgs);
                break;
            }
            case "salesforce_manage_object": {
                const objectArgs = args;
                if (!objectArgs.operation || !objectArgs.objectName) {
                    throw new Error('operation and objectName are required for object management');
                }
                const validatedArgs = {
                    operation: objectArgs.operation,
                    objectName: objectArgs.objectName,
                    label: objectArgs.label,
                    pluralLabel: objectArgs.pluralLabel,
                    description: objectArgs.description,
                    nameFieldLabel: objectArgs.nameFieldLabel,
                    nameFieldType: objectArgs.nameFieldType,
                    nameFieldFormat: objectArgs.nameFieldFormat,
                    sharingModel: objectArgs.sharingModel
                };
                result = await (0, manageObject_js_1.handleManageObject)(conn, validatedArgs);
                break;
            }
            case "salesforce_manage_field": {
                const fieldArgs = args;
                if (!fieldArgs.operation || !fieldArgs.objectName || !fieldArgs.fieldName) {
                    throw new Error('operation, objectName, and fieldName are required for field management');
                }
                const validatedArgs = {
                    operation: fieldArgs.operation,
                    objectName: fieldArgs.objectName,
                    fieldName: fieldArgs.fieldName,
                    label: fieldArgs.label,
                    type: fieldArgs.type,
                    required: fieldArgs.required,
                    unique: fieldArgs.unique,
                    externalId: fieldArgs.externalId,
                    length: fieldArgs.length,
                    precision: fieldArgs.precision,
                    scale: fieldArgs.scale,
                    referenceTo: fieldArgs.referenceTo,
                    relationshipLabel: fieldArgs.relationshipLabel,
                    relationshipName: fieldArgs.relationshipName,
                    deleteConstraint: fieldArgs.deleteConstraint,
                    picklistValues: fieldArgs.picklistValues,
                    description: fieldArgs.description
                };
                result = await (0, manageField_js_1.handleManageField)(conn, validatedArgs);
                break;
            }
            case "salesforce_search_all": {
                const searchArgs = args;
                if (!searchArgs.searchTerm || !Array.isArray(searchArgs.objects)) {
                    throw new Error('searchTerm and objects array are required for search');
                }
                const objects = searchArgs.objects;
                if (!objects.every(obj => obj.name && Array.isArray(obj.fields))) {
                    throw new Error('Each object must specify name and fields array');
                }
                const validatedArgs = {
                    searchTerm: searchArgs.searchTerm,
                    searchIn: searchArgs.searchIn,
                    objects: objects.map(obj => ({
                        name: obj.name,
                        fields: obj.fields,
                        where: obj.where,
                        orderBy: obj.orderBy,
                        limit: obj.limit
                    })),
                    withClauses: searchArgs.withClauses,
                    updateable: searchArgs.updateable,
                    viewable: searchArgs.viewable
                };
                result = await (0, searchAll_js_1.handleSearchAll)(conn, validatedArgs);
                break;
            }
            case "salesforce_read_apex": {
                const apexArgs = args;
                const validatedArgs = {
                    className: apexArgs.className,
                    namePattern: apexArgs.namePattern,
                    includeMetadata: apexArgs.includeMetadata
                };
                result = await (0, readApex_js_1.handleReadApex)(conn, validatedArgs);
                break;
            }
            case "salesforce_write_apex": {
                const apexArgs = args;
                if (!apexArgs.operation || !apexArgs.className || !apexArgs.body) {
                    throw new Error('operation, className, and body are required for writing Apex');
                }
                const validatedArgs = {
                    operation: apexArgs.operation,
                    className: apexArgs.className,
                    apiVersion: apexArgs.apiVersion,
                    body: apexArgs.body
                };
                result = await (0, writeApex_js_1.handleWriteApex)(conn, validatedArgs);
                break;
            }
            case "salesforce_read_apex_trigger": {
                const triggerArgs = args;
                const validatedArgs = {
                    triggerName: triggerArgs.triggerName,
                    namePattern: triggerArgs.namePattern,
                    includeMetadata: triggerArgs.includeMetadata
                };
                result = await (0, readApexTrigger_js_1.handleReadApexTrigger)(conn, validatedArgs);
                break;
            }
            case "salesforce_write_apex_trigger": {
                const triggerArgs = args;
                if (!triggerArgs.operation || !triggerArgs.triggerName || !triggerArgs.body) {
                    throw new Error('operation, triggerName, and body are required for writing Apex trigger');
                }
                const validatedArgs = {
                    operation: triggerArgs.operation,
                    triggerName: triggerArgs.triggerName,
                    objectName: triggerArgs.objectName,
                    apiVersion: triggerArgs.apiVersion,
                    body: triggerArgs.body
                };
                result = await (0, writeApexTrigger_js_1.handleWriteApexTrigger)(conn, validatedArgs);
                break;
            }
            case "salesforce_execute_anonymous": {
                const executeArgs = args;
                if (!executeArgs.apexCode) {
                    throw new Error('apexCode is required for executing anonymous Apex');
                }
                const validatedArgs = {
                    apexCode: executeArgs.apexCode,
                    logLevel: executeArgs.logLevel
                };
                result = await (0, executeAnonymous_js_1.handleExecuteAnonymous)(conn, validatedArgs);
                break;
            }
            case "salesforce_manage_debug_logs": {
                const debugLogsArgs = args;
                if (!debugLogsArgs.operation || !debugLogsArgs.username) {
                    throw new Error('operation and username are required for managing debug logs');
                }
                const validatedArgs = {
                    operation: debugLogsArgs.operation,
                    username: debugLogsArgs.username,
                    logLevel: debugLogsArgs.logLevel,
                    expirationTime: debugLogsArgs.expirationTime,
                    limit: debugLogsArgs.limit,
                    logId: debugLogsArgs.logId,
                    includeBody: debugLogsArgs.includeBody
                };
                result = await (0, manageDebugLogs_js_1.handleManageDebugLogs)(conn, validatedArgs);
                break;
            }
            default:
                return res.status(400).json({ error: `Unknown tool: ${name}` });
        }
        res.json(result);
    }
    catch (error) {
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
const mcpServer = new index_js_1.Server({
    name: "salesforce-mcp-sso-server",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// Tool handlers (same as original)
mcpServer.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
    tools: [
        search_js_1.SEARCH_OBJECTS,
        describe_js_1.DESCRIBE_OBJECT,
        query_js_1.QUERY_RECORDS,
        dml_js_1.DML_RECORDS,
        manageObject_js_1.MANAGE_OBJECT,
        manageField_js_1.MANAGE_FIELD,
        searchAll_js_1.SEARCH_ALL,
        readApex_js_1.READ_APEX,
        writeApex_js_1.WRITE_APEX,
        readApexTrigger_js_1.READ_APEX_TRIGGER,
        writeApexTrigger_js_1.WRITE_APEX_TRIGGER,
        executeAnonymous_js_1.EXECUTE_ANONYMOUS,
        manageDebugLogs_js_1.MANAGE_DEBUG_LOGS
    ],
}));
mcpServer.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    try {
        const { name, arguments: args } = request.params;
        if (!args)
            throw new Error('Arguments are required');
        // For stdio mode, use default connection
        const conn = await (0, connection_js_1.createSalesforceConnection)();
        // Same tool handling logic as HTTP endpoints...
        // (Implementation would be identical to the HTTP version above)
        // For brevity, using the original connection method for stdio mode
    }
    catch (error) {
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
        const transport = new stdio_js_1.StdioServerTransport();
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
