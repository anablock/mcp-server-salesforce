# Vapi Function Tools Configuration for Salesforce MCP Server

## Server Details
- **Deployed URL**: `https://web-production-1bd9.up.railway.app/`
- **Authentication**: Bearer token required
- **Token**: `salesforce-mcp-token-2024`

## Test Results Summary ✅

Your MCP server is successfully deployed and working correctly with Vapi integration:

1. **Health Check**: ✅ Server running (status: healthy)
2. **Tool Listing**: ✅ All 13 Salesforce tools available
3. **Query Test**: ✅ `salesforce_query_records` returning Account data
4. **Search Test**: ✅ `salesforce_search_all` finding 250+ Martinez records

## Function Tool Configuration for Vapi

### 1. Query Records Tool
```json
{
  "type": "function",
  "function": {
    "name": "salesforce_query_records",
    "description": "Query records from Salesforce objects using SOQL with support for relationship queries",
    "parameters": {
      "type": "object",
      "properties": {
        "objectName": {
          "type": "string",
          "description": "API name of the Salesforce object (e.g., 'Account', 'Contact', 'Opportunity')"
        },
        "fields": {
          "type": "array",
          "items": {"type": "string"},
          "description": "List of fields to retrieve. Can include relationship fields like 'Account.Name'"
        },
        "whereClause": {
          "type": "string",
          "description": "Optional WHERE clause for filtering records"
        },
        "orderBy": {
          "type": "string", 
          "description": "Optional ORDER BY clause for sorting"
        },
        "limit": {
          "type": "number",
          "description": "Maximum number of records to return"
        }
      },
      "required": ["objectName", "fields"]
    }
  },
  "server": {
    "url": "https://web-production-1bd9.up.railway.app/mcp",
    "timeoutSeconds": 20
  }
}
```

### 2. Search All Objects Tool
```json
{
  "type": "function",
  "function": {
    "name": "salesforce_search_all",
    "description": "Search across multiple Salesforce objects using SOSL for cross-object searches",
    "parameters": {
      "type": "object",
      "properties": {
        "searchTerm": {
          "type": "string",
          "description": "Text to search for across objects (supports wildcards * and ?)"
        },
        "objects": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": {"type": "string", "description": "Object API name"},
              "fields": {
                "type": "array", 
                "items": {"type": "string"},
                "description": "Fields to return"
              },
              "limit": {"type": "number", "description": "Max records per object"}
            },
            "required": ["name", "fields"]
          },
          "description": "Objects to search with their return fields"
        },
        "searchIn": {
          "type": "string",
          "enum": ["ALL FIELDS", "NAME FIELDS", "EMAIL FIELDS", "PHONE FIELDS"],
          "description": "Which field types to search in"
        }
      },
      "required": ["searchTerm", "objects"]
    }
  },
  "server": {
    "url": "https://web-production-1bd9.up.railway.app/mcp",
    "timeoutSeconds": 20
  }
}
```

### 3. Describe Object Tool  
```json
{
  "type": "function",
  "function": {
    "name": "salesforce_describe_object",
    "description": "Get detailed schema metadata for any Salesforce object including fields and relationships",
    "parameters": {
      "type": "object",
      "properties": {
        "objectName": {
          "type": "string",
          "description": "API name of the object to describe (e.g., 'Account', 'Contact', 'Custom_Object__c')"
        }
      },
      "required": ["objectName"]
    }
  },
  "server": {
    "url": "https://web-production-1bd9.up.railway.app/mcp",
    "timeoutSeconds": 20
  }
}
```

### 4. Search Objects Tool
```json
{
  "type": "function", 
  "function": {
    "name": "salesforce_search_objects",
    "description": "Search for Salesforce objects by name pattern to discover available objects",
    "parameters": {
      "type": "object",
      "properties": {
        "searchPattern": {
          "type": "string",
          "description": "Search pattern to find objects (e.g., 'Account' finds AccountHistory, etc.)"
        }
      },
      "required": ["searchPattern"]
    }
  },
  "server": {
    "url": "https://web-production-1bd9.up.railway.app/mcp",
    "timeoutSeconds": 20
  }
}
```

## Server Headers Configuration

All requests to your server must include the authentication header:

```json
{
  "headers": {
    "Authorization": "Bearer salesforce-mcp-token-2024",
    "Content-Type": "application/json"
  }
}
```

## Integration Notes

1. **Authentication**: Server requires Bearer token authentication
2. **CORS**: Properly configured for cross-origin requests
3. **Response Format**: Returns MCP-compliant JSON-RPC responses
4. **Error Handling**: Comprehensive validation and error messages
5. **Tool Validation**: Server validates required parameters correctly

## Test Commands

You can test individual tools using curl:

```bash
# Test query tool
curl -X POST https://web-production-1bd9.up.railway.app/mcp \
  -H "Authorization: Bearer salesforce-mcp-token-2024" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call", 
    "params": {
      "name": "salesforce_query_records",
      "arguments": {
        "objectName": "Account",
        "fields": ["Id", "Name"],
        "limit": 5
      }
    },
    "id": 1
  }'
```

Your Salesforce MCP server is production-ready and fully compatible with Vapi Function Tools! 🚀