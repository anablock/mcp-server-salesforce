#!/usr/bin/env node

import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const BASE_URL = 'http://localhost:3003';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

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
    '/usr/bin/chromium-browser'
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

async function main() {
  console.log(`🚀 Capturing screenshots of local Salesforce MCP SSO UI\n`);
  console.log(`🎯 Base URL: ${BASE_URL}`);
  console.log(`📁 Screenshots: ${SCREENSHOTS_DIR}\n`);
  
  let browser;
  
  try {
    const chromePath = findChrome();
    console.log(`🌐 Using Chrome at: ${chromePath}\n`);
    
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: false,
      defaultViewport: {
        width: 1280,
        height: 800
      },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    // Screenshot main page
    console.log('📸 Capturing main page...');
    await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle0', timeout: 30000 });
    await delay(2000);
    await captureScreenshot(page, 'main-page', 'Main landing page');
    
    // Screenshot health page
    console.log('📸 Capturing health check page...');
    await page.goto(`${BASE_URL}/health`, { waitUntil: 'networkidle0' });
    await delay(1000);
    await captureScreenshot(page, 'health-page', 'Health check endpoint');
    
    // Screenshot tools page
    console.log('📸 Capturing tools page...');
    await page.goto(`${BASE_URL}/tools`, { waitUntil: 'networkidle0' });
    await delay(1000);
    await captureScreenshot(page, 'tools-page', 'MCP tools documentation');
    
    // Screenshot success page
    console.log('📸 Capturing success page...');
    await page.goto(`${BASE_URL}/auth/success`, { waitUntil: 'networkidle0' });
    await delay(1000);
    await captureScreenshot(page, 'success-page', 'Authentication success page');
    
    // Mobile viewport screenshots
    console.log('📱 Switching to mobile viewport...');
    await page.setViewport({ width: 375, height: 667 });
    
    await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await captureScreenshot(page, 'main-page-mobile', 'Main page - Mobile view');
    
    await page.goto(`${BASE_URL}/auth/success`, { waitUntil: 'networkidle0' });
    await delay(1000);
    await captureScreenshot(page, 'success-page-mobile', 'Success page - Mobile view');
    
    console.log(`\n🎉 Screenshots completed! Check the screenshots directory.`);
    
  } catch (error) {
    console.error(`💥 Error: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main().catch(console.error);