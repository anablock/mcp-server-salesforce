#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import * as dotenv from "dotenv";
import { createSalesforceConnection } from "./utils/connection.js";
import { SEARCH_OBJECTS, handleSearchObjects } from "./tools/search.js";
import { DESCRIBE_OBJECT, handleDescribeObject } from "./tools/describe.js";
import { QUERY_RECORDS, handleQueryRecords } from "./tools/query.js";
import { DML_RECORDS, handleDMLRecords } from "./tools/dml.js";
import { MANAGE_OBJECT, handleManageObject } from "./tools/manageObject.js";
import { MANAGE_FIELD, handleManageField } from "./tools/manageField.js";
import { SEARCH_ALL, handleSearchAll } from "./tools/searchAll.js";
import { READ_APEX, handleReadApex } from "./tools/readApex.js";
import { WRITE_APEX, handleWriteApex } from "./tools/writeApex.js";
import { READ_APEX_TRIGGER, handleReadApexTrigger } from "./tools/readApexTrigger.js";
import { WRITE_APEX_TRIGGER, handleWriteApexTrigger } from "./tools/writeApexTrigger.js";
import { EXECUTE_ANONYMOUS, handleExecuteAnonymous } from "./tools/executeAnonymous.js";
import { MANAGE_DEBUG_LOGS, handleManageDebugLogs } from "./tools/manageDebugLogs.js";
dotenv.config();
const server = new Server({
    name: "salesforce-mcp-server",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
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
        if (!args)
            throw new Error('Arguments are required');
        const conn = await createSalesforceConnection();
        switch (name) {
            case "salesforce_search_objects": {
                const { searchPattern } = args;
                if (!searchPattern)
                    throw new Error('searchPattern is required');
                return await handleSearchObjects(conn, searchPattern);
            }
            case "salesforce_describe_object": {
                const { objectName } = args;
                if (!objectName)
                    throw new Error('objectName is required');
                return await handleDescribeObject(conn, objectName);
            }
            case "salesforce_query_records": {
                const queryArgs = args;
                if (!queryArgs.objectName || !Array.isArray(queryArgs.fields)) {
                    throw new Error('objectName and fields array are required for query');
                }
                // Type check and conversion
                const validatedArgs = {
                    objectName: queryArgs.objectName,
                    fields: queryArgs.fields,
                    whereClause: queryArgs.whereClause,
                    orderBy: queryArgs.orderBy,
                    limit: queryArgs.limit
                };
                return await handleQueryRecords(conn, validatedArgs);
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
                return await handleDMLRecords(conn, validatedArgs);
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
                return await handleManageObject(conn, validatedArgs);
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
                return await handleManageField(conn, validatedArgs);
            }
            case "salesforce_search_all": {
                const searchArgs = args;
                if (!searchArgs.searchTerm || !Array.isArray(searchArgs.objects)) {
                    throw new Error('searchTerm and objects array are required for search');
                }
                // Validate objects array
                const objects = searchArgs.objects;
                if (!objects.every(obj => obj.name && Array.isArray(obj.fields))) {
                    throw new Error('Each object must specify name and fields array');
                }
                // Type check and conversion
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
                return await handleSearchAll(conn, validatedArgs);
            }
            case "salesforce_read_apex": {
                const apexArgs = args;
                // Type check and conversion
                const validatedArgs = {
                    className: apexArgs.className,
                    namePattern: apexArgs.namePattern,
                    includeMetadata: apexArgs.includeMetadata
                };
                return await handleReadApex(conn, validatedArgs);
            }
            case "salesforce_write_apex": {
                const apexArgs = args;
                if (!apexArgs.operation || !apexArgs.className || !apexArgs.body) {
                    throw new Error('operation, className, and body are required for writing Apex');
                }
                // Type check and conversion
                const validatedArgs = {
                    operation: apexArgs.operation,
                    className: apexArgs.className,
                    apiVersion: apexArgs.apiVersion,
                    body: apexArgs.body
                };
                return await handleWriteApex(conn, validatedArgs);
            }
            case "salesforce_read_apex_trigger": {
                const triggerArgs = args;
                // Type check and conversion
                const validatedArgs = {
                    triggerName: triggerArgs.triggerName,
                    namePattern: triggerArgs.namePattern,
                    includeMetadata: triggerArgs.includeMetadata
                };
                return await handleReadApexTrigger(conn, validatedArgs);
            }
            case "salesforce_write_apex_trigger": {
                const triggerArgs = args;
                if (!triggerArgs.operation || !triggerArgs.triggerName || !triggerArgs.body) {
                    throw new Error('operation, triggerName, and body are required for writing Apex trigger');
                }
                // Type check and conversion
                const validatedArgs = {
                    operation: triggerArgs.operation,
                    triggerName: triggerArgs.triggerName,
                    objectName: triggerArgs.objectName,
                    apiVersion: triggerArgs.apiVersion,
                    body: triggerArgs.body
                };
                return await handleWriteApexTrigger(conn, validatedArgs);
            }
            case "salesforce_execute_anonymous": {
                const executeArgs = args;
                if (!executeArgs.apexCode) {
                    throw new Error('apexCode is required for executing anonymous Apex');
                }
                // Type check and conversion
                const validatedArgs = {
                    apexCode: executeArgs.apexCode,
                    logLevel: executeArgs.logLevel
                };
                return await handleExecuteAnonymous(conn, validatedArgs);
            }
            case "salesforce_manage_debug_logs": {
                const debugLogsArgs = args;
                if (!debugLogsArgs.operation || !debugLogsArgs.username) {
                    throw new Error('operation and username are required for managing debug logs');
                }
                // Type check and conversion
                const validatedArgs = {
                    operation: debugLogsArgs.operation,
                    username: debugLogsArgs.username,
                    logLevel: debugLogsArgs.logLevel,
                    expirationTime: debugLogsArgs.expirationTime,
                    limit: debugLogsArgs.limit,
                    logId: debugLogsArgs.logId,
                    includeBody: debugLogsArgs.includeBody
                };
                return await handleManageDebugLogs(conn, validatedArgs);
            }
            default:
                return {
                    content: [{ type: "text", text: `Unknown tool: ${name}` }],
                    isError: true,
                };
        }
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
async function runServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Salesforce MCP Server running on stdio");
}
runServer().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});
