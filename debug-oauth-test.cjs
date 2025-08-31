#!/usr/bin/env node

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function debugOAuthFlow() {
    console.log('🔍 Debugging OAuth Flow Implementation...\n');
    
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: false, // Run in visible mode to see what happens
        defaultViewport: { width: 1920, height: 1080 },
        devtools: true, // Open DevTools for debugging
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Enable request logging
        page.on('request', request => {
            console.log(`🔄 REQUEST: ${request.method()} ${request.url()}`);
        });
        
        page.on('response', response => {
            console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
        });
        
        // Test 1: Direct OAuth URL generation endpoint
        console.log('Test 1: Checking OAuth URL generation...');
        const testUrl = 'https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/auth/salesforce/login?user_id=debug_test&return_url=http://localhost:3000/integration';
        
        console.log(`Navigating to: ${testUrl}`);
        
        // Set up to intercept the redirect
        let actualOAuthUrl = null;
        page.on('response', async (response) => {
            if (response.status() === 302) {
                const location = response.headers()['location'];
                if (location && location.includes('oauth2/authorize')) {
                    actualOAuthUrl = location;
                    console.log(`🎯 INTERCEPTED OAuth URL: ${actualOAuthUrl}`);
                    
                    // Parse the URL to examine parameters
                    try {
                        const url = new URL(actualOAuthUrl);
                        console.log('OAuth URL Parameters:');
                        for (const [key, value] of url.searchParams) {
                            console.log(`  ${key}: ${value}`);
                        }
                    } catch (e) {
                        console.log('Could not parse OAuth URL:', e.message);
                    }
                }
            }
        });
        
        await page.goto(testUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        
        console.log(`Final URL after redirect: ${page.url()}`);
        
        // Take screenshot of the result
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const screenshotPath = `./screenshots/${timestamp}-debug-oauth.png`;
        await page.screenshot({
            path: screenshotPath,
            fullPage: true
        });
        console.log(`📸 Screenshot saved: ${screenshotPath}`);
        
        // Test 2: Check if we can manually construct what the OAuth URL should be
        console.log('\n📋 Expected OAuth URL structure:');
        const expectedBase = 'https://login.salesforce.com/services/oauth2/authorize';
        console.log(`Base URL: ${expectedBase}`);
        console.log('Expected parameters:');
        console.log('  - response_type: code');
        console.log('  - client_id: [from env]');
        console.log('  - redirect_uri: https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/auth/salesforce/callback');
        console.log('  - scope: full refresh_token');
        console.log('  - state: [generated UUID]');
        console.log('  - prompt: login consent');
        
        // Test 3: Try to test the callback endpoint
        console.log('\n🔄 Testing callback endpoint structure...');
        const callbackUrl = 'https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/auth/salesforce/callback';
        console.log(`Callback URL: ${callbackUrl}`);
        
        // Wait for user to review
        console.log('\n⏸️  Pausing for manual review...');
        console.log('Press any key to continue and test the callback...');
        
        // Keep browser open for 30 seconds for manual inspection
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        if (actualOAuthUrl) {
            console.log('\n✅ OAuth URL was successfully intercepted');
            console.log('🎯 Implementation appears to be working correctly');
            console.log('❓ The "Access Denied" error might be due to:');
            console.log('   1. Salesforce Connected App configuration');
            console.log('   2. OAuth callback URL whitelist');
            console.log('   3. Salesforce organization permissions');
            console.log('   4. Client ID/Secret mismatch');
        } else {
            console.log('\n❌ No OAuth URL was intercepted');
            console.log('🔍 This indicates an issue with the server implementation');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

if (require.main === module) {
    debugOAuthFlow();
}