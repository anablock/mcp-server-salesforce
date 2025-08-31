# UX Testing Infrastructure Documentation

## Overview

This document covers the comprehensive UX testing infrastructure built for the Salesforce MCP SSO server, including Puppeteer automation, visual regression testing, performance monitoring, and accessibility validation.

## Testing Architecture

### Test Files Structure

```
├── test-ux.js                 # Basic UX testing suite
├── advanced-ux-test.js         # Comprehensive testing with multiple scenarios
├── analyze-ux.js              # UX analysis and recommendations generator
└── screenshots/               # Generated screenshots and reports
    ├── {timestamp}-*.png      # Visual regression screenshots
    └── *-report-*.json        # Detailed test result reports
```

## Test Suites

### 1. Basic UX Testing (`test-ux.js`)

**Purpose:** Quick validation of core functionality and basic visual testing

**Test Scenarios:**
- Health endpoint validation
- Auth status verification  
- Success page rendering
- OAuth flow initiation
- 404 error handling
- Basic API endpoint testing

**Usage:**
```bash
npm run test:ux
npm run test:ux:headless  # Run in headless mode
```

### 2. Advanced UX Testing (`advanced-ux-test.js`)

**Purpose:** Comprehensive testing across multiple dimensions

#### Test Categories:

##### 📱 Responsive Design Testing
**Function:** `testResponsiveDesign(page)`

**Viewports Tested:**
- **Mobile:** 375x667 (iPhone SE)
- **Tablet:** 768x1024 (iPad)  
- **Desktop:** 1920x1080 (Standard)
- **Ultrawide:** 2560x1440 (Ultrawide)

**Validation Points:**
```javascript
{
  hasContainer: true,           // Container element exists
  containerWidth: 335-700,      // Adaptive width
  buttonCount: 3,              // All buttons present
  buttonsVisible: true,        // All buttons visible
  viewportWidth: number,       // Actual viewport
  viewportHeight: number       // Actual viewport
}
```

##### ♿ Accessibility Testing
**Function:** `testAccessibility(page)`

**Validation Criteria:**
- ✅ Valid DOCTYPE declaration
- ✅ HTML lang attribute set
- ✅ Page title present
- ✅ Meta viewport tag
- ✅ Meta charset declaration
- ✅ Semantic heading structure
- ✅ Image alt attributes (when present)
- ✅ Descriptive link text
- ✅ Color contrast sampling

**Sample Results:**
```javascript
{
  hasDoctype: true,
  hasLang: true, 
  hasTitle: true,
  headingStructure: [
    { tag: "h1", text: "Successfully Connected to Salesforce!", hasContent: true },
    { tag: "h3", text: "Connection Details", hasContent: true },
    { tag: "h3", text: "What's Next?", hasContent: true }
  ],
  links: [
    { href: "/mcp/tools", text: "View Available Tools", hasText: true, target: "_blank" },
    { href: "/auth/status", text: "Check Connection Status", hasText: true, target: "_blank" },
    // ...
  ]
}
```

##### ⏳ Performance Testing
**Function:** `testLoadingStates(page)`

**Network Simulation:**
```javascript
// Slow 3G Network Conditions
{
  offline: false,
  downloadThroughput: 500 * 1024 / 8,  // 500kb/s
  uploadThroughput: 500 * 1024 / 8,
  latency: 400                          // 400ms latency
}
```

**Metrics Captured:**
- OAuth redirect load time
- Page render completion time
- Network request analysis
- Resource loading patterns

**Typical Results:**
- Normal network: ~800ms
- Slow 3G: ~3400ms (identifies need for loading indicators)

##### 📚 API Integration Testing
**Function:** `testAPIDocumentation(page)`

**Endpoints Validated:**
- `GET /mcp/tools` - MCP tools documentation
- `GET /health` - Enhanced health metrics
- Success page link functionality

**MCP Tools Validation:**
```javascript
{
  total: 13,                    // Total tools available
  categories: {                 // Tools by category
    discovery: 2,
    metadata: 3, 
    data: 2,
    development: 6
  },
  authentication: {             // Auth requirements
    required: true,
    flow: "OAuth 2.0",
    loginUrl: "...",
    statusUrl: "..."
  }
}
```

##### 🗺️ User Journey Testing
**Function:** `testUserJourney(page)`

**Journey Steps:**
1. **Success Page** - Landing after OAuth completion
2. **Tools API** - Navigate to MCP tools documentation  
3. **Health Check** - Verify server health metrics
4. **Auth Status** - Check connection status

**Journey Tracking:**
```javascript
[
  {
    step: "success_page",
    timestamp: "2025-08-19T04:04:28.963Z", 
    url: "https://app.herokuapp.com/auth/success?org_id=TEST123&connection_id=CONN456",
    title: "Salesforce Connected"
  },
  // ... additional steps
]
```

## Configuration

### Chrome Path Detection
```javascript
function findChrome() {
  const possiblePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',  // macOS
    '/usr/bin/google-chrome',                                        // Linux
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'     // Windows
  ];
  // Auto-detection logic
}
```

### Puppeteer Configuration
```javascript
{
  executablePath: chromePath,
  headless: false,           // Visual testing mode
  defaultViewport: {
    width: 1280,
    height: 800
  },
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox', 
    '--disable-dev-shm-usage',
    '--disable-web-security'
  ]
}
```

## Screenshot Management

### Naming Convention
```
{timestamp}-advanced-{test-category}-{description}.png

Examples:
- 2025-08-19T04-04-15-013Z-advanced-responsive-mobile.png
- 2025-08-19T04-04-27-000Z-advanced-loading-oauth-slow.png
- 2025-08-19T04-04-28-966Z-advanced-journey-01-success.png
```

### Screenshot Function
```javascript
async function captureScreenshot(page, name, description, options = {}) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}-advanced-${name}.png`;
  
  await page.screenshot({
    path: filepath,
    fullPage: options.fullPage !== false,  // Full page by default
    type: 'png',
    ...options
  });
}
```

## Report Generation

### Advanced Test Report
**File:** `screenshots/advanced-ux-report-{timestamp}.json`

**Report Structure:**
```json
{
  "timestamp": "2025-08-19T04:04:34.274Z",
  "baseUrl": "https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com", 
  "testType": "Advanced UX Analysis",
  "results": {
    "accessibility": { /* accessibility test results */ },
    "apiDocs": { /* API integration results */ },
    "userJourney": [ /* complete user journey steps */ ]
  },
  "recommendations": {
    "phase2": [
      {
        "priority": "high",
        "title": "Add Loading Indicators",
        "description": "OAuth flow could benefit from loading states",
        "implementation": "Add spinner or progress bar during redirects"
      }
      // ... more recommendations
    ],
    "nextIteration": [ /* future enhancement suggestions */ ]
  },
  "achievements": [
    "✅ Professional success page with modern UI",
    "✅ Comprehensive MCP tools documentation",
    // ... accomplishments list
  ]
}
```

## Test Execution

### Command Line Interface

```bash
# Basic UX testing
npm run test:ux

# Advanced comprehensive testing  
npm run test:ux:advanced

# All UX tests
npm run test:ux:all

# Headless mode (CI/CD friendly)
npm run test:ux:headless
```

### Package.json Scripts
```json
{
  "test:ux": "node test-ux.js",
  "test:ux:headless": "node test-ux.js --headless", 
  "test:ux:advanced": "node advanced-ux-test.js",
  "test:ux:all": "npm run test:ux && npm run test:ux:advanced"
}
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: UX Testing
on: [push, pull_request]

jobs:
  ux-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
        
      - name: Run UX tests
        run: npm run test:ux:headless
        
      - name: Upload screenshots
        uses: actions/upload-artifact@v2
        if: always()
        with:
          name: ux-test-screenshots
          path: screenshots/
```

### Heroku Review Apps Integration
```json
{
  "scripts": {
    "heroku-postbuild": "npm run build && npm run test:ux:headless"
  }
}
```

## Performance Monitoring

### Load Time Analysis
```javascript
const startTime = Date.now();
await page.goto(url, { waitUntil: 'networkidle0' });
const loadTime = Date.now() - startTime;

// Performance thresholds
const thresholds = {
  excellent: 1000,    // < 1s
  good: 2000,        // < 2s  
  acceptable: 5000,   // < 5s
  poor: 5000         // > 5s
};
```

### Memory Usage Tracking
```javascript
// Via health endpoint
const healthData = {
  memory: {
    used: 21,        // MB heap used
    total: 23,       // MB total heap
    external: 4,     // MB external
    unit: "MB"
  }
};
```

## Visual Regression Testing

### Screenshot Comparison Strategy
1. **Baseline Screenshots** - Initial approved UI state
2. **Test Screenshots** - Current implementation state  
3. **Diff Generation** - Pixel-level comparison
4. **Threshold Configuration** - Acceptable change levels

### Best Practices
- Consistent viewport sizes
- Stable test data
- Network condition simulation
- Cross-browser validation
- Automated approval workflow

## Accessibility Testing

### WCAG 2.1 Compliance Checklist

**Level A:**
- ✅ Images have alt text
- ✅ Form controls have labels  
- ✅ Page has title
- ✅ Proper heading hierarchy

**Level AA:**  
- ✅ Color contrast ratios meet standards
- ✅ Text can be resized to 200%
- ✅ Content is accessible via keyboard
- ✅ Focus indicators are visible

**Testing Tools Integration:**
- axe-core for automated accessibility testing
- Custom validation for semantic HTML
- Color contrast ratio calculations
- Keyboard navigation testing

## Troubleshooting

### Common Issues

#### Chrome Not Found
```javascript
Error: Chrome not found. Please install Google Chrome.

Solution:
- Install Google Chrome
- Update findChrome() paths for your system
- Set PUPPETEER_EXECUTABLE_PATH environment variable
```

#### Network Timeouts
```javascript
Error: Navigation timeout exceeded

Solutions:
- Increase timeout values
- Check network connectivity
- Verify target URLs are accessible
- Add retry logic for flaky tests
```

#### Screenshot Permissions  
```javascript
Error: Failed to capture screenshot

Solutions:
- Ensure screenshots directory exists
- Check file system permissions
- Verify disk space availability
```

## Maintenance

### Regular Tasks
- Update Chrome path detection for new versions
- Review and update viewport size configurations  
- Analyze performance trends over time
- Update accessibility compliance checks
- Refresh test data and scenarios

### Monitoring
- Test execution time trends
- Screenshot storage usage
- Failure rate analysis
- Performance regression detection

## Future Enhancements

### Planned Improvements
- **Multi-browser Testing** - Firefox, Safari, Edge
- **Mobile Device Testing** - Real device cloud integration
- **A/B Testing Support** - Multiple UI variant validation
- **Performance Budgets** - Automated performance regression detection
- **Visual Diff Reports** - Automated visual regression reporting

### Advanced Features
- **Cross-platform Testing** - Windows, macOS, Linux
- **Accessibility Score Tracking** - Trend analysis over time  
- **User Interaction Recording** - Full user session playback
- **AI-powered Test Generation** - Automated test case creation

This UX testing infrastructure provides comprehensive validation of the Salesforce MCP SSO server's user experience, ensuring professional quality, accessibility compliance, and optimal performance across all devices and network conditions.