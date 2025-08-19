# MCP Server Salesforce - Developer Testing Guide

This guide provides comprehensive instructions for manually testing the MCP Server Salesforce deployment end-to-end.

## Prerequisites

- curl command-line tool
- Web browser for OAuth testing
- Access to Heroku deployment: `https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com`
- NotePilot local development environment (optional)

## Test Suite Overview

The testing covers 5 main areas:
1. Salesforce OAuth Flow
2. Natural Language Processing (Without Authentication)
3. Authenticated Natural Language Queries
4. NotePilot Integration
5. Comprehensive End-to-End Testing

## Test 1: Salesforce OAuth Flow

### Purpose
Verify that the OAuth initiation properly redirects to Salesforce with correct parameters.

### Commands
```bash
# Test OAuth initiation
curl -c cookies.txt -v "https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/auth/salesforce/login?user_id=test_e2e_user"

# Verify server health
curl -X GET "https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/health"
```

### Expected Results
- **OAuth Response**: 302 redirect to `login.salesforce.com` with proper OAuth parameters
- **Health Response**: JSON with `"status":"ok"` and uptime information

### Manual Browser Test
1. Open: `https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/auth/salesforce/login?user_id=manual_test_user`
2. Should redirect to Salesforce login page
3. Complete login to test full OAuth flow
4. Should redirect back to success page

## Test 2: Natural Language Processing (Unauthenticated)

### Purpose
Test the natural language processing endpoint with various query types using fallback analysis.

### Test Cases

#### A. Lead Query Test
```bash
curl -X POST "https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/natural-language" \
  -H "Content-Type: application/json" \
  -d '{"request": "Show me all leads from California", "userId": "test_user", "conversationHistory": []}'
```

**Expected Output:**
```json
{
  "success": true,
  "type": "query",
  "intent": "Query Lead records",
  "toolCall": {
    "name": "salesforce_query_records",
    "arguments": {
      "objectName": "Lead",
      "fields": ["Id", "Name", "Email", "Company", "State"],
      "whereClause": "State = 'CA'",
      "limit": 20
    }
  },
  "explanation": "Query Lead records with conditions: State = 'CA'",
  "soql": "SELECT Id, Name, Email, Company, State FROM Lead WHERE State = 'CA' LIMIT 20",
  "executedAt": "2025-08-19T21:19:41.557Z",
  "executionError": "No Salesforce connection found for session: [SESSION_ID]"
}
```

#### B. Contact Creation Test
```bash
curl -X POST "https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/natural-language" \
  -H "Content-Type: application/json" \
  -d '{"request": "Create a new contact for John Doe at Acme Corp", "userId": "test_user", "conversationHistory": []}'
```

#### C. Complex Query Test
```bash
curl -X POST "https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/natural-language" \
  -H "Content-Type: application/json" \
  -d '{"request": "Show me opportunities closed this month", "userId": "test_user", "conversationHistory": []}'
```

### Validation Criteria
- ✅ `success: true` in response
- ✅ Proper `toolCall` generation with correct `name` and `arguments`
- ✅ Valid SOQL query in `soql` field
- ✅ Appropriate `executionError` for unauthenticated requests
- ✅ ISO timestamp in `executedAt`

## Test 3: Authenticated Natural Language Queries

### Purpose
Test MCP tools endpoint and authentication status functionality.

### Commands
```bash
# Test MCP tools discovery
curl -X GET "https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/mcp/tools" \
  -H "Accept: application/json"

# Test authentication status
curl -X GET "https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/auth/status"
```

### Expected Results

#### MCP Tools Response
```json
{
  "tools": [
    {"name": "salesforce_search_objects", "description": "Search and discover Salesforce objects by name pattern", "category": "discovery"},
    {"name": "salesforce_describe_object", "description": "Get detailed metadata for Salesforce objects including fields and relationships", "category": "metadata"},
    {"name": "salesforce_query_records", "description": "Query Salesforce records with SOQL-like syntax", "category": "data"},
    // ... additional tools
  ],
  "total": 13,
  "categories": {"discovery": 2, "metadata": 3, "data": 2, "development": 6},
  "authentication": {
    "required": true,
    "flow": "OAuth 2.0",
    "loginUrl": "http://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/auth/salesforce/login?user_id={USER_ID}",
    "statusUrl": "http://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/auth/status"
  }
}
```

#### Auth Status Response
```json
{"connected": false}
```

### Full Authentication Flow Test
```bash
# Step 1: Initiate OAuth with cookie capture
curl -c auth_cookies.txt -L "https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/auth/salesforce/login?user_id=test_authenticated_user"

# Step 2: After manual browser OAuth completion, test with cookies
curl -b auth_cookies.txt -X POST "https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/natural-language" \
  -H "Content-Type: application/json" \
  -d '{"request": "Show me opportunities this month", "userId": "test_authenticated_user", "conversationHistory": []}'
```

## Test 4: NotePilot Integration

### Purpose
Verify NotePilot local development integration with MCP server.

### Prerequisites
- NotePilot running on `http://localhost:3000`
- Clerk authentication configured

### Commands
```bash
# Verify NotePilot is running
curl -X GET "http://localhost:3000" --head

# Test Salesforce AI integration endpoint (requires authentication)
curl -X POST "http://localhost:3000/api/salesforce/ai-query" \
  -H "Content-Type: application/json" \
  -d '{"request": "Show me all leads from California", "userId": "test_integration_user", "conversationHistory": []}'

# Test Salesforce tools proxy
curl -X GET "http://localhost:3000/api/salesforce/tools"
```

### Expected Results
- **NotePilot Health**: 200 OK response with proper headers
- **AI Query**: 404 or authentication required (expected for unauthenticated requests)
- **Tools Proxy**: 404 or authentication required (expected for unauthenticated requests)

### Manual UI Testing
1. Open NotePilot in browser: `http://localhost:3000`
2. Sign in with Clerk authentication
3. Create a new document
4. Type "/" to open slash command menu
5. Look for "Salesforce AI Query" option
6. Test with query: "Show me all leads from California"
7. Should trigger OAuth flow if not authenticated
8. Should return results if authenticated

## Test 5: Comprehensive End-to-End Testing

### Purpose
Final validation of all system components working together.

### Test Script
```bash
# Complex natural language query
curl -X POST "https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/natural-language" \
  -H "Content-Type: application/json" \
  -d '{"request": "Show me opportunities worth more than $50,000", "userId": "e2e_test_user", "conversationHistory": []}'

# Verify all MCP tools are available
curl -X GET "https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/mcp/tools" \
  -H "Accept: application/json"

# Test various query types
curl -X POST "https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/natural-language" \
  -H "Content-Type: application/json" \
  -d '{"request": "Update contact John Doe with phone 555-1234", "userId": "e2e_test_user", "conversationHistory": []}'

curl -X POST "https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/natural-language" \
  -H "Content-Type: application/json" \
  -d '{"request": "Search for accounts containing aerospace", "userId": "e2e_test_user", "conversationHistory": []}'
```

### Validation Checklist
- [ ] Health endpoint returns 200 OK
- [ ] Natural language endpoint processes queries correctly
- [ ] All 13 MCP tools are available
- [ ] OAuth flow initiates properly
- [ ] Proper error handling for unauthenticated requests
- [ ] SOQL queries are generated correctly
- [ ] Tool calls have proper structure
- [ ] Timestamps are in ISO format
- [ ] Session handling works correctly
- [ ] NotePilot integration routes exist

## Common Issues and Troubleshooting

### Issue: Natural language endpoint returns 404
**Solution:** Ensure you're using the regular SSO server, not the improved version. Check `Procfile` contains `web: npm run start:sso`.

### Issue: OAuth flow fails
**Solution:** Verify Salesforce OAuth credentials are set in Heroku config vars:
```bash
heroku config -a vuk-salesforce-mcp
```

### Issue: NotePilot integration returns 404
**Solution:** This is expected for unauthenticated requests. The routes require Clerk authentication.

### Issue: Natural language processing returns errors
**Solution:** 
1. Check if `ANTHROPIC_API_KEY` is set (optional - fallback analysis works without it)
2. Verify server health endpoint returns OK
3. Check Heroku logs: `heroku logs --tail -a vuk-salesforce-mcp`

## Performance Expectations

- **Response Time**: < 2 seconds for natural language processing
- **Uptime**: Server should maintain stable uptime with health checks
- **Memory Usage**: ~22MB typical usage
- **Concurrent Requests**: Handles multiple simultaneous requests
- **OAuth Flow**: Redirects should complete in < 5 seconds

## Test Data Examples

### Sample Natural Language Queries
- "Show me all leads from California"
- "Create a new contact for John Doe at Acme Corp"  
- "Show me opportunities closed this month"
- "Update account ABC Corp with phone 555-1234"
- "Search for contacts with email containing gmail"
- "Show me opportunities worth more than $50,000"
- "List all custom fields on the Lead object"
- "Execute apex code to update lead scores"

### Expected Tool Calls
Each query should generate appropriate tool calls like:
- `salesforce_query_records` for data queries
- `salesforce_dml_records` for create/update operations
- `salesforce_search_all` for search operations
- `salesforce_describe_object` for metadata queries

## Monitoring and Logs

### Heroku Logs
```bash
# View real-time logs
heroku logs --tail -a vuk-salesforce-mcp

# View recent logs
heroku logs --num 100 -a vuk-salesforce-mcp
```

### Key Log Messages to Look For
- `Salesforce MCP SSO Server running on port XXXX`
- `OAuth redirect URI: https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/auth/salesforce/callback`
- Natural language processing requests and responses
- Authentication success/failure messages

This comprehensive testing guide ensures all components of the MCP Server Salesforce deployment are working correctly and provides a foundation for ongoing development and debugging.