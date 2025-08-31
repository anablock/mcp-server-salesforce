# Salesforce MCP Server API Reference

## Overview

This document provides comprehensive API documentation for the Salesforce MCP SSO server, including all endpoints, MCP tools, authentication flows, and integration examples.

## Base URL

```
Production: https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com
Local: http://localhost:3000
```

## Authentication

### OAuth 2.0 Flow

The server implements OAuth 2.0 authorization code flow with PKCE for secure Salesforce integration.

#### 1. Initiate OAuth Flow

**Endpoint:** `GET /auth/salesforce/login`

**Parameters:**
- `user_id` (required) - Unique identifier for the user session

**Example:**
```bash
curl "https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/auth/salesforce/login?user_id=user123"
```

**Response:** HTTP 302 redirect to Salesforce login page

#### 2. OAuth Callback

**Endpoint:** `GET /auth/salesforce/callback`

**Parameters:**
- `code` (automatic) - Authorization code from Salesforce
- `state` (automatic) - OAuth state parameter

**Response:** HTTP 302 redirect to success page

#### 3. Check Authentication Status

**Endpoint:** `GET /auth/status`

**Response:**
```json
{
  "connected": true|false,
  "user_id": "string",
  "organization_id": "string",
  "last_verified": "2025-08-19T04:04:28.350Z"
}
```

## Core API Endpoints

### Health Monitoring

**Endpoint:** `GET /health`

**Description:** Comprehensive server health and metrics

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-08-19T04:04:28.350Z",
  "version": "0.0.2",
  "uptime": 264,
  "uptimeHuman": "0h 4m 24s",
  "memory": {
    "used": 21,
    "total": 23,
    "external": 4,
    "unit": "MB"
  },
  "connections": {
    "active": 0,
    "total": 0
  }
}
```

### MCP Tools Documentation

**Endpoint:** `GET /mcp/tools`

**Description:** Complete listing of available MCP tools with categories and usage information

**Response:**
```json
{
  "tools": [
    {
      "name": "salesforce_search_objects",
      "description": "Search and discover Salesforce objects by name pattern",
      "category": "discovery"
    }
  ],
  "total": 13,
  "categories": {
    "discovery": 2,
    "metadata": 3,
    "data": 2,
    "development": 6
  },
  "authentication": {
    "required": true,
    "flow": "OAuth 2.0",
    "loginUrl": "https://app.herokuapp.com/auth/salesforce/login?user_id={USER_ID}",
    "statusUrl": "https://app.herokuapp.com/auth/status"
  },
  "documentation": "https://app.herokuapp.com/api/docs",
  "usage": "Call tools via POST https://app.herokuapp.com/mcp/call with authentication"
}
```

### Success Page

**Endpoint:** `GET /auth/success`

**Description:** Professional success page displayed after successful OAuth authentication

**Optional Parameters:**
- `org_id` - Organization ID to display
- `connection_id` - Connection ID to display

**Response:** HTML page with modern UI showing:
- Connection confirmation
- Connection details
- Next steps guidance
- API access buttons

## MCP Tools Reference

### Discovery Tools

#### 1. salesforce_search_objects

**Purpose:** Search and discover Salesforce objects by name pattern

**Parameters:**
```json
{
  "searchTerm": "Account",
  "includeCustom": true,
  "includeStandard": true,
  "maxResults": 50
}
```

**Example Response:**
```json
{
  "objects": [
    {
      "name": "Account",
      "label": "Account", 
      "type": "standard",
      "apiName": "Account"
    }
  ],
  "totalFound": 1
}
```

#### 2. salesforce_search_all

**Purpose:** Search across multiple Salesforce objects using SOSL

**Parameters:**
```json
{
  "searchTerm": "Acme Corp",
  "objectTypes": ["Account", "Contact", "Opportunity"],
  "maxResults": 100
}
```

### Metadata Tools

#### 3. salesforce_describe_object

**Purpose:** Get detailed metadata for Salesforce objects including fields and relationships

**Parameters:**
```json
{
  "objectName": "Account"
}
```

**Example Response:**
```json
{
  "name": "Account",
  "label": "Account",
  "fields": [
    {
      "name": "Name",
      "type": "string",
      "label": "Account Name",
      "required": true
    }
  ],
  "relationships": [
    {
      "name": "Contacts",
      "type": "children",
      "relatedObject": "Contact"
    }
  ]
}
```

#### 4. salesforce_manage_object

**Purpose:** Create or update custom Salesforce objects

**Parameters:**
```json
{
  "objectName": "Custom_Object__c",
  "label": "Custom Object",
  "pluralLabel": "Custom Objects",
  "description": "Custom object description",
  "fields": [
    {
      "name": "Custom_Field__c",
      "type": "Text",
      "label": "Custom Field"
    }
  ]
}
```

#### 5. salesforce_manage_field

**Purpose:** Create or update fields on Salesforce objects

**Parameters:**
```json
{
  "objectName": "Account",
  "fieldName": "Custom_Field__c", 
  "fieldType": "Text",
  "label": "Custom Field",
  "length": 255
}
```

### Data Tools

#### 6. salesforce_query_records

**Purpose:** Query Salesforce records with SOQL-like syntax

**Parameters:**
```json
{
  "object": "Account",
  "fields": ["Name", "Industry", "AnnualRevenue"],
  "where": "Industry = 'Technology'",
  "orderBy": "Name ASC",
  "limit": 100
}
```

**Example Response:**
```json
{
  "records": [
    {
      "Id": "0011234567890ABC",
      "Name": "Acme Corp",
      "Industry": "Technology",
      "AnnualRevenue": 1000000
    }
  ],
  "totalSize": 1
}
```

#### 7. salesforce_dml_records

**Purpose:** Insert, update, delete, or upsert Salesforce records

**Parameters:**
```json
{
  "operation": "insert",
  "object": "Account", 
  "records": [
    {
      "Name": "New Account",
      "Industry": "Technology"
    }
  ]
}
```

**Operations:** `insert`, `update`, `upsert`, `delete`

### Development Tools

#### 8. salesforce_read_apex

**Purpose:** Read Apex class source code

**Parameters:**
```json
{
  "className": "MyApexClass"
}
```

**Example Response:**
```json
{
  "name": "MyApexClass",
  "body": "public class MyApexClass { ... }",
  "status": "Active",
  "apiVersion": "58.0"
}
```

#### 9. salesforce_write_apex

**Purpose:** Create or update Apex classes

**Parameters:**
```json
{
  "className": "MyApexClass",
  "body": "public class MyApexClass {\n    // Class implementation\n}",
  "apiVersion": "58.0"
}
```

#### 10. salesforce_read_apex_trigger

**Purpose:** Read Apex trigger source code

**Parameters:**
```json
{
  "triggerName": "AccountTrigger"
}
```

#### 11. salesforce_write_apex_trigger

**Purpose:** Create or update Apex triggers

**Parameters:**
```json
{
  "triggerName": "AccountTrigger",
  "objectName": "Account",
  "events": ["before insert", "before update"],
  "body": "trigger AccountTrigger on Account (before insert, before update) { ... }"
}
```

#### 12. salesforce_execute_anonymous

**Purpose:** Execute anonymous Apex code

**Parameters:**
```json
{
  "code": "System.debug('Hello World');"
}
```

**Example Response:**
```json
{
  "success": true,
  "debugLog": "Debug log output...",
  "executionTime": "142ms"
}
```

#### 13. salesforce_manage_debug_logs

**Purpose:** Enable, disable, or retrieve debug logs for users

**Parameters:**
```json
{
  "operation": "enable",
  "userId": "0051234567890ABC",
  "logLevel": "DEBUG"
}
```

**Operations:** `enable`, `disable`, `retrieve`, `list`

## MCP Protocol Integration

### Tool Calling Endpoint

**Endpoint:** `POST /mcp/call`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {oauth_token}
```

**Request Body:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "salesforce_query_records",
    "arguments": {
      "object": "Account",
      "fields": ["Name", "Industry"],
      "limit": 10
    }
  }
}
```

**Response:**
```json
{
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Query results: ..."
      }
    ]
  }
}
```

## Error Handling

### Standard Error Responses

```json
{
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "OAuth authentication required",
    "details": {
      "loginUrl": "/auth/salesforce/login?user_id={USER_ID}"
    }
  }
}
```

### Error Codes

- `AUTHENTICATION_REQUIRED` - OAuth token missing or expired
- `INVALID_PARAMETERS` - Request parameters validation failed
- `SALESFORCE_API_ERROR` - Salesforce API returned an error
- `RATE_LIMIT_EXCEEDED` - API rate limit exceeded
- `INTERNAL_SERVER_ERROR` - Unexpected server error

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Rate Limiting

### Limits
- **Authentication Endpoints:** 10 requests per minute per IP
- **API Endpoints:** 100 requests per minute per authenticated user
- **Health Endpoint:** 60 requests per minute per IP

### Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1629123456
```

## CORS Configuration

### Allowed Origins
- `localhost:*` (development)
- `*.herokuapp.com` (production)
- Configured domains via environment variables

### Allowed Methods
- `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`

### Allowed Headers
- `Content-Type`, `Authorization`, `X-Requested-With`

## Webhooks (Future Feature)

### Event Types
- `connection.established`
- `connection.expired`
- `api.rate_limit_exceeded`
- `error.authentication_failed`

### Webhook Payload
```json
{
  "event": "connection.established",
  "timestamp": "2025-08-19T04:04:28.350Z",
  "data": {
    "user_id": "user123",
    "organization_id": "00D123456789ABC"
  }
}
```

## SDK Examples

### Node.js Integration

```javascript
const SalesforceMCP = require('@tsmztech/mcp-server-salesforce-client');

const client = new SalesforceMCP({
  serverUrl: 'https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com',
  userId: 'user123'
});

// Authenticate
await client.authenticate();

// Query records
const accounts = await client.callTool('salesforce_query_records', {
  object: 'Account',
  fields: ['Name', 'Industry'],
  limit: 10
});

console.log(accounts);
```

### Python Integration

```python
import requests

class SalesforceMCPClient:
    def __init__(self, server_url, user_id):
        self.server_url = server_url
        self.user_id = user_id
        self.token = None
    
    def authenticate(self):
        # Implement OAuth flow
        pass
    
    def call_tool(self, tool_name, arguments):
        response = requests.post(
            f"{self.server_url}/mcp/call",
            json={
                "method": "tools/call",
                "params": {
                    "name": tool_name,
                    "arguments": arguments
                }
            },
            headers={"Authorization": f"Bearer {self.token}"}
        )
        return response.json()

# Usage
client = SalesforceMCPClient(
    "https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com",
    "user123"
)
client.authenticate()

accounts = client.call_tool("salesforce_query_records", {
    "object": "Account", 
    "fields": ["Name", "Industry"],
    "limit": 10
})
```

## Testing

### Health Check
```bash
curl -X GET "https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/health"
```

### Tool Documentation
```bash
curl -X GET "https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/mcp/tools"
```

### Authentication Status
```bash
curl -X GET "https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/auth/status"
```

## OpenAPI Specification

### Swagger/OpenAPI 3.0 Definition

```yaml
openapi: 3.0.0
info:
  title: Salesforce MCP Server API
  version: 0.0.2
  description: Salesforce Model Context Protocol Server with OAuth 2.0

servers:
  - url: https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com
    description: Production server

paths:
  /health:
    get:
      summary: Server health and metrics
      responses:
        '200':
          description: Server health status
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthResponse'

  /mcp/tools:
    get:
      summary: List available MCP tools
      responses:
        '200':
          description: Available tools and categories
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ToolsResponse'

components:
  schemas:
    HealthResponse:
      type: object
      properties:
        status:
          type: string
          example: "ok"
        timestamp:
          type: string
          format: date-time
        version:
          type: string
          example: "0.0.2"
        uptime:
          type: integer
          description: Uptime in seconds
        memory:
          type: object
          properties:
            used:
              type: integer
            total:
              type: integer
            unit:
              type: string
              example: "MB"
```

This API reference provides comprehensive documentation for integrating with the Salesforce MCP Server, covering all endpoints, authentication flows, MCP tools, and usage examples for multiple programming languages.