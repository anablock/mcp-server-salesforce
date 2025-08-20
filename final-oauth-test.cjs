#!/usr/bin/env node

const puppeteer = require('puppeteer-core');

async function finalOAuthTest() {
    console.log('🎯 Final OAuth Test - With Correct Salesforce Domain\n');
    
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: false,
        defaultViewport: { width: 1920, height: 1080 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        const testUrl = 'https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/auth/salesforce/login?user_id=final_test&return_url=http://localhost:3000/api/salesforce/callback';
        
        console.log(`🔗 Testing: ${testUrl}`);
        
        // Navigate and take screenshot
        await page.goto(testUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        
        const finalUrl = page.url();
        console.log(`📍 Final URL: ${finalUrl}`);
        
        // Take screenshot
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const screenshotPath = `./screenshots/${timestamp}-final-oauth-test.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`📸 Screenshot: ${screenshotPath}`);
        
        // Analyze the result
        if (finalUrl.includes('momentum-business-1687.my.salesforce.com')) {
            console.log('✅ Redirected to correct Salesforce domain');
            
            if (finalUrl.includes('/services/oauth2/authorize')) {
                console.log('✅ Using correct OAuth2 authorization endpoint');
                
                // Check for login form vs access denied
                const hasUsernameField = await page.$('#username') !== null;
                const hasPasswordField = await page.$('#password') !== null;
                const hasLoginButton = await page.$('[name="Login"]') !== null || await page.$('input[type="submit"]') !== null;
                
                if (hasUsernameField && hasPasswordField) {
                    console.log('✅ Salesforce login form is present');
                    console.log('✅ OAuth configuration is working correctly!');
                    
                    // Extract OAuth parameters
                    const url = new URL(finalUrl);
                    console.log('\n🔑 OAuth Parameters:');
                    console.log(`  State: ${url.searchParams.get('state')}`);
                    console.log(`  Client ID: ${url.searchParams.get('client_id')}`);
                    console.log(`  Redirect URI: ${url.searchParams.get('redirect_uri')}`);
                    console.log(`  Scope: ${url.searchParams.get('scope')}`);
                    
                    console.log('\n🎯 SUCCESS! Ready for manual OAuth testing:');
                    console.log('1. Enter your Salesforce credentials in the form');
                    console.log('2. Complete the OAuth authorization');
                    console.log('3. You should be redirected to: http://localhost:3000/api/salesforce/callback');
                    console.log('4. This confirms the return URL functionality is working');
                    
                    // Keep browser open for manual testing
                    console.log('\n⏰ Browser will stay open for 2 minutes for manual testing...');
                    await new Promise(resolve => setTimeout(resolve, 120000));
                    
                } else {
                    console.log('❌ Login form not found - checking for error messages');
                    const pageText = await page.evaluate(() => document.body.innerText);
                    if (pageText.includes('Access Denied')) {
                        console.log('❌ Still getting Access Denied - Connected App may need more time to propagate');
                    } else {
                        console.log('❓ Unexpected page content');
                    }
                }
                
            } else {
                console.log('❌ Not using OAuth2 authorization endpoint - configuration issue');
            }
        } else {
            console.log('❌ Not redirected to correct Salesforce domain');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

if (require.main === module) {
    finalOAuthTest();
}