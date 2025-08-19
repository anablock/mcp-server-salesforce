import fetch from 'node-fetch';
export class NaturalLanguageProcessor {
    constructor() {
        this.claudeApiKey = process.env.ANTHROPIC_API_KEY || '';
        if (!this.claudeApiKey) {
            console.warn('ANTHROPIC_API_KEY not set - natural language processing will be limited');
        }
    }
    async processNaturalLanguageRequest(nlRequest) {
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
        }
        catch (error) {
            console.error('Natural language processing error:', error);
            return {
                success: false,
                type: 'query',
                intent: 'Error processing request',
                error: error instanceof Error ? error.message : 'Failed to process natural language request',
                executedAt: new Date().toISOString()
            };
        }
    }
    async analyzeRequest(nlRequest) {
        // Build context from conversation history
        const context = nlRequest.conversationHistory && nlRequest.conversationHistory.length > 0
            ? `Previous conversation:\n${nlRequest.conversationHistory.map(item => `User: ${item.request}\nResult: ${item.response.success ? 'Success' : 'Error'}`).join('\n')}\n\n`
            : '';
        const systemPrompt = `You are a Salesforce MCP (Model Context Protocol) server assistant. Your job is to analyze natural language requests and convert them to structured MCP tool calls.

Available MCP Tools:
1. salesforce_search_objects - Search for Salesforce objects by pattern
2. salesforce_describe_object - Get object metadata and fields
3. salesforce_query_records - Execute SOQL queries for data retrieval
4. salesforce_dml_records - Insert/update/delete/upsert operations
5. salesforce_manage_object - Create/update custom objects
6. salesforce_manage_field - Create/update fields
7. salesforce_search_all - SOSL search across multiple objects
8. salesforce_read_apex - Read Apex class source code
9. salesforce_write_apex - Create/update Apex classes
10. salesforce_read_apex_trigger - Read Apex trigger source
11. salesforce_write_apex_trigger - Create/update Apex triggers
12. salesforce_execute_anonymous - Execute anonymous Apex code
13. salesforce_manage_debug_logs - Debug log management

Analyze the user request and respond with a JSON object containing:
{
  "type": "query" | "apex" | "metadata" | "dml",
  "intent": "brief description of what user wants",
  "toolCall": {
    "name": "salesforce_tool_name",
    "arguments": { /* structured arguments for the tool */ }
  },
  "explanation": "brief explanation of what will be done",
  "soql": "generated SOQL if applicable",
  "apex": "generated Apex code if applicable"
}

Guidelines:
- "query" for data retrieval (use salesforce_query_records)
- "apex" for code generation (use salesforce_write_apex or salesforce_write_apex_trigger)
- "metadata" for object/field information (use salesforce_describe_object)
- "dml" for data manipulation (use salesforce_dml_records)

Common Salesforce objects: Account, Contact, Lead, Opportunity, Case, User, Task, Event
Standard fields: Id, Name, Email, Phone, CreatedDate, LastModifiedDate

Examples:
"Show leads in California" → 
{
  "type": "query",
  "intent": "Query leads in California",
  "toolCall": {
    "name": "salesforce_query_records",
    "arguments": {
      "objectName": "Lead",
      "fields": ["Id", "Name", "State", "Email", "Company"],
      "whereClause": "State = 'CA'",
      "limit": 20
    }
  },
  "soql": "SELECT Id, Name, State, Email, Company FROM Lead WHERE State = 'CA' LIMIT 20"
}

"Create trigger on Account" → 
{
  "type": "apex",
  "intent": "Create Account trigger",
  "toolCall": {
    "name": "salesforce_write_apex_trigger",
    "arguments": {
      "triggerName": "AccountTrigger",
      "objectName": "Account",
      "events": ["before insert", "before update"],
      "body": "trigger AccountTrigger on Account (before insert, before update) {\\n    for (Account acc : Trigger.new) {\\n        // Add trigger logic here\\n    }\\n}"
    }
  },
  "apex": "trigger AccountTrigger on Account (before insert, before update) {\\n    for (Account acc : Trigger.new) {\\n        // Add trigger logic here\\n    }\\n}"
}`;
        const userPrompt = `${context}Current user request: "${nlRequest.request}"

Analyze this request and provide the structured JSON response.`;
        if (this.claudeApiKey) {
            // Use Claude API for analysis
            return await this.callClaudeAPI(systemPrompt, userPrompt);
        }
        else {
            // Fallback to rule-based analysis
            return this.fallbackAnalysis(nlRequest.request);
        }
    }
    async callClaudeAPI(systemPrompt, userPrompt) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.claudeApiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 1000,
                system: systemPrompt,
                messages: [
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ]
            })
        });
        if (!response.ok) {
            throw new Error(`Claude API error: ${response.statusText}`);
        }
        const result = await response.json();
        const content = result.content?.[0]?.text;
        if (!content) {
            throw new Error('No response from Claude API');
        }
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error('Could not parse Claude response as JSON');
    }
    fallbackAnalysis(request) {
        const lowerRequest = request.toLowerCase();
        // Determine objects mentioned
        const objects = [];
        if (lowerRequest.includes('account'))
            objects.push('Account');
        if (lowerRequest.includes('contact'))
            objects.push('Contact');
        if (lowerRequest.includes('lead'))
            objects.push('Lead');
        if (lowerRequest.includes('opportunity') || lowerRequest.includes('opp'))
            objects.push('Opportunity');
        if (lowerRequest.includes('case'))
            objects.push('Case');
        const primaryObject = objects[0] || 'Account';
        // Determine action type
        if (lowerRequest.includes('trigger') || lowerRequest.includes('apex')) {
            return {
                type: 'apex',
                intent: `Create ${primaryObject} trigger`,
                toolCall: {
                    name: 'salesforce_write_apex_trigger',
                    arguments: {
                        triggerName: `${primaryObject}Trigger`,
                        objectName: primaryObject,
                        events: ['before insert', 'before update'],
                        body: `trigger ${primaryObject}Trigger on ${primaryObject} (before insert, before update) {\n    for (${primaryObject} record : Trigger.new) {\n        // Add trigger logic here\n    }\n}`
                    }
                },
                explanation: `Create an Apex trigger for ${primaryObject} object`,
                apex: `trigger ${primaryObject}Trigger on ${primaryObject} (before insert, before update) {\n    for (${primaryObject} record : Trigger.new) {\n        // Add trigger logic here\n    }\n}`
            };
        }
        if (lowerRequest.includes('field') || lowerRequest.includes('metadata') || lowerRequest.includes('describe')) {
            return {
                type: 'metadata',
                intent: `Get ${primaryObject} metadata`,
                toolCall: {
                    name: 'salesforce_describe_object',
                    arguments: {
                        objectName: primaryObject
                    }
                },
                explanation: `Retrieve metadata information for ${primaryObject} object`
            };
        }
        // Default to query
        const fields = ['Id', 'Name'];
        if (primaryObject === 'Lead')
            fields.push('Email', 'Company', 'State');
        if (primaryObject === 'Contact')
            fields.push('Email', 'Phone', 'Account.Name');
        if (primaryObject === 'Opportunity')
            fields.push('Amount', 'StageName', 'CloseDate');
        let whereClause = '';
        if (lowerRequest.includes('california') || lowerRequest.includes('ca')) {
            whereClause = "State = 'CA'";
        }
        if (lowerRequest.includes('this month')) {
            whereClause = whereClause ? `${whereClause} AND CreatedDate = THIS_MONTH` : 'CreatedDate = THIS_MONTH';
        }
        const soql = `SELECT ${fields.join(', ')} FROM ${primaryObject}${whereClause ? ` WHERE ${whereClause}` : ''} LIMIT 20`;
        return {
            type: 'query',
            intent: `Query ${primaryObject} records`,
            toolCall: {
                name: 'salesforce_query_records',
                arguments: {
                    objectName: primaryObject,
                    fields: fields,
                    whereClause: whereClause || undefined,
                    limit: 20
                }
            },
            explanation: `Query ${primaryObject} records${whereClause ? ` with conditions: ${whereClause}` : ''}`,
            soql: soql
        };
    }
}