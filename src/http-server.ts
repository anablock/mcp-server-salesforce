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
import { SEARCH_ALL, handleSearchAll, SearchAllArgs, WithClause } from "./tools/searchAll.js";
import { READ_APEX, handleReadApex, ReadApexArgs } from "./tools/readApex.js";
import { WRITE_APEX, handleWriteApex, WriteApexArgs } from "./tools/writeApex.js";
import { READ_APEX_TRIGGER, handleReadApexTrigger, ReadApexTriggerArgs } from "./tools/readApexTrigger.js";
import { WRITE_APEX_TRIGGER, handleWriteApexTrigger, WriteApexTriggerArgs } from "./tools/writeApexTrigger.js";
import { EXECUTE_ANONYMOUS, handleExecuteAnonymous, ExecuteAnonymousArgs } from "./tools/executeAnonymous.js";
import { MANAGE_DEBUG_LOGS, handleManageDebugLogs, ManageDebugLogsArgs } from "./tools/manageDebugLogs.js";
import { patientAppointmentTool, handlePatientAppointment } from "./tools/patientAppointment.js";
import { searchPatientAppointmentsTool, handleSearchPatientAppointments } from "./tools/searchPatientAppointments.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
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
    MANAGE_DEBUG_LOGS,
    patientAppointmentTool,
    searchPatientAppointmentsTool
  ];

  res.json({ tools });
});

// Execute a specific tool
app.post('/tools/:toolName', async (req, res) => {
  try {
    const { toolName } = req.params;
    const args = req.body;

    console.log(`Executing tool: ${toolName} with args:`, args);

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

        const objects = args.objects;
        if (!objects.every((obj: any) => obj.name && Array.isArray(obj.fields))) {
          throw new Error('Each object must specify name and fields array');
        }

        const validatedArgs: SearchAllArgs = {
          searchTerm: args.searchTerm,
          searchIn: args.searchIn,
          objects: objects.map((obj: any) => ({
            name: obj.name,
            fields: obj.fields,
            where: obj.where,
            orderBy: obj.orderBy,
            limit: obj.limit
          })),
          withClauses: args.withClauses,
          updateable: args.updateable,
          viewable: args.viewable
        };

        result = await handleSearchAll(conn, validatedArgs);
        break;
      }

      case "salesforce_read_apex": {
        const validatedArgs: ReadApexArgs = {
          className: args.className,
          namePattern: args.namePattern,
          includeMetadata: args.includeMetadata
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
          triggerName: args.triggerName,
          namePattern: args.namePattern,
          includeMetadata: args.includeMetadata
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

      case "create_patient_appointment": {
        result = await handlePatientAppointment(args);
        break;
      }

      case "search_patient_appointments": {
        result = await handleSearchPatientAppointments(args);
        break;
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }

    res.json(result);
  } catch (error) {
    console.error(`Error executing tool ${req.params.toolName}:`, error);
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

// MCP endpoint for SSE connection
app.get('/mcp', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');

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

app.post('/mcp', async (req, res) => {
  try {
    const { method, params, id } = req.body;
    
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
            version: '0.0.2'
          }
        }
      });
      return;
    }

    if (method === 'initialized') {
      res.json({
        jsonrpc: '2.0',
        id,
        result: {}
      });
      return;
    }

    if (method === 'notifications/initialized') {
      res.json({
        jsonrpc: '2.0',
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
        MANAGE_DEBUG_LOGS,
        patientAppointmentTool,
        searchPatientAppointmentsTool
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

        case "create_patient_appointment": {
          result = await handlePatientAppointment(args);
          break;
        }

        case "search_patient_appointments": {
          result = await handleSearchPatientAppointments(args);
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

app.listen(port, () => {
  console.log(`🚀 Salesforce MCP HTTP Server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🔧 Tools endpoint: http://localhost:${port}/tools`);
  console.log(`🔌 MCP endpoint: http://localhost:${port}/mcp`);
});