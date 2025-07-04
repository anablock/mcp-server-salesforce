#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';

import { createSalesforceConnection } from "./utils/connection.js";
import { SEARCH_OBJECTS, handleSearchObjects } from "./tools/search.js";
import { DESCRIBE_OBJECT, handleDescribeObject } from "./tools/describe.js";
import { QUERY_RECORDS, handleQueryRecords, QueryArgs } from "./tools/query.js";
import { DML_RECORDS, handleDMLRecords, DMLArgs } from "./tools/dml.js";
import { MANAGE_OBJECT, handleManageObject, ManageObjectArgs } from "./tools/manageObject.js";
import { MANAGE_FIELD, handleManageField, ManageFieldArgs } from "./tools/manageField.js";
import { SEARCH_ALL, handleSearchAll, SearchAllArgs } from "./tools/searchAll.js";
import { READ_APEX, handleReadApex, ReadApexArgs } from "./tools/readApex.js";
import { WRITE_APEX, handleWriteApex, WriteApexArgs } from "./tools/writeApex.js";
import { READ_APEX_TRIGGER, handleReadApexTrigger, ReadApexTriggerArgs } from "./tools/readApexTrigger.js";
import { WRITE_APEX_TRIGGER, handleWriteApexTrigger, WriteApexTriggerArgs } from "./tools/writeApexTrigger.js";
import { EXECUTE_ANONYMOUS, handleExecuteAnonymous, ExecuteAnonymousArgs } from "./tools/executeAnonymous.js";
import { MANAGE_DEBUG_LOGS, handleManageDebugLogs, ManageDebugLogsArgs } from "./tools/manageDebugLogs.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];

// Enhanced CORS configuration for production
const corsOptions = {
  origin: isProduction ? allowedOrigins : true,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Security headers for production
if (isProduction) {
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development',
    version: process.env.npm_package_version || '0.0.2'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Salesforce MCP Server',
    version: process.env.npm_package_version || '0.0.2',
    environment: isProduction ? 'production' : 'development',
    endpoints: {
      health: '/health',
      tools: '/tools',
      mcp: '/mcp'
    },
    documentation: 'https://github.com/your-repo/mcp-server-salesforce'
  });
});

// List all available tools
app.get('/tools', (req, res) => {
  const tools = [
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
  ];

  res.json({ 
    tools,
    count: tools.length,
    server: 'Salesforce MCP Server'
  });
});

// Execute a specific tool (REST API)
app.post('/tools/:toolName', async (req, res) => {
  try {
    const { toolName } = req.params;
    const args = req.body;

    console.log(`[${new Date().toISOString()}] Executing tool: ${toolName}`);

    const conn = await createSalesforceConnection();
    let result;

    switch (toolName) {
      case "salesforce_search_objects": {
        const { searchPattern } = args;
        if (!searchPattern) throw new Error('searchPattern is required');
        result = await handleSearchObjects(conn, searchPattern);
        break;
      }

      case "salesforce_describe_object": {
        const { objectName } = args;
        if (!objectName) throw new Error('objectName is required');
        result = await handleDescribeObject(conn, objectName);
        break;
      }

      case "salesforce_query_records": {
        if (!args.objectName || !Array.isArray(args.fields)) {
          throw new Error('objectName and fields array are required for query');
        }
        const validatedArgs: QueryArgs = {
          objectName: args.objectName,
          fields: args.fields,
          whereClause: args.whereClause,
          orderBy: args.orderBy,
          limit: args.limit
        };
        result = await handleQueryRecords(conn, validatedArgs);
        break;
      }

      case "salesforce_dml_records": {
        if (!args.operation || !args.objectName || !Array.isArray(args.records)) {
          throw new Error('operation, objectName, and records array are required for DML');
        }
        const validatedArgs: DMLArgs = {
          operation: args.operation,
          objectName: args.objectName,
          records: args.records,
          externalIdField: args.externalIdField
        };
        result = await handleDMLRecords(conn, validatedArgs);
        break;
      }

      case "salesforce_manage_object": {
        if (!args.operation || !args.objectName) {
          throw new Error('operation and objectName are required for object management');
        }
        const validatedArgs: ManageObjectArgs = {
          operation: args.operation,
          objectName: args.objectName,
          label: args.label,
          pluralLabel: args.pluralLabel,
          description: args.description,
          nameFieldLabel: args.nameFieldLabel,
          nameFieldType: args.nameFieldType,
          nameFieldFormat: args.nameFieldFormat,
          sharingModel: args.sharingModel
        };
        result = await handleManageObject(conn, validatedArgs);
        break;
      }

      case "salesforce_manage_field": {
        if (!args.operation || !args.objectName || !args.fieldName) {
          throw new Error('operation, objectName, and fieldName are required for field management');
        }
        const validatedArgs: ManageFieldArgs = {
          operation: args.operation,
          objectName: args.objectName,
          fieldName: args.fieldName,
          label: args.label,
          type: args.type,
          required: args.required,
          unique: args.unique,
          externalId: args.externalId,
          length: args.length,
          precision: args.precision,
          scale: args.scale,
          referenceTo: args.referenceTo,
          relationshipLabel: args.relationshipLabel,
          relationshipName: args.relationshipName,
          deleteConstraint: args.deleteConstraint,
          picklistValues: args.picklistValues,
          description: args.description
        };
        result = await handleManageField(conn, validatedArgs);
        break;
      }

      case "salesforce_search_all": {
        if (!args.searchTerm || !Array.isArray(args.objects)) {
          throw new Error('searchTerm and objects array are required for search');
        }
        const validatedArgs: SearchAllArgs = {
          searchTerm: args.searchTerm,
          searchIn: args.searchIn,
          objects: args.objects,
          withClauses: args.withClauses,
          updateable: args.updateable,
          viewable: args.viewable
        };
        result = await handleSearchAll(conn, validatedArgs);
        break;
      }

      case "salesforce_read_apex": {
        const validatedArgs: ReadApexArgs = {
          className: args?.className,
          namePattern: args?.namePattern,
          includeMetadata: args?.includeMetadata
        };
        result = await handleReadApex(conn, validatedArgs);
        break;
      }

      case "salesforce_write_apex": {
        if (!args.className || !args.body) {
          throw new Error('className and body are required for write apex');
        }
        const validatedArgs: WriteApexArgs = {
          className: args.className,
          body: args.body,
          operation: args.operation || 'create',
          apiVersion: args.apiVersion
        };
        result = await handleWriteApex(conn, validatedArgs);
        break;
      }

      case "salesforce_read_apex_trigger": {
        const validatedArgs: ReadApexTriggerArgs = {
          triggerName: args?.triggerName,
          namePattern: args?.namePattern,
          includeMetadata: args?.includeMetadata
        };
        result = await handleReadApexTrigger(conn, validatedArgs);
        break;
      }

      case "salesforce_write_apex_trigger": {
        if (!args.triggerName || !args.body) {
          throw new Error('triggerName and body are required for write apex trigger');
        }
        const validatedArgs: WriteApexTriggerArgs = {
          triggerName: args.triggerName,
          body: args.body,
          operation: args.operation || 'create',
          objectName: args.objectName,
          apiVersion: args.apiVersion
        };
        result = await handleWriteApexTrigger(conn, validatedArgs);
        break;
      }

      case "salesforce_execute_anonymous": {
        if (!args.apexCode) {
          throw new Error('apexCode is required for execute anonymous');
        }
        const validatedArgs: ExecuteAnonymousArgs = {
          apexCode: args.apexCode
        };
        result = await handleExecuteAnonymous(conn, validatedArgs);
        break;
      }

      case "salesforce_manage_debug_logs": {
        if (!args.operation) {
          throw new Error('operation is required for manage debug logs');
        }
        const validatedArgs: ManageDebugLogsArgs = {
          operation: args.operation,
          username: args.username,
          logLevel: args.logLevel,
          expirationTime: args.expirationTime,
          limit: args.limit,
          logId: args.logId,
          includeBody: args.includeBody
        };
        result = await handleManageDebugLogs(conn, validatedArgs);
        break;
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }

    res.json(result);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error executing tool ${req.params.toolName}:`, error);
    res.status(500).json({
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    });
  }
});

// Handle OPTIONS requests for CORS preflight
app.options('/mcp', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

// MCP endpoint for SSE connection
app.get('/mcp', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    jsonrpc: '2.0',
    method: 'notifications/initialized',
    params: {}
  })}\n\n`);

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      jsonrpc: '2.0',
      method: 'ping',
      params: {}
    })}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

// MCP POST endpoint for JSON-RPC calls
app.post('/mcp', async (req, res) => {
  try {
    const { method, params, id } = req.body;
    
    console.log(`[${new Date().toISOString()}] MCP method: ${method}`);
    
    if (method === 'initialize') {
      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {}
          },
          serverInfo: {
            name: 'Salesforce MCP Server',
            version: process.env.npm_package_version || '0.0.2'
          }
        }
      });
      return;
    }

    if (method === 'initialized' || method === 'notifications/initialized') {
      res.json({
        jsonrpc: '2.0',
        id: id || null,
        result: {}
      });
      return;
    }

    if (method === 'tools/list') {
      const tools = [
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
      ];

      res.json({
        jsonrpc: '2.0',
        id,
        result: { tools }
      });
      return;
    }

    if (method === 'tools/call') {
      const { name: toolName, arguments: args } = params;
             
      const conn = await createSalesforceConnection();
      let result;
      
      switch (toolName) {
        case "salesforce_search_objects": {
          const { searchPattern } = args;
          if (!searchPattern) throw new Error('searchPattern is required');
          result = await handleSearchObjects(conn, searchPattern);
          break;
        }

        case "salesforce_describe_object": {
          const { objectName } = args;
          if (!objectName) throw new Error('objectName is required');
          result = await handleDescribeObject(conn, objectName);
          break;
        }

        case "salesforce_query_records": {
          if (!args.objectName || !Array.isArray(args.fields)) {
            throw new Error('objectName and fields array are required for query');
          }
          const validatedArgs: QueryArgs = {
            objectName: args.objectName,
            fields: args.fields,
            whereClause: args.whereClause,
            orderBy: args.orderBy,
            limit: args.limit
          };
          result = await handleQueryRecords(conn, validatedArgs);
          break;
        }

        case "salesforce_dml_records": {
          if (!args.operation || !args.objectName || !Array.isArray(args.records)) {
            throw new Error('operation, objectName, and records array are required for DML');
          }
          const validatedArgs: DMLArgs = {
            operation: args.operation,
            objectName: args.objectName,
            records: args.records,
            externalIdField: args.externalIdField
          };
          result = await handleDMLRecords(conn, validatedArgs);
          break;
        }

        case "salesforce_manage_object": {
          if (!args.operation || !args.objectName) {
            throw new Error('operation and objectName are required for object management');
          }
          const validatedArgs: ManageObjectArgs = {
            operation: args.operation,
            objectName: args.objectName,
            label: args.label,
            pluralLabel: args.pluralLabel,
            description: args.description,
            nameFieldLabel: args.nameFieldLabel,
            nameFieldType: args.nameFieldType,
            nameFieldFormat: args.nameFieldFormat,
            sharingModel: args.sharingModel
          };
          result = await handleManageObject(conn, validatedArgs);
          break;
        }

        case "salesforce_manage_field": {
          if (!args.operation || !args.objectName || !args.fieldName) {
            throw new Error('operation, objectName, and fieldName are required for field management');
          }
          const validatedArgs: ManageFieldArgs = {
            operation: args.operation,
            objectName: args.objectName,
            fieldName: args.fieldName,
            label: args.label,
            type: args.type,
            required: args.required,
            unique: args.unique,
            externalId: args.externalId,
            length: args.length,
            precision: args.precision,
            scale: args.scale,
            referenceTo: args.referenceTo,
            relationshipLabel: args.relationshipLabel,
            relationshipName: args.relationshipName,
            deleteConstraint: args.deleteConstraint,
            picklistValues: args.picklistValues,
            description: args.description
          };
          result = await handleManageField(conn, validatedArgs);
          break;
        }

        case "salesforce_search_all": {
          if (!args.searchTerm || !Array.isArray(args.objects)) {
            throw new Error('searchTerm and objects array are required for search');
          }
          const validatedArgs: SearchAllArgs = {
            searchTerm: args.searchTerm,
            searchIn: args.searchIn,
            objects: args.objects,
            withClauses: args.withClauses,
            updateable: args.updateable,
            viewable: args.viewable
          };
          result = await handleSearchAll(conn, validatedArgs);
          break;
        }

        case "salesforce_read_apex": {
          const validatedArgs: ReadApexArgs = {
            className: args?.className,
            namePattern: args?.namePattern,
            includeMetadata: args?.includeMetadata
          };
          result = await handleReadApex(conn, validatedArgs);
          break;
        }

        case "salesforce_write_apex": {
          if (!args.className || !args.body) {
            throw new Error('className and body are required for write apex');
          }
          const validatedArgs: WriteApexArgs = {
            className: args.className,
            body: args.body,
            operation: args.operation || 'create',
            apiVersion: args.apiVersion
          };
          result = await handleWriteApex(conn, validatedArgs);
          break;
        }

        case "salesforce_read_apex_trigger": {
          const validatedArgs: ReadApexTriggerArgs = {
            triggerName: args?.triggerName,
            namePattern: args?.namePattern,
            includeMetadata: args?.includeMetadata
          };
          result = await handleReadApexTrigger(conn, validatedArgs);
          break;
        }

        case "salesforce_write_apex_trigger": {
          if (!args.triggerName || !args.body) {
            throw new Error('triggerName and body are required for write apex trigger');
          }
          const validatedArgs: WriteApexTriggerArgs = {
            triggerName: args.triggerName,
            body: args.body,
            operation: args.operation || 'create',
            objectName: args.objectName,
            apiVersion: args.apiVersion
          };
          result = await handleWriteApexTrigger(conn, validatedArgs);
          break;
        }

        case "salesforce_execute_anonymous": {
          if (!args.apexCode) {
            throw new Error('apexCode is required for execute anonymous');
          }
          const validatedArgs: ExecuteAnonymousArgs = {
            apexCode: args.apexCode
          };
          result = await handleExecuteAnonymous(conn, validatedArgs);
          break;
        }

        case "salesforce_manage_debug_logs": {
          if (!args.operation) {
            throw new Error('operation is required for manage debug logs');
          }
          const validatedArgs: ManageDebugLogsArgs = {
            operation: args.operation,
            username: args.username,
            logLevel: args.logLevel,
            expirationTime: args.expirationTime,
            limit: args.limit,
            logId: args.logId,
            includeBody: args.includeBody
          };
          result = await handleManageDebugLogs(conn, validatedArgs);
          break;
        }

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }

      res.json({
        jsonrpc: '2.0',
        id,
        result
      });
      return;
    }

    res.status(400).json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: `Method not found: ${method}`
      }
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] MCP Error:`, error);
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body?.id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : String(error)
      }
    });
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[${new Date().toISOString()}] Unhandled error:`, error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: isProduction ? 'Something went wrong' : error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

app.listen(port, () => {
  console.log(`🚀 Salesforce MCP Production Server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🔧 Tools endpoint: http://localhost:${port}/tools`);
  console.log(`🔌 MCP endpoint: http://localhost:${port}/mcp`);
  console.log(`🌍 Environment: ${isProduction ? 'production' : 'development'}`);
});