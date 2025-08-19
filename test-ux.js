#!/usr/bin/env node

import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const BASE_URL = 'https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const TEST_USER_ID = 'test_user_123';

// Create screenshots directory
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Find Chrome executable
function findChrome() {
  const possiblePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chrome.app/Contents/MacOS/Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];
  
  for (const chromePath of possiblePaths) {
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }
  
  throw new Error('Chrome not found. Please install Google Chrome.');
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureScreenshot(page, name, description) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}-${name}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  
  await page.screenshot({ 
    path: filepath, 
    fullPage: true,
    type: 'png'
  });
  
  console.log(`📸 Screenshot captured: ${filename}`);
  console.log(`📝 ${description}`);
  console.log(`📁 Location: ${filepath}\n`);
  
  return filepath;
}

async function testEndpoint(page, endpoint, name, description) {
  console.log(`🧪 Testing: ${endpoint}`);
  
  try {
    await page.goto(endpoint, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    await delay(2000); // Wait for any dynamic content
    
    const screenshot = await captureScreenshot(page, name, description);
    
    // Get page title and URL
    const title = await page.title();
    const url = page.url();
    
    console.log(`✅ Success: ${name}`);
    console.log(`📄 Title: ${title}`);
    console.log(`🔗 Final URL: ${url}\n`);
    
    return { success: true, title, url, screenshot };
    
  } catch (error) {
    console.log(`❌ Error testing ${name}: ${error.message}`);
    
    try {
      await captureScreenshot(page, `error-${name}`, `Error state for ${description}`);
    } catch (screenshotError) {
      console.log(`📸 Could not capture error screenshot: ${screenshotError.message}`);
    }
    
    return { success: false, error: error.message };
  }
}

async function testAPIEndpoint(endpoint, name, description) {
  console.log(`🌐 Testing API: ${endpoint}`);
  
  try {
    const response = await fetch(endpoint);
    const status = response.status;
    const statusText = response.statusText;
    const headers = Object.fromEntries(response.headers.entries());
    
    let body = '';
    try {
      const text = await response.text();
      body = text;
      
      // Try to parse as JSON for better display
      try {
        const json = JSON.parse(text);
        body = JSON.stringify(json, null, 2);
      } catch (e) {
        // Keep as text if not JSON
      }
    } catch (e) {
      body = '[Could not read response body]';
    }
    
    console.log(`✅ API Success: ${name}`);
    console.log(`📊 Status: ${status} ${statusText}`);
    console.log(`📋 Response:\n${body}\n`);
    
    return { success: true, status, statusText, headers, body };
    
  } catch (error) {
    console.log(`❌ API Error testing ${name}: ${error.message}\n`);
    return { success: false, error: error.message };
  }
}

async function testOAuthFlow(page) {
  console.log(`🔐 Testing OAuth Flow...`);
  
  const oauthUrl = `${BASE_URL}/auth/salesforce/login?user_id=${TEST_USER_ID}`;
  
  try {
    // Go to OAuth endpoint
    await page.goto(oauthUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    
    await delay(3000);
    
    const currentUrl = page.url();
    const title = await page.title();
    
    await captureScreenshot(page, 'oauth-redirect', 'OAuth flow - redirected to Salesforce login');
    
    console.log(`✅ OAuth Redirect Success`);
    console.log(`📄 Title: ${title}`);
    console.log(`🔗 Redirected to: ${currentUrl}`);
    
    // Check if we're on Salesforce domain
    if (currentUrl.includes('salesforce.com')) {
      console.log(`🎯 Successfully redirected to Salesforce OAuth`);
      
      // Look for login form elements
      try {
        await page.waitForSelector('input[name="username"], input[id="username"]', { timeout: 5000 });
        console.log(`📝 Login form detected`);
        
        const loginElements = await page.evaluate(() => {
          const usernameField = document.querySelector('input[name="username"], input[id="username"]');
          const passwordField = document.querySelector('input[name="pw"], input[id="password"]');
          const submitButton = document.querySelector('input[type="submit"], button[type="submit"], #Login');
          
          return {
            hasUsername: !!usernameField,
            hasPassword: !!passwordField,
            hasSubmit: !!submitButton,
            formAction: usernameField?.form?.action || 'N/A'
          };
        });
        
        console.log(`🔍 Form analysis:`, loginElements);
        
      } catch (e) {
        console.log(`⚠️  Could not detect login form elements`);
      }
      
      return { success: true, redirectUrl: currentUrl, title };
      
    } else {
      console.log(`⚠️  Not redirected to Salesforce domain`);
      return { success: false, error: 'Not redirected to Salesforce', currentUrl, title };
    }
    
  } catch (error) {
    console.log(`❌ OAuth Flow Error: ${error.message}`);
    
    try {
      await captureScreenshot(page, 'oauth-error', 'OAuth flow error state');
    } catch (e) {
      // Ignore screenshot errors
    }
    
    return { success: false, error: error.message };
  }
}

async function analyzePagePerformance(page) {
  console.log(`⚡ Analyzing page performance...`);
  
  try {
    const metrics = await page.metrics();
    const performanceTiming = await page.evaluate(() => {
      return JSON.stringify(window.performance.timing);
    });
    
    console.log(`📊 Page Metrics:`);
    console.log(`- Documents: ${metrics.Documents}`);
    console.log(`- Frames: ${metrics.Frames}`);
    console.log(`- JSEventListeners: ${metrics.JSEventListeners}`);
    console.log(`- Nodes: ${metrics.Nodes}`);
    console.log(`- LayoutCount: ${metrics.LayoutCount}`);
    console.log(`- RecalcStyleCount: ${metrics.RecalcStyleCount}`);
    console.log(`- JSHeapUsedSize: ${(metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`- JSHeapTotalSize: ${(metrics.JSHeapTotalSize / 1024 / 1024).toFixed(2)} MB\n`);
    
    return { metrics, performanceTiming };
    
  } catch (error) {
    console.log(`❌ Performance analysis error: ${error.message}\n`);
    return { error: error.message };
  }
}

async function generateReport(results) {
  const timestamp = new Date().toISOString();
  const reportPath = path.join(SCREENSHOTS_DIR, `ux-test-report-${timestamp.replace(/[:.]/g, '-')}.json`);
  
  const report = {
    timestamp,
    baseUrl: BASE_URL,
    testUserId: TEST_USER_ID,
    results,
    summary: {
      totalTests: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    }
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Test report saved: ${reportPath}`);
  
  return report;
}

async function main() {
  console.log(`🚀 Starting Salesforce MCP SSO UX Testing\n`);
  console.log(`🎯 Base URL: ${BASE_URL}`);
  console.log(`👤 Test User ID: ${TEST_USER_ID}`);
  console.log(`📁 Screenshots: ${SCREENSHOTS_DIR}\n`);
  
  let browser;
  let results = [];
  
  try {
    const chromePath = findChrome();
    console.log(`🌐 Using Chrome at: ${chromePath}\n`);
    
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: false, // Set to true for headless mode
      defaultViewport: {
        width: 1280,
        height: 800
      },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log(`🧪 Running UX Tests...\n`);
    
    // Test 1: Health endpoint
    const healthResult = await testAPIEndpoint(
      `${BASE_URL}/health`,
      'health-check',
      'Server health status'
    );
    results.push({ test: 'health-check', ...healthResult });
    
    // Test 2: Auth status endpoint
    const authStatusResult = await testAPIEndpoint(
      `${BASE_URL}/auth/status`,
      'auth-status',
      'Authentication status'
    );
    results.push({ test: 'auth-status', ...authStatusResult });
    
    // Test 3: Success page (without auth)
    const successResult = await testEndpoint(
      page,
      `${BASE_URL}/auth/success`,
      'success-page',
      'Success page display'
    );
    results.push({ test: 'success-page', ...successResult });
    
    if (successResult.success) {
      await analyzePagePerformance(page);
    }
    
    // Test 4: OAuth flow
    const oauthResult = await testOAuthFlow(page);
    results.push({ test: 'oauth-flow', ...oauthResult });
    
    // Test 5: 404 handling
    const notFoundResult = await testEndpoint(
      page,
      `${BASE_URL}/nonexistent-page`,
      '404-handling',
      '404 error page handling'
    );
    results.push({ test: '404-handling', ...notFoundResult });
    
    // Test 6: MCP tools list
    const toolsResult = await testAPIEndpoint(
      `${BASE_URL}/tools`,
      'mcp-tools',
      'Available MCP tools list'
    );
    results.push({ test: 'mcp-tools', ...toolsResult });
    
    // Generate final report
    const report = await generateReport(results);
    
    console.log(`\n📋 TEST SUMMARY:`);
    console.log(`✅ Successful: ${report.summary.successful}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`📊 Total: ${report.summary.totalTests}`);
    
    if (report.summary.failed > 0) {
      console.log(`\n⚠️  Some tests failed. Check screenshots and logs for details.`);
    } else {
      console.log(`\n🎉 All tests passed!`);
    }
    
  } catch (error) {
    console.error(`💥 Fatal error: ${error.message}`);
    results.push({ test: 'fatal-error', success: false, error: error.message });
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the tests
main().catch(console.error);