#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// UX Analysis and Improvement Recommendations
class UXAnalyzer {
  constructor() {
    this.findings = [];
    this.recommendations = [];
    this.priorities = { high: [], medium: [], low: [] };
  }

  analyzeTestResults(reportPath) {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    console.log(`🔍 Analyzing UX Test Results from ${new Date(report.timestamp).toLocaleString()}\n`);

    this.analyzeHealthEndpoints(report.results);
    this.analyzeOAuthFlow(report.results);
    this.analyzeErrorHandling(report.results);
    this.analyzeAPIEndpoints(report.results);
    this.generateRecommendations();
    this.prioritizeImprovements();
    
    return {
      findings: this.findings,
      recommendations: this.recommendations,
      priorities: this.priorities
    };
  }

  analyzeHealthEndpoints(results) {
    const healthTest = results.find(r => r.test === 'health-check');
    const authStatusTest = results.find(r => r.test === 'auth-status');

    console.log(`🏥 Health & Status Analysis:`);

    if (healthTest?.success) {
      const response = JSON.parse(healthTest.body);
      console.log(`✅ Health endpoint functional`);
      console.log(`📊 Response time headers available: ${!!healthTest.headers.date}`);
      
      this.findings.push({
        category: 'health',
        type: 'positive',
        message: 'Health endpoint returns proper JSON with timestamp and version'
      });

      // Check for missing health metrics
      if (!response.uptime && !response.memory && !response.connections) {
        this.findings.push({
          category: 'health',
          type: 'improvement',
          message: 'Health endpoint could include more detailed metrics (uptime, memory usage, active connections)'
        });
      }
    }

    if (authStatusTest?.success) {
      console.log(`✅ Auth status endpoint functional`);
      this.findings.push({
        category: 'auth',
        type: 'positive',
        message: 'Auth status endpoint correctly returns connection status'
      });
    }

    console.log('');
  }

  analyzeOAuthFlow(results) {
    const oauthTest = results.find(r => r.test === 'oauth-flow');
    console.log(`🔐 OAuth Flow Analysis:`);

    if (oauthTest?.success) {
      console.log(`✅ OAuth redirect working correctly`);
      console.log(`🎯 Redirects to: ${oauthTest.redirectUrl?.includes('salesforce.com') ? 'Salesforce (correct)' : 'Unknown domain'}`);
      
      this.findings.push({
        category: 'oauth',
        type: 'positive',
        message: 'OAuth flow successfully redirects to Salesforce login'
      });

      // Analyze the redirect URL for potential improvements
      if (oauthTest.redirectUrl && oauthTest.redirectUrl.length > 500) {
        this.findings.push({
          category: 'oauth',
          type: 'improvement',
          message: 'OAuth redirect URL is very long - consider optimizing state parameter or using session storage'
        });
      }

    } else {
      console.log(`❌ OAuth flow issues detected`);
      this.findings.push({
        category: 'oauth',
        type: 'issue',
        message: 'OAuth flow not working properly',
        details: oauthTest?.error
      });
    }

    console.log('');
  }

  analyzeErrorHandling(results) {
    const notFoundTest = results.find(r => r.test === '404-handling');
    console.log(`🚫 Error Handling Analysis:`);

    if (notFoundTest?.success) {
      console.log(`✅ 404 handling functional`);
      
      if (notFoundTest.title === 'Error') {
        this.findings.push({
          category: 'errors',
          type: 'improvement',
          message: 'Generic "Error" title for 404 pages - could be more user-friendly'
        });
      }

      this.findings.push({
        category: 'errors',
        type: 'improvement',
        message: 'Custom 404 page could include navigation links, search, or help information'
      });
    }

    console.log('');
  }

  analyzeAPIEndpoints(results) {
    const toolsTest = results.find(r => r.test === 'mcp-tools');
    console.log(`🛠️ API Endpoints Analysis:`);

    if (toolsTest?.status === 404) {
      console.log(`⚠️  /tools endpoint not found - expected for MCP tools listing`);
      
      this.findings.push({
        category: 'api',
        type: 'issue',
        message: 'Missing /tools endpoint - should list available MCP tools'
      });

      this.findings.push({
        category: 'api',
        type: 'improvement',
        message: 'Add public API documentation endpoint (e.g., /api/docs)'
      });
    }

    console.log('');
  }

  generateRecommendations() {
    console.log(`💡 UX Improvement Recommendations:\n`);

    // High Priority
    this.addRecommendation('high', 'Add /mcp/tools endpoint', 
      'Create a public endpoint to list available MCP tools for integration documentation');

    this.addRecommendation('high', 'Improve success page UX',
      'Add connection status, next steps, and integration examples to the success page');

    this.addRecommendation('high', 'Add loading states',
      'Show loading indicators during OAuth flow and API calls');

    // Medium Priority  
    this.addRecommendation('medium', 'Enhanced error pages',
      'Create custom error pages with helpful navigation and troubleshooting tips');

    this.addRecommendation('medium', 'Add health metrics',
      'Include uptime, memory usage, and connection counts in health endpoint');

    this.addRecommendation('medium', 'OAuth flow feedback',
      'Add progress indicators and clearer messaging during authentication');

    this.addRecommendation('medium', 'API documentation',
      'Create interactive API documentation (Swagger/OpenAPI)');

    // Low Priority
    this.addRecommendation('low', 'Add favicon and app icons',
      'Improve branding with proper favicons and app icons');

    this.addRecommendation('low', 'Responsive design audit',
      'Test and optimize for mobile devices');

    this.addRecommendation('low', 'Add analytics',
      'Track usage patterns and user flows for further optimization');
  }

  addRecommendation(priority, title, description) {
    const rec = { title, description };
    this.recommendations.push(rec);
    this.priorities[priority].push(rec);
    console.log(`${this.getPriorityEmoji(priority)} ${priority.toUpperCase()}: ${title}`);
    console.log(`   ${description}\n`);
  }

  getPriorityEmoji(priority) {
    const emojis = { high: '🔥', medium: '⚡', low: '💡' };
    return emojis[priority] || '📌';
  }

  prioritizeImprovements() {
    console.log(`\n📋 Implementation Priority Summary:`);
    console.log(`🔥 High Priority: ${this.priorities.high.length} items`);
    console.log(`⚡ Medium Priority: ${this.priorities.medium.length} items`);
    console.log(`💡 Low Priority: ${this.priorities.low.length} items`);
    console.log(`📊 Total Recommendations: ${this.recommendations.length}`);
  }

  generateImplementationPlan() {
    console.log(`\n🚀 Implementation Plan:\n`);

    console.log(`Phase 1 - Critical UX Fixes (Week 1):`);
    this.priorities.high.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec.title}`);
    });

    console.log(`\nPhase 2 - Enhanced Experience (Week 2-3):`);
    this.priorities.medium.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec.title}`);
    });

    console.log(`\nPhase 3 - Polish & Optimization (Week 4+):`);
    this.priorities.low.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec.title}`);
    });
  }

  generateCodeSnippets() {
    console.log(`\n💻 Quick Implementation Snippets:\n`);

    console.log(`1. Add /mcp/tools endpoint to sso-server.ts:`);
    console.log(`\`\`\`javascript`);
    console.log(`app.get('/mcp/tools', (req, res) => {`);
    console.log(`  res.json({`);
    console.log(`    tools: [`);
    console.log(`      { name: 'salesforce_search_objects', description: 'Search Salesforce objects' },`);
    console.log(`      { name: 'salesforce_query_records', description: 'Query Salesforce records' },`);
    console.log(`      // ... other tools`);
    console.log(`    ],`);
    console.log(`    total: 12,`);
    console.log(`    documentation: \`\${BASE_URL}/api/docs\``);
    console.log(`  });`);
    console.log(`});`);
    console.log(`\`\`\`\n`);

    console.log(`2. Enhance success page with better UX:`);
    console.log(`\`\`\`html`);
    console.log(`<div class="success-container">`);
    console.log(`  <div class="connection-status">`);
    console.log(`    <h2>🎉 Successfully Connected!</h2>`);
    console.log(`    <p>Your Salesforce account is now linked.</p>`);
    console.log(`  </div>`);
    console.log(`  <div class="next-steps">`);
    console.log(`    <h3>Next Steps:</h3>`);
    console.log(`    <ol>`);
    console.log(`      <li>Return to your application</li>`);
    console.log(`      <li>Start using Salesforce tools</li>`);
    console.log(`      <li>View available tools at <a href="/mcp/tools">/mcp/tools</a></li>`);
    console.log(`    </ol>`);
    console.log(`  </div>`);
    console.log(`</div>`);
    console.log(`\`\`\`\n`);

    console.log(`3. Add enhanced health endpoint:`);
    console.log(`\`\`\`javascript`);
    console.log(`app.get('/health', (req, res) => {`);
    console.log(`  res.json({`);
    console.log(`    status: 'ok',`);
    console.log(`    timestamp: new Date().toISOString(),`);
    console.log(`    version: process.env.npm_package_version || '0.0.2',`);
    console.log(`    uptime: process.uptime(),`);
    console.log(`    memory: process.memoryUsage(),`);
    console.log(`    connections: {`);
    console.log(`      active: tokenStore.getActiveConnectionCount(),`);
    console.log(`      total: tokenStore.getTotalConnectionCount()`);
    console.log(`    }`);
    console.log(`  });`);
    console.log(`});`);
    console.log(`\`\`\`\n`);
  }
}

async function main() {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  
  if (!fs.existsSync(screenshotsDir)) {
    console.error('❌ Screenshots directory not found. Run UX tests first.');
    return;
  }

  // Find the latest test report
  const files = fs.readdirSync(screenshotsDir);
  const reportFiles = files.filter(f => f.startsWith('ux-test-report-') && f.endsWith('.json'));
  
  if (reportFiles.length === 0) {
    console.error('❌ No test reports found. Run UX tests first with: npm run test:ux');
    return;
  }

  const latestReport = reportFiles.sort().pop();
  const reportPath = path.join(screenshotsDir, latestReport);

  console.log(`🎯 Salesforce MCP SSO - UX Analysis & Improvement Plan\n`);
  console.log(`📊 Analyzing: ${latestReport}\n`);

  const analyzer = new UXAnalyzer();
  const analysis = analyzer.analyzeTestResults(reportPath);
  
  analyzer.generateImplementationPlan();
  analyzer.generateCodeSnippets();

  console.log(`\n✨ Analysis complete! Use these recommendations to improve the user experience.`);
  console.log(`📸 Review the captured screenshots in: ${screenshotsDir}`);
}

main().catch(console.error);