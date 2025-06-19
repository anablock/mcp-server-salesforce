#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { createSalesforceConnection } from './utils/connection.js';
import { SEARCH_OBJECTS, handleSearchObjects } from './tools/search.js';
import { DESCRIBE_OBJECT, handleDescribeObject } from './tools/describe.js';
import { QUERY_RECORDS, handleQueryRecords, QueryArgs } from './tools/query.js';
import { DML_RECORDS, handleDMLRecords, DMLArgs } from './tools/dml.js';
import { MANAGE_OBJECT, handleManageObject, ManageObjectArgs } from './tools/manageObject.js';
import { MANAGE_FIELD, handleManageField, ManageFieldArgs } from './tools/manageField.js';
import { SEARCH_ALL, handleSearchAll, SearchAllArgs, WithClause } from './tools/searchAll.js';
import { READ_APEX, handleReadApex, ReadApexArgs } from './tools/readApex.js';
import { WRITE_APEX, handleWriteApex, WriteApexArgs } from './tools/writeApex.js';
import { READ_APEX_TRIGGER, handleReadApexTrigger, ReadApexTriggerArgs } from './tools/readApexTrigger.js';
import { WRITE_APEX_TRIGGER, handleWriteApexTrigger, WriteApexTriggerArgs } from './tools/writeApexTrigger.js';
import { EXECUTE_ANONYMOUS, handleExecuteAnonymous, ExecuteAnonymousArgs } from './tools/executeAnonymous.js';
import { MANAGE_DEBUG_LOGS, handleManageDebugLogs, ManageDebugLogsArgs } from './tools/manageDebugLogs.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Create MCP Server
const server = new Server(
  {
    name: "salesforce-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
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

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    if (!args) throw new Error('Arguments are required');

    const conn = await createSalesforceConnection();

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
        return await handleManageObject(conn, validatedArgs);
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
        return await handleManageField(conn, validatedArgs);
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

        return await handleSearchAll(conn, validatedArgs);
      }

      case "salesforce_read_apex": {
        const apexArgs = args as Record<string, unknown>;
        const validatedArgs: ReadApexArgs = {
          className: apexArgs.className as string | undefined,
          namePattern: apexArgs.namePattern as string | undefined,
          includeMetadata: apexArgs.includeMetadata as boolean | undefined
        };
        return await handleReadApex(conn, validatedArgs);
      }

      case "salesforce_write_apex": {
        const apexArgs = args as Record<string, unknown>;
        if (!apexArgs.operation || !apexArgs.className || !apexArgs.body) {
          throw new Error('operation, className, and body are required for Apex writing');
        }
        const validatedArgs: WriteApexArgs = {
          operation: apexArgs.operation as 'create' | 'update',
          className: apexArgs.className as string,
          body: apexArgs.body as string,
          apiVersion: apexArgs.apiVersion as string | undefined
        };
        return await handleWriteApex(conn, validatedArgs);
      }

      case "salesforce_read_apex_trigger": {
        const triggerArgs = args as Record<string, unknown>;
        const validatedArgs: ReadApexTriggerArgs = {
          triggerName: triggerArgs.triggerName as string | undefined,
          namePattern: triggerArgs.namePattern as string | undefined,
          includeMetadata: triggerArgs.includeMetadata as boolean | undefined
        };
        return await handleReadApexTrigger(conn, validatedArgs);
      }

      case "salesforce_write_apex_trigger": {
        const triggerArgs = args as Record<string, unknown>;
        if (!triggerArgs.operation || !triggerArgs.triggerName || !triggerArgs.body) {
          throw new Error('operation, triggerName, and body are required for trigger writing');
        }
        const validatedArgs: WriteApexTriggerArgs = {
          operation: triggerArgs.operation as 'create' | 'update',
          triggerName: triggerArgs.triggerName as string,
          objectName: triggerArgs.objectName as string | undefined,
          body: triggerArgs.body as string,
          apiVersion: triggerArgs.apiVersion as string | undefined
        };
        return await handleWriteApexTrigger(conn, validatedArgs);
      }

      case "salesforce_execute_anonymous": {
        const executeArgs = args as Record<string, unknown>;
        if (!executeArgs.apexCode) {
          throw new Error('apexCode is required for anonymous execution');
        }
        const validatedArgs: ExecuteAnonymousArgs = {
          apexCode: executeArgs.apexCode as string
        };
        return await handleExecuteAnonymous(conn, validatedArgs);
      }

      case "salesforce_manage_debug_logs": {
        const debugArgs = args as Record<string, unknown>;
        if (!debugArgs.operation || !debugArgs.username) {
          throw new Error('operation and username are required for debug log management');
        }
        const validatedArgs: ManageDebugLogsArgs = {
          operation: debugArgs.operation as 'enable' | 'disable' | 'retrieve',
          username: debugArgs.username as string,
          logLevel: debugArgs.logLevel as 'NONE' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'FINE' | 'FINER' | 'FINEST' | undefined,
          expirationTime: debugArgs.expirationTime as number | undefined,
          limit: debugArgs.limit as number | undefined,
          logId: debugArgs.logId as string | undefined,
          includeBody: debugArgs.includeBody as boolean | undefined
        };
        return await handleManageDebugLogs(conn, validatedArgs);
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    console.error(`Error executing tool ${request.params.name}:`, error);
    throw error;
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Store transports for session management
const transports: Record<string, SSEServerTransport> = {};

// SSE endpoint for MCP protocol
app.get('/mcp', async (req, res) => {
  try {
    const transport = new SSEServerTransport('/messages', res);
    const sessionId = transport.sessionId;
    transports[sessionId] = transport;
    
    res.on("close", () => {
      delete transports[sessionId];
    });
    
    await server.connect(transport);
    await transport.start();
  } catch (error) {
    console.error('MCP SSE endpoint error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Message endpoint for MCP protocol
app.post('/messages', async (req, res) => {
  try {
    const sessionId = req.query.sessionId as string;
    const transport = transports[sessionId];
    if (transport) {
      await transport.handlePostMessage(req, res);
    } else {
      res.status(400).json({ error: 'No transport found for sessionId' });
    }
  } catch (error) {
    console.error('MCP message endpoint error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Salesforce MCP Server running on port ${port}`);
  console.log(`📡 MCP endpoint: http://localhost:${port}/mcp`);
  console.log(`🏥 Health check: http://localhost:${port}/health`);
});

export default app; 