#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { createSalesforceConnection } from './utils/connection.js';
import { handleSearchObjects } from './tools/search.js';
import { handleDescribeObject } from './tools/describe.js';
import { handleQueryRecords, QueryArgs } from './tools/query.js';
import { handleDMLRecords, DMLArgs } from './tools/dml.js';
import { handleManageObject, ManageObjectArgs } from './tools/manageObject.js';
import { handleManageField, ManageFieldArgs } from './tools/manageField.js';
import { handleSearchAll, SearchAllArgs } from './tools/searchAll.js';
import { handleReadApex, ReadApexArgs } from './tools/readApex.js';
import { handleWriteApex, WriteApexArgs } from './tools/writeApex.js';
import { handleReadApexTrigger, ReadApexTriggerArgs } from './tools/readApexTrigger.js';
import { handleWriteApexTrigger, WriteApexTriggerArgs } from './tools/writeApexTrigger.js';
import { handleExecuteAnonymous, ExecuteAnonymousArgs } from './tools/executeAnonymous.js';
import { handleManageDebugLogs, ManageDebugLogsArgs } from './tools/manageDebugLogs.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get available tools
app.get('/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'salesforce_search_objects',
        description: 'Search for Salesforce objects by name pattern',
        parameters: { searchPattern: 'string' }
      },
      {
        name: 'salesforce_describe_object',
        description: 'Get detailed information about a Salesforce object',
        parameters: { objectName: 'string' }
      },
      {
        name: 'salesforce_query_records',
        description: 'Query records from Salesforce objects',
        parameters: { 
          objectName: 'string', 
          fields: 'string[]', 
          whereClause: 'string?', 
          orderBy: 'string?', 
          limit: 'number?' 
        }
      },
      {
        name: 'salesforce_dml_records',
        description: 'Perform DML operations (insert, update, delete, upsert) on records',
        parameters: { 
          operation: 'insert|update|delete|upsert', 
          objectName: 'string', 
          records: 'object[]', 
          externalIdField: 'string?' 
        }
      },
      {
        name: 'salesforce_manage_object',
        description: 'Create or update custom objects',
        parameters: { 
          operation: 'create|update', 
          objectName: 'string', 
          label: 'string?',
          // ... other parameters
        }
      },
      {
        name: 'salesforce_manage_field',
        description: 'Create or update custom fields',
        parameters: { 
          operation: 'create|update', 
          objectName: 'string', 
          fieldName: 'string',
          // ... other parameters
        }
      },
      {
        name: 'salesforce_search_all',
        description: 'Search across multiple Salesforce objects using SOSL',
        parameters: { 
          searchTerm: 'string', 
          objects: 'object[]',
          // ... other parameters
        }
      },
      {
        name: 'salesforce_read_apex',
        description: 'Read Apex classes',
        parameters: { 
          className: 'string?', 
          namePattern: 'string?', 
          includeMetadata: 'boolean?' 
        }
      },
      {
        name: 'salesforce_write_apex',
        description: 'Create or update Apex classes',
        parameters: { 
          operation: 'create|update',
          className: 'string', 
          body: 'string', 
          apiVersion: 'string?' 
        }
      },
      {
        name: 'salesforce_read_apex_trigger',
        description: 'Read Apex triggers',
        parameters: { 
          triggerName: 'string?', 
          namePattern: 'string?', 
          includeMetadata: 'boolean?' 
        }
      },
      {
        name: 'salesforce_write_apex_trigger',
        description: 'Create or update Apex triggers',
        parameters: { 
          operation: 'create|update',
          triggerName: 'string', 
          objectName: 'string?', 
          body: 'string', 
          apiVersion: 'string?' 
        }
      },
      {
        name: 'salesforce_execute_anonymous',
        description: 'Execute anonymous Apex code',
        parameters: { 
          apexCode: 'string' 
        }
      },
      {
        name: 'salesforce_manage_debug_logs',
        description: 'Manage debug logs for users',
        parameters: { 
          operation: 'enable|disable|retrieve', 
          username: 'string', 
          logLevel: 'string?',
          expirationTime: 'number?',
          limit: 'number?',
          logId: 'string?',
          includeBody: 'boolean?'
        }
      }
    ]
  });
});

// Tool execution endpoint
app.post('/tools/:toolName', async (req, res) => {
  try {
    const { toolName } = req.params;
    const args = req.body;

    console.log(`Executing tool: ${toolName}`, { args });

    const conn = await createSalesforceConnection();

    let result;

    switch (toolName) {
      case 'salesforce_search_objects': {
        const { searchPattern } = args;
        if (!searchPattern) throw new Error('searchPattern is required');
        result = await handleSearchObjects(conn, searchPattern);
        break;
      }

      case 'salesforce_describe_object': {
        const { objectName } = args;
        if (!objectName) throw new Error('objectName is required');
        result = await handleDescribeObject(conn, objectName);
        break;
      }

      case 'salesforce_query_records': {
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

      case 'salesforce_dml_records': {
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

      case 'salesforce_manage_object': {
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

      case 'salesforce_manage_field': {
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

      case 'salesforce_search_all': {
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

      case 'salesforce_read_apex': {
        const validatedArgs: ReadApexArgs = {
          className: args.className,
          namePattern: args.namePattern,
          includeMetadata: args.includeMetadata
        };
        result = await handleReadApex(conn, validatedArgs);
        break;
      }

      case 'salesforce_write_apex': {
        if (!args.className || !args.body || !args.operation) {
          throw new Error('operation, className and body are required for Apex class creation/update');
        }
        const validatedArgs: WriteApexArgs = {
          operation: args.operation,
          className: args.className,
          body: args.body,
          apiVersion: args.apiVersion
        };
        result = await handleWriteApex(conn, validatedArgs);
        break;
      }

      case 'salesforce_read_apex_trigger': {
        const validatedArgs: ReadApexTriggerArgs = {
          triggerName: args.triggerName,
          namePattern: args.namePattern,
          includeMetadata: args.includeMetadata
        };
        result = await handleReadApexTrigger(conn, validatedArgs);
        break;
      }

      case 'salesforce_write_apex_trigger': {
        if (!args.triggerName || !args.body || !args.operation) {
          throw new Error('operation, triggerName, and body are required for trigger creation/update');
        }
        const validatedArgs: WriteApexTriggerArgs = {
          operation: args.operation,
          triggerName: args.triggerName,
          objectName: args.objectName,
          body: args.body,
          apiVersion: args.apiVersion
        };
        result = await handleWriteApexTrigger(conn, validatedArgs);
        break;
      }

      case 'salesforce_execute_anonymous': {
        if (!args.apexCode) {
          throw new Error('apexCode is required for anonymous execution');
        }
        const validatedArgs: ExecuteAnonymousArgs = {
          apexCode: args.apexCode
        };
        result = await handleExecuteAnonymous(conn, validatedArgs);
        break;
      }

      case 'salesforce_manage_debug_logs': {
        if (!args.operation || !args.username) {
          throw new Error('operation and username are required for debug log management');
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
      success: true,
      result: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`Error executing tool ${req.params.toolName}:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Generic tool execution endpoint (for MCP-style requests)
app.post('/mcp/call_tool', async (req, res) => {
  try {
    const { name, arguments: args } = req.body;
    
    // Redirect to the specific tool endpoint
    const toolResponse = await fetch(`${req.protocol}://${req.get('host')}/tools/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args)
    });
    
    const result = await toolResponse.json();
    res.json(result);
  } catch (error) {
    console.error('Error in MCP call_tool:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Salesforce MCP HTTP Server running on port ${port}`);
  console.log(`📡 Health check: http://localhost:${port}/health`);
  console.log(`🔧 Available tools: http://localhost:${port}/tools`);
});

export default app; 