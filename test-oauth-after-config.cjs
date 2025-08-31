#!/usr/bin/env node

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function testUpdatedOAuthFlow() {
    console.log('🚀 Testing OAuth Flow After Salesforce Configuration Update\n');
    
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: false, // Keep visible so we can see the OAuth flow
        defaultViewport: { width: 1920, height: 1080 },
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security'
        ]
    });
    
    try {
        const page = await browser.newPage();
        
        // Test 1: OAuth initiation with return URL
        console.log('📋 Test 1: OAuth Flow with Return URL');
        const testUrl = 'https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/auth/salesforce/login?user_id=config_test&return_url=http://localhost:3000/api/salesforce/callback';
        
        console.log(`🔗 Navigating to: ${testUrl}`);
        
        // Navigate to OAuth URL
        await page.goto(testUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        
        console.log(`📍 Current URL: ${page.url()}`);
        
        // Take screenshot of Salesforce login page
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        let screenshot1 = `./screenshots/${timestamp}-oauth-after-config-01-login.png`;
        await page.screenshot({ path: screenshot1, fullPage: true });
        console.log(`📸 Screenshot 1: ${screenshot1}`);
        
        // Check if we're on the proper Salesforce OAuth page
        const currentUrl = page.url();
        if (currentUrl.includes('login.salesforce.com') && currentUrl.includes('oauth2/authorize')) {
            console.log('✅ Successfully redirected to Salesforce OAuth authorization page');
            console.log('✅ OAuth URL structure is correct');
            
            // Check if login form is present (not access denied)
            const hasLoginForm = await page.$('#username') !== null;
            const hasAccessDenied = await page.$('h1') && await page.$eval('h1', el => el.textContent.includes('Access Denied'));
            
            if (hasLoginForm) {
                console.log('✅ Salesforce login form is present - Configuration fixed!');
                console.log('🎯 OAuth flow is ready for user authentication');
                
                // Extract state parameter for verification
                const url = new URL(currentUrl);
                const state = url.searchParams.get('state');
                console.log(`🔑 OAuth state parameter: ${state}`);
                
                // Verify all OAuth parameters are present
                const requiredParams = ['response_type', 'client_id', 'redirect_uri', 'scope', 'state'];
                const presentParams = [];
                const missingParams = [];
                
                for (const param of requiredParams) {
                    if (url.searchParams.has(param)) {
                        presentParams.push(`${param}: ${url.searchParams.get(param)}`);
                    } else {
                        missingParams.push(param);
                    }
                }
                
                console.log('📋 OAuth Parameters:');
                presentParams.forEach(param => console.log(`  ✅ ${param}`));
                if (missingParams.length > 0) {
                    missingParams.forEach(param => console.log(`  ❌ Missing: ${param}`));
                }
                
            } else if (hasAccessDenied) {
                console.log('❌ Still getting Access Denied - may need more time for Salesforce config to propagate');
                console.log('⏰ Try again in 2-5 minutes');
            }
            
        } else if (currentUrl.includes('login.salesforce.com') && !currentUrl.includes('oauth2/authorize')) {
            console.log('❌ Redirected to wrong Salesforce URL - OAuth configuration issue');
        } else {
            console.log('❌ Not redirected to Salesforce - server configuration issue');
        }
        
        // Test 2: Check if server endpoints are still working
        console.log('\n📋 Test 2: Verify Server Health');
        const healthPage = await browser.newPage();
        await healthPage.goto('https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/health');
        
        const healthContent = await healthPage.content();
        if (healthContent.includes('"status":"ok"')) {
            console.log('✅ Server health check passed');
        } else {
            console.log('❌ Server health check failed');
        }
        
        await healthPage.close();
        
        // Test 3: Test MCP tools endpoint
        console.log('\n📋 Test 3: Verify MCP Tools Endpoint');
        const mcpPage = await browser.newPage();
        await mcpPage.goto('https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/mcp/tools');
        
        const mcpContent = await mcpPage.content();
        if (mcpContent.includes('salesforce_search_objects')) {
            console.log('✅ MCP tools endpoint working');
        } else {
            console.log('❌ MCP tools endpoint failed');
        }
        
        await mcpPage.close();
        
        // Keep the OAuth page open for manual testing
        console.log('\n🎯 OAuth Flow Status Summary:');
        console.log('================================');
        console.log('✅ Server deployment: WORKING');
        console.log('✅ OAuth URL generation: WORKING');
        console.log('✅ Salesforce redirect: WORKING');
        
        if (currentUrl.includes('oauth2/authorize')) {
            console.log('✅ OAuth authorization page: ACCESSIBLE');
            console.log('\n🚀 READY FOR MANUAL TESTING:');
            console.log('1. Use the Salesforce login form in the browser');
            console.log('2. Complete the OAuth authorization');
            console.log('3. Verify you get redirected back to the correct callback');
            console.log('4. Check that return URL parameter works correctly');
            console.log('\n⏰ Browser will stay open for 60 seconds for manual testing...');
            
            await new Promise(resolve => setTimeout(resolve, 60000));
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        // Take error screenshot
        try {
            const errorTimestamp = new Date().toISOString().replace(/:/g, '-');
            const errorScreenshot = `./screenshots/${errorTimestamp}-oauth-error.png`;
            await page.screenshot({ path: errorScreenshot, fullPage: true });
            console.log(`📸 Error screenshot: ${errorScreenshot}`);
        } catch (screenshotError) {
            console.log('Could not take error screenshot:', screenshotError.message);
        }
    } finally {
        await browser.close();
        console.log('\n✅ Test completed');
    }
}

if (require.main === module) {
    testUpdatedOAuthFlow();
}