/**
 * VAPI Wrapper API for Salesforce MCP Server
 * 
 * This wrapper API sits between VAPI and the Salesforce MCP server,
 * handling the JSON-RPC 2.0 protocol conversion automatically.
 */

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { randomUUID } from 'crypto';

const app = express();

// Configuration
const SALESFORCE_MCP_SERVER_URL = process.env.SALESFORCE_MCP_SERVER_URL || 'https://web-production-1bd9.up.railway.app/mcp';
const PORT = process.env.WRAPPER_PORT || 3002;
const REQUEST_TIMEOUT_MS = Number(process.env.MCP_REQUEST_TIMEOUT_MS) || 15000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/**
 * Generate a unique request ID for JSON-RPC calls
 * Uses crypto.randomUUID() with fallbacks for older Node versions
 * @returns {string} A unique string identifier
 */
function generateRequestId() {
  try {
    // Primary: Use crypto.randomUUID() (Node 16+)
    return randomUUID();
  } catch (error) {
    try {
      // Fallback 1: Use require('crypto').randomUUID() for older imports
      const crypto = require('crypto');
      if (crypto.randomUUID) {
        return crypto.randomUUID();
      }
    } catch (fallbackError) {
      // Ignored - proceed to next fallback
    }
    
    // Fallback 2: Generate UUID v4 manually
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

/**
 * Helper function to call Salesforce MCP server with JSON-RPC format
 */
async function callSalesforceMcpTool(toolName, toolArguments) {
  const requestId = generateRequestId();
  const mcpRequest = {
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      name: toolName,
      arguments: toolArguments
    },
    id: requestId
  };

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  console.log(`Calling Salesforce MCP server: ${toolName} (Request ID: ${requestId})`, toolArguments);

  // Set up timeout for the API call
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(SALESFORCE_MCP_SERVER_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(mcpRequest),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Check HTTP status before parsing JSON
    if (!response.ok) {
      throw new Error(`Salesforce MCP server returned HTTP ${response.status}: ${response.statusText}`);
    }

    // Parse JSON response with error handling
    let result;
    try {
      result = await response.json();
    } catch (jsonError) {
      throw new Error(`Salesforce MCP response is not valid JSON (HTTP ${response.status})`);
    }

    // Handle MCP JSON-RPC error responses
    if (result.error) {
      throw new Error(result.error.message || 'Salesforce MCP server error');
    }

    // Extract tool response from MCP result
    // The MCP server returns: { jsonrpc: "2.0", id, result: toolResponse }
    // Where toolResponse has: { content: [{type: "text", text: "..."}], records: [...], metadata: {...}, isError: boolean }
    
    if (result.result) {
      const toolResponse = result.result;
      
      // Extract message from all content segments or use default
      const message = toolResponse.content && toolResponse.content.length > 0
        ? toolResponse.content
            .filter(item => item.type === 'text' && item.text)
            .map(item => item.text)
            .join('\n') || 'Operation completed successfully'
        : 'Operation completed successfully';
      
      // Check if it's an error response
      if (toolResponse.isError) {
        throw new Error(message);
      }
      
      // Return structured response for Vapi
      const vapiResponse = {
        success: true,
        message: message
      };
      
      // Include additional data if available
      if (toolResponse.records) {
        vapiResponse.records = toolResponse.records;
      }
      
      if (toolResponse.metadata) {
        vapiResponse.metadata = toolResponse.metadata;
      }
      
      return vapiResponse;
    }

    throw new Error('Invalid response structure from Salesforce MCP server');
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle timeout errors specifically
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout - Salesforce MCP server did not respond within ${REQUEST_TIMEOUT_MS}ms`);
    }

    throw error;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'vapi-salesforce-mcp-wrapper',
    mcpServer: SALESFORCE_MCP_SERVER_URL,
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to verify request ID generation and correlation
app.get('/test-request-id', (req, res) => {
  const testIds = [];
  
  // Generate 10 test IDs to demonstrate uniqueness
  for (let i = 0; i < 10; i++) {
    testIds.push({
      sequence: i + 1,
      id: generateRequestId(),
      timestamp: new Date().toISOString()
    });
  }
  
  // Check for duplicates
  const uniqueIds = new Set(testIds.map(item => item.id));
  
  res.json({
    status: 'success',
    message: 'Request ID generation test',
    generated: testIds.length,
    unique: uniqueIds.size,
    duplicates: testIds.length - uniqueIds.size,
    allUnique: uniqueIds.size === testIds.length,
    sampleIds: testIds,
    idFormat: 'UUID v4 string',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// SALESFORCE QUERY ENDPOINT
// ============================================
app.post('/api/salesforce-query', async (req, res) => {
  try {
    const { objectName, fields, whereClause, orderBy, limit } = req.body;

    // Validate required fields
    if (!objectName || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: objectName and fields (array)'
      });
    }

    const result = await callSalesforceMcpTool('salesforce_query_records', {
      objectName,
      fields,
      whereClause,
      orderBy,
      limit
    });

    res.json(result);
  } catch (error) {
    console.error('Error in salesforce-query:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// SALESFORCE SEARCH ENDPOINT
// ============================================
app.post('/api/salesforce-search', async (req, res) => {
  try {
    const { searchTerm, objects, searchIn, withClauses } = req.body;

    // Validate required fields
    if (!searchTerm || !Array.isArray(objects) || objects.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: searchTerm and objects (array)'
      });
    }

    const result = await callSalesforceMcpTool('salesforce_search_all', {
      searchTerm,
      searchIn,
      objects,
      withClauses
    });

    res.json(result);
  } catch (error) {
    console.error('Error in salesforce-search:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// SALESFORCE CREATE/UPDATE RECORDS ENDPOINT
// ============================================
app.post('/api/salesforce-dml', async (req, res) => {
  try {
    const { operation, objectName, records, externalIdField } = req.body;

    // Validate required fields
    if (!operation || !objectName || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: operation, objectName, and records (array)'
      });
    }

    // Validate operation type
    const validOperations = ['insert', 'update', 'upsert', 'delete'];
    if (!validOperations.includes(operation.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Invalid operation: ${operation}. Must be one of: ${validOperations.join(', ')}`
      });
    }

    const result = await callSalesforceMcpTool('salesforce_dml_records', {
      operation: operation.toLowerCase(),
      objectName,
      records,
      externalIdField
    });

    res.json(result);
  } catch (error) {
    console.error('Error in salesforce-dml:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// SALESFORCE DESCRIBE OBJECT ENDPOINT
// ============================================
app.post('/api/salesforce-describe', async (req, res) => {
  try {
    const { objectName } = req.body;

    // Validate required fields
    if (!objectName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: objectName'
      });
    }

    const result = await callSalesforceMcpTool('salesforce_describe_object', {
      objectName
    });

    res.json(result);
  } catch (error) {
    console.error('Error in salesforce-describe:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// SALESFORCE SEARCH OBJECTS ENDPOINT
// ============================================
app.post('/api/salesforce-search-objects', async (req, res) => {
  try {
    const { searchPattern } = req.body;

    // Validate required fields
    if (!searchPattern) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: searchPattern'
      });
    }

    const result = await callSalesforceMcpTool('salesforce_search_objects', {
      searchPattern
    });

    res.json(result);
  } catch (error) {
    console.error('Error in salesforce-search-objects:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// SALESFORCE APEX EXECUTION ENDPOINT
// ============================================
app.post('/api/salesforce-apex', async (req, res) => {
  try {
    const { apexCode } = req.body;

    // Validate required fields
    if (!apexCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: apexCode'
      });
    }

    const result = await callSalesforceMcpTool('salesforce_execute_anonymous', {
      apexCode
    });

    res.json(result);
  } catch (error) {
    console.error('Error in salesforce-apex:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log('=================================================');
  console.log(`VAPI-Salesforce MCP Wrapper API running on port ${PORT}`);
  console.log(`Salesforce MCP Server URL: ${SALESFORCE_MCP_SERVER_URL}`);
  console.log('=================================================');
  console.log('\nAvailable endpoints:');
  console.log(`  POST http://localhost:${PORT}/api/salesforce-query`);
  console.log(`  POST http://localhost:${PORT}/api/salesforce-search`);
  console.log(`  POST http://localhost:${PORT}/api/salesforce-dml`);
  console.log(`  POST http://localhost:${PORT}/api/salesforce-describe`);
  console.log(`  POST http://localhost:${PORT}/api/salesforce-search-objects`);
  console.log(`  POST http://localhost:${PORT}/api/salesforce-apex`);
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log(`  GET  http://localhost:${PORT}/test-request-id`);
  console.log('=================================================\n');
});