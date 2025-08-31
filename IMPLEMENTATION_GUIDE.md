# Salesforce MCP Server with Natural Language Processing - Implementation Guide

## Overview

This document provides a complete implementation guide for building an MCP (Model Context Protocol) server that connects to Salesforce with natural language processing capabilities. The system allows users to ask questions in plain English and receive formatted Salesforce data that can be inserted directly into documents.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   NotePilot     │    │   MCP Server    │    │   Claude API    │    │   Salesforce    │
│   Frontend      │◄──►│   (Express)     │◄──►│   (Sonnet 4)    │    │   (REST API)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │                        │
        │                        │                        │                        │
    ┌───▼────┐              ┌────▼────┐              ┌────▼────┐              ┌────▼────┐
    │ Auth   │              │ OAuth   │              │ Natural │              │ SOQL    │
    │ UI     │              │ Flow    │              │ Lang    │              │ Query   │
    │        │              │         │              │ Process │              │ Engine  │
    └────────┘              └─────────┘              └─────────┘              └─────────┘
```

## Key Components

### 1. Authentication System
- **OAuth 2.0 Flow**: Salesforce Connected App integration
- **Token Management**: In-memory storage with refresh capabilities
- **Session Handling**: Express sessions with CSRF protection

### 2. Natural Language Processing
- **Claude Sonnet 4**: AI model for understanding user intent
- **SOQL Generation**: Converts natural language to Salesforce queries
- **Tool Mapping**: Maps user requests to appropriate MCP tools

### 3. Data Execution Engine
- **JSForce Integration**: Salesforce API connectivity
- **Query Execution**: Real-time SOQL query execution
- **Data Formatting**: Business-friendly markdown table output

### 4. Client Integration
- **NotePilot UI**: React-based modal interface
- **Document Insertion**: Formatted results ready for text editors
- **Real-time Feedback**: Success/error status with explanations

## Implementation Details

### Core Files Structure

```
mcp-server-salesforce/
├── src/
│   ├── sso-server.ts              # Main server with natural language endpoint
│   ├── services/
│   │   └── naturalLanguageProcessor.ts  # Claude AI integration
│   ├── utils/
│   │   ├── connection.ts          # Salesforce connection management
│   │   ├── tokenStore.ts          # OAuth token storage
│   │   └── salesforceOAuth.ts     # OAuth flow implementation
│   └── tools/
│       ├── query.ts               # SOQL query execution
│       ├── describe.ts            # Object metadata retrieval
│       ├── dml.ts                 # Data manipulation operations
│       └── [other tools]
├── dist/                          # Compiled JavaScript (CommonJS)
├── package.json                   # Dependencies and scripts
└── Procfile                       # Heroku deployment configuration
```

### Client Integration Files

```
notepad/
├── components/
│   └── salesforce-ai-modal.tsx    # AI Assistant UI component
├── app/api/salesforce/
│   ├── route.ts                   # OAuth URL generation
│   ├── callback/route.ts          # OAuth callback handler
│   └── ai-query/route.ts          # Natural language query router
└── lib/mcp-servers/
    └── salesforce-server.ts       # MCP client implementation
```

## Step-by-Step Implementation

### Phase 1: Core MCP Server Setup

#### 1.1 Server Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "express-session": "^1.17.3",
    "jsforce": "^1.11.0",
    "node-fetch": "^3.3.2",
    "uuid": "^9.0.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0"
  }
}
```

#### 1.2 Environment Variables

```bash
# Salesforce Connected App
SALESFORCE_CLIENT_ID=your_client_id
SALESFORCE_CLIENT_SECRET=your_client_secret
SALESFORCE_REDIRECT_URI=https://your-server.herokuapp.com/auth/salesforce/callback

# Claude AI API
ANTHROPIC_API_KEY=sk-ant-api03-...

# Server Configuration
PORT=3000
NODE_ENV=production
SESSION_SECRET=your_session_secret
```

#### 1.3 Core Server Structure

```typescript
// src/sso-server.ts
import express from 'express';
import session from 'express-session';
import { NaturalLanguageProcessor } from './services/naturalLanguageProcessor.js';

const app = express();
const nlProcessor = new NaturalLanguageProcessor();

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Natural language processing endpoint
app.post('/natural-language', async (req, res) => {
  // Implementation details below...
});
```

### Phase 2: Authentication Implementation

#### 2.1 OAuth Flow Setup

```typescript
// src/utils/salesforceOAuth.ts
export class SalesforceOAuth {
  generateAuthUrl(userId: string, returnUrl: string): string {
    const state = uuidv4();
    // Store state with user info
    this.stateStore.set(state, { userId, returnUrl, timestamp: Date.now() });
    
    return `https://login.salesforce.com/services/oauth2/authorize?` +
      `response_type=code&` +
      `client_id=${process.env.SALESFORCE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(process.env.SALESFORCE_REDIRECT_URI!)}&` +
      `scope=full refresh_token&` +
      `state=${state}&` +
      `prompt=login consent`;
  }

  async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    const response = await fetch('https://login.salesforce.com/services/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.SALESFORCE_CLIENT_ID!,
        client_secret: process.env.SALESFORCE_CLIENT_SECRET!,
        redirect_uri: process.env.SALESFORCE_REDIRECT_URI!,
        code
      })
    });
    
    return await response.json();
  }
}
```

#### 2.2 Token Storage

```typescript
// src/utils/tokenStore.ts
export interface SalesforceToken {
  userId: string;
  accessToken: string;
  refreshToken: string;
  instanceUrl: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface UserConnection {
  userId: string;
  sessionId: string;
  tokens: SalesforceToken;
  lastUsed: Date;
}

class TokenStore {
  private connections: Map<string, UserConnection> = new Map();
  private userTokens: Map<string, string> = new Map(); // userId -> connectionId

  storeConnection(userId: string, sessionId: string, tokens: Omit<SalesforceToken, 'userId'>): string {
    const connectionId = uuidv4();
    const connection: UserConnection = {
      userId,
      sessionId,
      tokens: { ...tokens, userId },
      lastUsed: new Date()
    };

    this.connections.set(connectionId, connection);
    this.userTokens.set(userId, connectionId);
    return connectionId;
  }

  getConnectionByUserId(userId: string): UserConnection | null {
    const connectionId = this.userTokens.get(userId);
    if (!connectionId) return null;
    
    const connection = this.connections.get(connectionId);
    if (!connection) return null;
    
    connection.lastUsed = new Date();
    return connection;
  }
}

export const tokenStore = new TokenStore();
```

### Phase 3: Natural Language Processing

#### 3.1 Claude API Integration

```typescript
// src/services/naturalLanguageProcessor.ts
export class NaturalLanguageProcessor {
  private claudeApiKey: string;

  constructor() {
    this.claudeApiKey = process.env.ANTHROPIC_API_KEY || '';
  }

  async processNaturalLanguageRequest(nlRequest: NaturalLanguageRequest): Promise<NaturalLanguageResponse> {
    try {
      const analysis = await this.analyzeRequest(nlRequest);
      return {
        success: true,
        type: analysis.type,
        intent: analysis.intent,
        toolCall: analysis.toolCall,
        explanation: analysis.explanation,
        soql: analysis.soql,
        apex: analysis.apex,
        executedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        type: 'query',
        intent: 'Error processing request',
        error: error instanceof Error ? error.message : 'Failed to process natural language request',
        executedAt: new Date().toISOString()
      };
    }
  }

  private async callClaudeAPI(systemPrompt: string, userPrompt: string) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    const result = await response.json();
    const content = result.content?.[0]?.text;
    
    if (!content) {
      throw new Error('No response from Claude API');
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Could not parse Claude response as JSON');
  }
}
```

#### 3.2 System Prompt for Salesforce

```typescript
const systemPrompt = `You are a Salesforce MCP (Model Context Protocol) server assistant. Your job is to analyze natural language requests and convert them to structured MCP tool calls.

Available MCP Tools:
1. salesforce_search_objects - Search for Salesforce objects by pattern
2. salesforce_describe_object - Get object metadata and fields
3. salesforce_query_records - Execute SOQL queries for data retrieval
4. salesforce_dml_records - Insert/update/delete/upsert operations
5. salesforce_search_all - SOSL search across multiple objects

Analyze the user request and respond with a JSON object containing:
{
  "type": "query" | "apex" | "metadata" | "dml",
  "intent": "brief description of what user wants",
  "toolCall": {
    "name": "salesforce_tool_name",
    "arguments": { /* structured arguments for the tool */ }
  },
  "explanation": "brief explanation of what will be done",
  "soql": "generated SOQL if applicable"
}

Guidelines:
- "query" for data retrieval (use salesforce_query_records)
- "apex" for code generation (use salesforce_write_apex)
- "metadata" for object/field information (use salesforce_describe_object)
- "dml" for data manipulation (use salesforce_dml_records)

Common Salesforce objects: Account, Contact, Lead, Opportunity, Case, User, Task, Event
Standard fields: Id, Name, Email, Phone, CreatedDate, LastModifiedDate`;
```

### Phase 4: Tool Execution Engine

#### 4.1 JSForce Connection Setup

```typescript
// src/utils/connection.ts
export async function createUserSalesforceConnection(userId: string): Promise<jsforce> {
  const userConnection = tokenStore.getConnectionByUserId(userId);
  
  if (!userConnection) {
    throw new Error(`No Salesforce connection found for user: ${userId}`);
  }

  const jsforce = require('jsforce');
  const conn = new jsforce.Connection({
    instanceUrl: userConnection.tokens.instanceUrl,
    accessToken: userConnection.tokens.accessToken,
    refreshToken: userConnection.tokens.refreshToken,
    oauth2: {
      clientId: process.env.SALESFORCE_CLIENT_ID,
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
      redirectUri: process.env.SALESFORCE_REDIRECT_URI
    }
  });

  // Set up automatic token refresh
  conn.on('refresh', (accessToken: string, res: any) => {
    tokenStore.updateTokens(userId, {
      accessToken,
      expiresAt: new Date(Date.now() + (res.expires_in * 1000))
    });
  });

  return conn;
}
```

#### 4.2 Query Tool Implementation

```typescript
// src/tools/query.ts
export async function handleQueryRecords(conn: jsforce, args: QueryArgs): Promise<any> {
  try {
    const { objectName, fields, whereClause, orderBy, limit } = args;
    
    // Build SOQL query
    let soql = `SELECT ${fields.join(', ')} FROM ${objectName}`;
    
    if (whereClause) {
      soql += ` WHERE ${whereClause}`;
    }
    
    if (orderBy) {
      soql += ` ORDER BY ${orderBy}`;
    }
    
    if (limit) {
      soql += ` LIMIT ${limit}`;
    }

    // Execute query
    const result = await conn.query(soql);

    // Return structured data with both formatted text and raw records
    return {
      content: [{
        type: "text",
        text: `Query returned ${result.records.length} records`
      }],
      records: result.records,
      metadata: result,
      isError: false,
    };
  } catch (error) {
    return {
      content: [{
        type: "text", 
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true,
    };
  }
}
```

#### 4.3 Tool Execution Router

```typescript
// src/sso-server.ts
async function executeTool(conn: jsforce, toolName: string, args: any) {
  let result;
  
  switch (toolName) {
    case "salesforce_query_records": {
      const validatedArgs: QueryArgs = {
        objectName: args.objectName,
        fields: args.fields,
        whereClause: args.whereClause,
        orderBy: args.orderBy,
        limit: args.limit
      };
      result = await handleQueryRecords(conn, validatedArgs);
      return {
        records: result.records || [],
        metadata: result.metadata,
        rawResult: result
      };
    }
    
    case "salesforce_describe_object": {
      result = await handleDescribeObject(conn, args.objectName);
      return { metadata: result };
    }
    
    // Add other tools...
    default:
      throw new Error(`Tool ${toolName} not implemented`);
  }
}
```

### Phase 5: Natural Language Endpoint

#### 5.1 Main Processing Logic

```typescript
// src/sso-server.ts
app.post('/natural-language', async (req, res) => {
  try {
    const { request: userRequest, userId, conversationHistory } = req.body;
    
    if (!userRequest || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Request and userId are required'
      });
    }

    // Process natural language request with Claude
    const nlResponse = await nlProcessor.processNaturalLanguageRequest({
      request: userRequest,
      userId,
      conversationHistory
    });

    // If analysis successful and we have a tool call, execute it
    if (nlResponse.success && nlResponse.toolCall) {
      try {
        // Check if user has active connection
        if (!tokenStore.hasActiveConnection(userId)) {
          return res.json({
            ...nlResponse,
            error: 'Salesforce connection not found for user. Please complete OAuth flow first.',
            executionSkipped: true
          });
        }

        // Get Salesforce connection using userId
        const conn = await createUserSalesforceConnection(userId);
        
        // Execute the tool call
        const toolResult = await executeTool(conn, nlResponse.toolCall.name, nlResponse.toolCall.arguments);
        
        // Format results for document insertion
        let formattedResponse = {
          ...nlResponse,
          records: toolResult.records,
          metadata: toolResult.metadata,
          executionResult: toolResult
        };

        // Generate business-friendly formatted results
        if (toolResult.records && Array.isArray(toolResult.records)) {
          const recordCount = toolResult.records.length;
          let resultsText = `## ${nlResponse.intent}\n\n`;
          resultsText += `**Found ${recordCount} record${recordCount !== 1 ? 's' : ''}:**\n\n`;
          
          if (recordCount > 0) {
            const displayCount = Math.min(recordCount, 10);
            
            // Get field names (excluding attributes)
            const firstRecord = toolResult.records[0];
            const fields = Object.keys(firstRecord).filter(key => key !== 'attributes');
            
            // Create markdown table
            if (fields.length > 0) {
              // Table header
              resultsText += `| ${fields.join(' | ')} |\n`;
              resultsText += `|${fields.map(() => '---').join('|')}|\n`;
              
              // Table rows
              toolResult.records.slice(0, displayCount).forEach((record) => {
                const values = fields.map(field => {
                  const value = record[field];
                  if (value === null || value === undefined) return '';
                  if (typeof value === 'object') return JSON.stringify(value);
                  return String(value).replace(/\|/g, '\\|'); // Escape pipes
                });
                resultsText += `| ${values.join(' | ')} |\n`;
              });
              
              if (recordCount > displayCount) {
                resultsText += `\n*Showing first ${displayCount} of ${recordCount} records*\n`;
              }
            }
          }
          
          resultsText += `\n**Query:** \`${nlResponse.soql || 'N/A'}\`\n`;
          resultsText += `\n*Generated by Salesforce AI Assistant on ${new Date().toLocaleString()}*`;
          
          formattedResponse.formattedResults = resultsText;
        }
        
        return res.json(formattedResponse);

      } catch (executionError) {
        console.error('Tool execution error:', executionError);
        return res.json({
          ...nlResponse,
          executionError: executionError instanceof Error ? executionError.message : 'Tool execution failed'
        });
      }
    }

    // Return just the analysis if no tool call or analysis failed
    return res.json(nlResponse);

  } catch (error) {
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
```

### Phase 6: Client Integration

#### 6.1 React UI Component

```typescript
// components/salesforce-ai-modal.tsx
interface SalesforceResponse {
  success: boolean;
  type: 'query' | 'apex' | 'report' | 'metadata';
  request: string;
  soql?: string;
  apex?: string;
  records?: any[];
  metadata?: any;
  explanation?: string;
  error?: string;
  executedAt?: string;
  formattedResults?: string;
}

export function SalesforceAIModal({ isOpen, onClose, onInsertContent }: Props) {
  const [request, setRequest] = useState('');
  const [response, setResponse] = useState<SalesforceResponse | null>(null);

  const processRequest = async () => {
    const response = await fetch('/api/salesforce/ai-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        request: request.trim(),
        conversationHistory: conversationHistory.slice(-3)
      })
    });
    
    const result = await response.json();
    setResponse(result);
  };

  const insertResult = () => {
    if (!response) return;
    
    let content: string;
    
    // Use formatted results if available, otherwise fall back to manual formatting
    if (response.success && response.formattedResults) {
      content = response.formattedResults;
    } else {
      // Fallback formatting logic...
    }
    
    onInsertContent(content);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* UI components for input, display, and insertion */}
      
      {/* Display formatted results */}
      {response?.formattedResults && (
        <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
          <div className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
            📊 Query Results (Ready to Insert)
          </div>
          <div className="text-green-800 dark:text-green-200 text-sm whitespace-pre-wrap font-mono max-h-64 overflow-auto">
            {response.formattedResults}
          </div>
        </div>
      )}
    </Dialog>
  );
}
```

#### 6.2 API Route Handler

```typescript
// app/api/salesforce/ai-query/route.ts
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { request: userRequest, conversationHistory = [] } = await request.json();

    // Get user's Salesforce integration from database
    const integration = await convex.query(api.salesforceIntegrations.getUserSalesforceIntegration, {
      userId
    });

    if (!integration?.isActive) {
      return NextResponse.json({ 
        success: false, 
        error: 'Salesforce integration not found or inactive.' 
      }, { status: 400 });
    }

    // Send request to MCP server
    const mcpResponse = await fetch(`${integration.mcpServerUrl}/natural-language`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        request: userRequest,
        userId: userId,
        conversationHistory: conversationHistory || []
      })
    });

    const result = await mcpResponse.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Salesforce AI query error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
```

## Deployment Configuration

### Heroku Setup

```bash
# Procfile
web: npm run start:sso

# package.json scripts
{
  "scripts": {
    "start:sso": "node dist/sso-server.cjs",
    "build": "tsc --outDir dist --module commonjs --target es2018",
    "heroku-postbuild": "npm run build"
  }
}
```

### Environment Configuration

```bash
# Set Heroku config vars
heroku config:set SALESFORCE_CLIENT_ID=your_client_id
heroku config:set SALESFORCE_CLIENT_SECRET=your_client_secret
heroku config:set SALESFORCE_REDIRECT_URI=https://your-app.herokuapp.com/auth/salesforce/callback
heroku config:set ANTHROPIC_API_KEY=sk-ant-api03-...
heroku config:set SESSION_SECRET=your_random_secret
heroku config:set NODE_ENV=production
```

## Critical Implementation Notes

### 1. JSForce Compatibility Issues

**Problem**: JSForce v1.11.0 has CommonJS/ESM import issues in compiled code.

**Solution**: Use direct require and proper constructor:
```javascript
const jsforce = require('jsforce');
const conn = new jsforce.Connection({
  // OAuth2 configuration required for refresh tokens
  oauth2: {
    clientId: process.env.SALESFORCE_CLIENT_ID,
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
    redirectUri: process.env.SALESFORCE_REDIRECT_URI
  }
});
```

### 2. Data Structure Consistency

**Problem**: Different tools return different data structures, breaking the natural language endpoint.

**Solution**: Ensure consistent return structures:
```typescript
// Query tool returns
{ records: [], metadata: {}, content: [] }

// executeTool returns  
{ records: [], metadata: {}, rawResult: {} }

// Natural language endpoint expects
{ records: [], metadata: {}, formattedResults: string }
```

### 3. Token Storage Limitations

**Problem**: In-memory token storage loses connections on server restarts.

**Solution for Production**: Implement persistent storage (Redis, database) for the TokenStore class.

### 4. Error Handling Strategy

**Problem**: Complex error propagation through multiple layers.

**Solution**: Implement comprehensive error handling at each layer:
- Tool execution errors
- JSForce connection errors  
- Claude API errors
- Authentication errors

## Testing and Validation

### 1. End-to-End Testing Flow

```bash
# 1. Test OAuth flow
GET /auth/salesforce/login?user_id=test&return_url=callback

# 2. Test natural language processing
POST /natural-language
{
  "request": "Show me all leads created today",
  "userId": "test-user-id"
}

# 3. Validate response structure
{
  "success": true,
  "type": "query", 
  "soql": "SELECT ...",
  "records": [...],
  "formattedResults": "## Query results..."
}
```

### 2. Common Issues and Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| JSForce constructor error | "is not a constructor" | Use `require('jsforce')` and `jsforce.Connection` |
| No records returned | Empty response despite success | Check data structure consistency |
| Authentication expired | "No active connection" | Re-authenticate user |
| Claude API errors | "Not Found" model | Update to current model name |
| Raw JSON display | UI shows JSON instead of table | Check `formattedResults` field |

## Extension Guidelines

### Adding New Tools

1. **Create tool handler** in `/src/tools/new-tool.ts`
2. **Add to executeTool switch** in `/src/sso-server.ts`  
3. **Update Claude system prompt** with new tool description
4. **Ensure consistent return structure** with records/metadata fields

### Supporting Additional Objects

1. **Update Claude prompt** with new object information
2. **Test field mappings** for the new object type
3. **Add example queries** to the system prompt
4. **Validate data formatting** for object-specific fields

### Multi-tenant Support

1. **Replace in-memory storage** with persistent database
2. **Add organization isolation** in token storage
3. **Implement connection pooling** for multiple orgs
4. **Add org-specific error handling**

## Security Considerations

1. **Token Security**: Store refresh tokens securely, rotate regularly
2. **Input Validation**: Sanitize all user inputs before SOQL generation
3. **SOQL Injection**: Use parameterized queries where possible
4. **Rate Limiting**: Implement API rate limiting for Claude and Salesforce
5. **Session Management**: Secure session handling with proper expiration

## Performance Optimization

1. **Connection Pooling**: Reuse JSForce connections when possible
2. **Query Optimization**: Limit result sets, use selective fields
3. **Caching**: Cache frequently accessed metadata
4. **Async Processing**: Use proper async/await patterns throughout
5. **Error Recovery**: Implement retry logic for transient failures

This implementation guide provides a complete foundation for building similar MCP servers with natural language processing capabilities for other systems and APIs.