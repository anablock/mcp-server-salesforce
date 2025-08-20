#!/usr/bin/env node

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com';
const NOTEPAD_RETURN_URL = 'http://localhost:3000/api/salesforce/callback';
const SCREENSHOT_DIR = './screenshots';

// Test scenarios for OAuth return URL fix
const TEST_SCENARIOS = [
    {
        name: 'oauth-return-url-test',
        description: 'Test OAuth login with return URL parameter',
        url: `${BASE_URL}/auth/salesforce/login?user_id=return_test&return_url=${encodeURIComponent(NOTEPAD_RETURN_URL)}`,
        expectedRedirect: 'https://login.salesforce.com/services/oauth2/authorize'
    },
    {
        name: 'oauth-without-return-url',
        description: 'Test OAuth login without return URL parameter',
        url: `${BASE_URL}/auth/salesforce/login?user_id=no_return_test`,
        expectedRedirect: 'https://login.salesforce.com/services/oauth2/authorize'
    },
    {
        name: 'health-check',
        description: 'Test server health endpoint',
        url: `${BASE_URL}/health`,
        expectedContent: '"status":"ok"'
    },
    {
        name: 'mcp-tools-endpoint',
        description: 'Test MCP tools endpoint',
        url: `${BASE_URL}/mcp/tools`,
        expectedContent: 'salesforce_search_objects'
    }
];

async function createScreenshotDir() {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
}

async function takeScreenshot(page, name, description) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `${timestamp}-${name}.png`;
    const filepath = path.join(SCREENSHOT_DIR, filename);
    
    await page.screenshot({
        path: filepath,
        fullPage: true,
        captureBeyondViewport: true
    });
    
    console.log(`📸 Screenshot saved: ${filename} - ${description}`);
    return { filename, filepath, description, timestamp };
}

async function testOAuthFlow(browser) {
    console.log('🧪 Testing OAuth Return URL Implementation...\n');
    
    const testResults = [];
    
    for (const scenario of TEST_SCENARIOS) {
        console.log(`Testing: ${scenario.description}`);
        
        const page = await browser.newPage();
        
        try {
            // Set viewport for consistent screenshots
            await page.setViewport({ width: 1920, height: 1080 });
            
            // Navigate to test URL
            console.log(`  → Navigating to: ${scenario.url}`);
            
            const response = await page.goto(scenario.url, { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });
            
            // Take screenshot of the result
            const screenshot = await takeScreenshot(page, scenario.name, scenario.description);
            
            // Check response status
            const status = response.status();
            console.log(`  → Response status: ${status}`);
            
            // Get current URL after any redirects
            const currentUrl = page.url();
            console.log(`  → Final URL: ${currentUrl}`);
            
            // Check if we got redirected as expected
            let redirectTest = 'N/A';
            if (scenario.expectedRedirect) {
                redirectTest = currentUrl.startsWith(scenario.expectedRedirect) ? 'PASS' : 'FAIL';
                console.log(`  → Redirect test: ${redirectTest}`);
            }
            
            // Check page content if expected
            let contentTest = 'N/A';
            if (scenario.expectedContent) {
                const content = await page.content();
                contentTest = content.includes(scenario.expectedContent) ? 'PASS' : 'FAIL';
                console.log(`  → Content test: ${contentTest}`);
            }
            
            // For OAuth scenarios, extract state parameter
            let stateParam = 'N/A';
            if (currentUrl.includes('state=')) {
                const urlParams = new URL(currentUrl).searchParams;
                stateParam = urlParams.get('state') || 'Not found';
                console.log(`  → OAuth state: ${stateParam}`);
            }
            
            testResults.push({
                scenario: scenario.name,
                description: scenario.description,
                url: scenario.url,
                status,
                finalUrl: currentUrl,
                redirectTest,
                contentTest,
                stateParam,
                screenshot: screenshot.filename,
                timestamp: screenshot.timestamp,
                success: status === 200 || (status === 302 && redirectTest === 'PASS')
            });
            
        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
            
            // Take error screenshot
            const errorScreenshot = await takeScreenshot(page, `${scenario.name}-error`, `Error: ${error.message}`);
            
            testResults.push({
                scenario: scenario.name,
                description: scenario.description,
                url: scenario.url,
                status: 'ERROR',
                error: error.message,
                screenshot: errorScreenshot.filename,
                timestamp: errorScreenshot.timestamp,
                success: false
            });
        } finally {
            await page.close();
        }
        
        console.log(''); // Add spacing between tests
    }
    
    return testResults;
}

async function generateReport(results) {
    const timestamp = new Date().toISOString();
    const reportData = {
        testRun: {
            timestamp,
            totalTests: results.length,
            passed: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        },
        results
    };
    
    const reportFile = path.join(SCREENSHOT_DIR, `oauth-test-report-${timestamp.replace(/:/g, '-')}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));
    
    console.log('📊 Test Results Summary:');
    console.log('========================');
    console.log(`Total Tests: ${reportData.testRun.totalTests}`);
    console.log(`Passed: ${reportData.testRun.passed}`);
    console.log(`Failed: ${reportData.testRun.failed}`);
    console.log(`Report saved: ${reportFile}`);
    
    // Print detailed results
    results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.scenario}: ${result.description}`);
        if (result.stateParam && result.stateParam !== 'N/A') {
            console.log(`    OAuth State: ${result.stateParam}`);
        }
        if (result.error) {
            console.log(`    Error: ${result.error}`);
        }
    });
    
    return reportFile;
}

async function main() {
    console.log('🚀 Starting OAuth Return URL Test Suite\n');
    
    try {
        // Create screenshot directory
        await createScreenshotDir();
        
        // Launch browser
        console.log('🌐 Launching browser...');
        const browser = await puppeteer.launch({
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            headless: true,
            defaultViewport: { width: 1920, height: 1080 },
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });
        
        console.log('✅ Browser launched successfully\n');
        
        // Run OAuth flow tests
        const results = await testOAuthFlow(browser);
        
        // Generate and save report
        await generateReport(results);
        
        // Close browser
        await browser.close();
        console.log('\n🏁 Test suite completed successfully!');
        
    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main };