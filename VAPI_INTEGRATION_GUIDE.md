# 📋 **Salesforce MCP Server - Vapi Function Tool Integration Guide**

## 🎯 **Overview**

This guide provides step-by-step instructions for integrating your Salesforce MCP Server with Vapi using Function Tools. This approach provides reliable REST API endpoints that Vapi can call to access Salesforce data.

---

## 📚 **Table of Contents**

1. [Prerequisites](#prerequisites)
2. [Authentication Setup](#authentication-setup)
3. [Function Tool Configurations](#function-tool-configurations)
4. [System Prompt Configuration](#system-prompt-configuration)
5. [Testing & Validation](#testing--validation)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Usage](#advanced-usage)

---

## 🔧 **Prerequisites**

### **Required Services:**
- ✅ **Salesforce MCP Server** deployed and running
- ✅ **Railway deployment** with proper environment variables
- ✅ **Vapi account** with Function Tool access
- ✅ **Bearer token authentication** configured

### **Server Requirements:**
- **MCP Server URL**: `https://web-production-1bd9.up.railway.app`
- **Authentication**: Bearer token `salesforce-mcp-token-2024`
- **Available Tools**: 13 Salesforce MCP tools

---

## 🔐 **Authentication Setup**

### **1. Verify Server Authentication**

Test your MCP server authentication:

```bash
curl -X POST https://web-production-1bd9.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer salesforce-mcp-token-2024" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
```

**Expected Response:** List of 13 available tools

### **2. Test Salesforce Connection**

Verify Salesforce data access:

```bash
curl -X POST https://web-production-1bd9.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer salesforce-mcp-token-2024" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "salesforce_query_records",
      "arguments": {
        "objectName": "Account",
        "fields": ["Name"],
        "limit": 1
      }
    },
    "id": 2
  }'
```

**Expected Response:** Salesforce Account data

---

## 🛠️ **Function Tool Configurations**

### **Core Function Tool 1: Query Records**

**Use Case:** Retrieve specific Salesforce records with filtering and sorting

```json
{
  "type": "function",
  "function": {
    "name": "salesforce_query_records",
    "description": "Query Salesforce records like Accounts, Contacts, Leads, Opportunities, Cases. Supports filtering, sorting, and field selection.",
    "parameters": {
      "type": "object",
      "properties": {
        "objectName": {
          "type": "string",
          "description": "Salesforce object API name",
          "enum": ["Account", "Contact", "Lead", "Opportunity", "Case", "User", "Task", "Event"]
        },
        "fields": {
          "type": "array",
          "items": {"type": "string"},
          "description": "Fields to retrieve. Standard fields: Name, Email, Phone, CreatedDate, LastModifiedDate. Relationship fields: Account.Name, Owner.Name",
          "minItems": 1
        },
        "whereClause": {
          "type": "string",
          "description": "Optional SOQL WHERE clause for filtering. Examples: 'Industry = \"Technology\"', 'CreatedDate = TODAY', 'Name LIKE \"Acme%\"'"
        },
        "orderBy": {
          "type": "string", 
          "description": "Optional ORDER BY clause. Examples: 'CreatedDate DESC', 'Name ASC', 'LastModifiedDate DESC'"
        },
        "limit": {
          "type": "number",
          "description": "Maximum number of records to return",
          "minimum": 1,
          "maximum": 100,
          "default": 10
        }
      },
      "required": ["objectName", "fields"]
    }
  },
  "server": {
    "url": "https://web-production-1bd9.up.railway.app/tools/salesforce_query_records",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": "Bearer salesforce-mcp-token-2024"
    }
  }
}
```

### **Core Function Tool 2: Cross-Object Search**

**Use Case:** Search across multiple Salesforce objects using keywords

```json
{
  "type": "function",
  "function": {
    "name": "salesforce_search_all", 
    "description": "Search across multiple Salesforce objects using SOSL. Great for finding records when you don't know which object contains the data.",
    "parameters": {
      "type": "object",
      "properties": {
        "searchTerm": {
          "type": "string",
          "description": "Text to search for. Supports wildcards: 'John*', 'Acme Corp', 'john@email.com'",
          "minLength": 2
        },
        "objects": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string",
                "description": "Salesforce object name",
                "enum": ["Account", "Contact", "Lead", "Opportunity", "Case"]
              },
              "fields": {
                "type": "array", 
                "items": {"type": "string"},
                "description": "Fields to return for this object",
                "minItems": 1
              },
              "limit": {
                "type": "number",
                "description": "Max results for this object",
                "minimum": 1,
                "maximum": 50,
                "default": 10
              }
            },
            "required": ["name", "fields"]
          },
          "description": "Objects to search with their return fields",
          "minItems": 1,
          "maxItems": 5
        },
        "searchIn": {
          "type": "string",
          "enum": ["ALL FIELDS", "NAME FIELDS", "EMAIL FIELDS", "PHONE FIELDS"],
          "description": "Where to search for the term",
          "default": "ALL FIELDS"
        }
      },
      "required": ["searchTerm", "objects"]
    }
  },
  "server": {
    "url": "https://web-production-1bd9.up.railway.app/tools/salesforce_search_all",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": "Bearer salesforce-mcp-token-2024"
    }
  }
}
```

### **Utility Function Tool 3: Object Description**

**Use Case:** Discover available fields and relationships for any Salesforce object

```json
{
  "type": "function",
  "function": {
    "name": "salesforce_describe_object",
    "description": "Get comprehensive metadata about a Salesforce object including all fields, types, relationships, and permissions.",
    "parameters": {
      "type": "object", 
      "properties": {
        "objectName": {
          "type": "string",
          "description": "Salesforce object API name (standard or custom)",
          "pattern": "^[a-zA-Z][a-zA-Z0-9_]*(__c)?$"
        }
      },
      "required": ["objectName"]
    }
  },
  "server": {
    "url": "https://web-production-1bd9.up.railway.app/tools/salesforce_describe_object",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": "Bearer salesforce-mcp-token-2024"
    }
  }
}
```

### **Discovery Function Tool 4: Object Search**

**Use Case:** Find available Salesforce objects by name pattern

```json
{
  "type": "function",
  "function": {
    "name": "salesforce_search_objects",
    "description": "Discover available Salesforce objects by searching for name patterns. Useful when exploring the org structure.",
    "parameters": {
      "type": "object",
      "properties": {
        "searchPattern": {
          "type": "string",
          "description": "Pattern to search for in object names. Examples: 'Account' finds Account-related objects, 'Custom' finds custom objects",
          "minLength": 2
        }
      },
      "required": ["searchPattern"]
    }
  },
  "server": {
    "url": "https://web-production-1bd9.up.railway.app/tools/salesforce_search_objects",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": "Bearer salesforce-mcp-token-2024"
    }
  }
}
```

---

## 🎯 **System Prompt Configuration**

### **Comprehensive Assistant Prompt**

```markdown
[Identity]
You are a Salesforce-powered sales assistant with comprehensive access to Salesforce data through specialized function tools. You help users query, search, and understand their Salesforce data.

[Available Function Tools & Usage]

**salesforce_query_records**: Query specific objects with precise filtering
- Use for: "Show me accounts", "Find recent leads", "Get contact details"
- Required: objectName, fields
- Optional: whereClause, orderBy, limit
- Examples:
  * Recent accounts: objectName="Account", fields=["Name","Phone","Industry"], orderBy="CreatedDate DESC", limit=5
  * Specific contact: objectName="Contact", fields=["Name","Email","Phone"], whereClause="Email = 'john@example.com'"

**salesforce_search_all**: Cross-object keyword search
- Use for: "Find anyone named John", "Search for Acme Corp", "Look up this email"
- Required: searchTerm, objects array
- Example: searchTerm="John", objects=[{name:"Contact", fields:["Name","Email"]}, {name:"Lead", fields:["Name","Company"]}]

**salesforce_describe_object**: Get object schema information
- Use for: "What fields does Account have?", "Show me Contact object structure"
- Required: objectName
- Example: objectName="Account"

**salesforce_search_objects**: Discover available objects
- Use for: "What objects are available?", "Find custom objects"
- Required: searchPattern
- Example: searchPattern="Custom"

[Response Guidelines]

**Query Patterns:**
- "Most recent [object]" → Use salesforce_query_records with orderBy="CreatedDate DESC", limit=1
- "Find [name/term]" → Use salesforce_search_all across relevant objects
- "Show me [object] details" → Use salesforce_query_records with comprehensive fields
- "What fields does [object] have" → Use salesforce_describe_object

**Field Selection Best Practices:**
- Always include: Name/Title, CreatedDate, Id
- For Contacts: Name, Email, Phone, Account.Name
- For Accounts: Name, Phone, Industry, Owner.Name
- For Leads: Name, Email, Company, Status
- For Opportunities: Name, Amount, StageName, Account.Name

**Response Formatting:**
- Present data in user-friendly tables or lists
- Include relevant context (creation dates, relationships)
- Highlight key information (names, amounts, statuses)
- Offer follow-up actions when appropriate

[Task Flow Examples]

**User**: "Show me the most recent account record"
**Action**: 
```json
salesforce_query_records({
  objectName: "Account",
  fields: ["Name", "Phone", "Industry", "CreatedDate", "Owner.Name"],
  orderBy: "CreatedDate DESC",
  limit: 1
})
```

**User**: "Find contacts for John Smith"
**Action**:
```json
salesforce_search_all({
  searchTerm: "John Smith",
  objects: [{
    name: "Contact",
    fields: ["Name", "Email", "Phone", "Account.Name"],
    limit: 10
  }]
})
```

**User**: "What information do we store about leads?"
**Action**:
```json
salesforce_describe_object({
  objectName: "Lead"
})
```

[Error Handling]
- If tools return errors, explain in simple terms and suggest alternatives
- For unclear requests, ask specific clarifying questions
- Always acknowledge data limitations or access issues
- Suggest related queries that might be helpful

[Security & Privacy]
- Never expose sensitive authentication details
- Respect data access permissions returned by Salesforce
- Don't suggest modifications to data without explicit user request
- Maintain professional handling of customer information
```

---

## ✅ **Testing & Validation**

### **1. Individual Tool Testing**

Test each Function Tool independently:

```javascript
// Test Query Records
{
  "objectName": "Account",
  "fields": ["Name", "Phone"],
  "limit": 3
}

// Test Search All
{
  "searchTerm": "test",
  "objects": [{
    "name": "Account",
    "fields": ["Name"],
    "limit": 5
  }]
}

// Test Describe Object
{
  "objectName": "Contact"
}

// Test Search Objects
{
  "searchPattern": "Account"
}
```

### **2. Integration Testing Scenarios**

**Scenario 1: Recent Records**
- User: "Show me recent accounts"
- Expected: salesforce_query_records call with CreatedDate DESC

**Scenario 2: Search by Name**
- User: "Find John Smith"
- Expected: salesforce_search_all across Contact/Lead objects

**Scenario 3: Object Discovery**
- User: "What fields does Account have?"
- Expected: salesforce_describe_object for Account

### **3. Validation Checklist**

- [ ] All 4 Function Tools configured correctly
- [ ] Bearer token authentication included
- [ ] System prompt updated with examples
- [ ] Tool calls returning proper data
- [ ] Error handling working correctly
- [ ] Response formatting user-friendly

---

## 🚨 **Troubleshooting**

### **Common Issues & Solutions**

| **Issue** | **Symptom** | **Solution** |
|-----------|-------------|--------------|
| **Authentication Error** | "Invalid or missing authentication token" | Verify `Authorization: Bearer salesforce-mcp-token-2024` header |
| **Tool Not Found** | "Method not found" | Check tool name spelling and URL path |
| **Salesforce Login Error** | "INVALID_LOGIN" | Verify Salesforce credentials in Railway environment variables |
| **No Data Returned** | Empty results | Check object permissions and data existence |
| **Function Not Called** | Assistant doesn't use tools | Review system prompt and tool descriptions |

### **Debug Commands**

```bash
# Test server health
curl https://web-production-1bd9.up.railway.app/health

# Test authentication
curl -H "Authorization: Bearer salesforce-mcp-token-2024" \
     https://web-production-1bd9.up.railway.app/tools

# Test specific tool
curl -X POST https://web-production-1bd9.up.railway.app/mcp \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer salesforce-mcp-token-2024" \
     -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"salesforce_query_records","arguments":{"objectName":"Account","fields":["Name"],"limit":1}},"id":1}'
```

---

## 🚀 **Advanced Usage**

### **1. Custom Field Handling**

For custom fields, use the API name with `__c` suffix:

```json
{
  "objectName": "Account",
  "fields": ["Name", "Custom_Field__c", "Another_Custom__c"]
}
```

### **2. Relationship Queries**

Access related object data using dot notation:

```json
{
  "objectName": "Contact",
  "fields": ["Name", "Account.Name", "Account.Industry", "Owner.Name"]
}
```

### **3. Advanced Filtering**

Use SOQL WHERE clauses for complex filtering:

```json
{
  "objectName": "Opportunity",
  "fields": ["Name", "Amount", "StageName"],
  "whereClause": "Amount > 10000 AND StageName = 'Closed Won'",
  "orderBy": "Amount DESC"
}
```

### **4. Bulk Operations**

For large datasets, use pagination:

```json
{
  "objectName": "Account",
  "fields": ["Name", "Industry"],
  "limit": 100,
  "orderBy": "CreatedDate DESC"
}
```

---

## 📖 **Additional Resources**

- **Salesforce SOQL Reference**: [SOQL Documentation](https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/)
- **MCP Server Repository**: Your GitHub repo with full source code
- **Railway Dashboard**: Monitor deployments and logs
- **Vapi Documentation**: Function Tool configuration guides

---

## 🎯 **Quick Start Summary**

1. **Verify Prerequisites**: Server running, authentication working
2. **Copy Function Tools**: Use the 4 JSON configurations above
3. **Update System Prompt**: Use the comprehensive prompt provided
4. **Test Integration**: Try "Show me recent accounts"
5. **Debug if Needed**: Use troubleshooting section

Your Salesforce MCP Server is now fully integrated with Vapi! 🎉