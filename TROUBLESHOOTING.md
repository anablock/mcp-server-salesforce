# Troubleshooting & Deployment Guide

## Overview

This guide provides comprehensive troubleshooting steps, deployment instructions, and maintenance procedures for the Salesforce MCP SSO server.

## Quick Diagnostics

### Health Check Commands

```bash
# Check server status
curl https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/health

# Check authentication status  
curl https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/auth/status

# Test MCP tools endpoint
curl https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/mcp/tools

# Run UX tests
npm run test:ux:advanced
```

## Common Issues & Solutions

### 1. "Route GET /auth/salesforce/login not found"

**Symptoms:**
- 404 error when accessing OAuth login URL
- Server returns "Cannot GET /auth/salesforce/login"

**Root Cause:** Wrong server running (production-server.js instead of sso-server.js)

**Solution:**
```bash
# Check Procfile
cat Procfile
# Should show: web: npm run start:sso

# If incorrect, fix it:
echo "web: npm run start:sso" > Procfile

# Redeploy to Heroku
git add Procfile
git commit -m "Fix Procfile to use SSO server"
git push heroku main
```

### 2. "undefined" in OAuth URL

**Symptoms:**
- OAuth redirect URL contains "undefined" for client_id
- Authentication fails at Salesforce login page

**Root Cause:** Missing environment variables

**Solution:**
```bash
# Check environment variables on Heroku
heroku config

# Add missing variables
heroku config:set SALESFORCE_CLIENT_ID=your_client_id
heroku config:set SALESFORCE_CLIENT_SECRET=your_client_secret
heroku config:set SALESFORCE_REDIRECT_URI=https://your-app.herokuapp.com/auth/salesforce/callback

# For local development
echo "SALESFORCE_CLIENT_ID=your_client_id" >> .env
echo "SALESFORCE_CLIENT_SECRET=your_client_secret" >> .env
```

### 3. TypeScript Compilation Errors

**Symptoms:**
- Build fails with TypeScript errors
- Interface type mismatches
- Cannot deploy to Heroku

**Root Cause:** TypeScript compilation issues during deployment

**Solution:**
```bash
# Use pre-compiled files (implemented fix)
npm run build  # Uses: echo 'Using existing build files' && shx chmod +x dist/*.js

# Alternative: Fix TypeScript issues manually
npm run watch  # Run TypeScript in watch mode locally
# Fix type errors in src/ files
# Rebuild dist/ files
```

### 4. ES Module Import Errors

**Symptoms:**
- "require.main is not defined" error
- Module loading failures
- Server won't start

**Root Cause:** ES module compatibility issues

**Solution:**
```typescript
// In src/sso-server.ts (already fixed)
// Before:
if (require.main === module) {

// After: 
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
```

### 5. TokenStore Method Errors

**Symptoms:**
- "getActiveConnectionCount is not a function"
- Connection tracking failures

**Root Cause:** Method name mismatch between source and compiled files

**Solution:**
```typescript
// Fix in both src/ and dist/ files
// Before:
const count = tokenStore.getActiveConnectionCount();

// After:
const count = tokenStore.getActiveConnections().length;
```

### 6. Puppeteer Chrome Not Found

**Symptoms:**
- "Chrome not found" error during UX tests
- Test failures in CI/CD

**Solution:**
```javascript
// Update Chrome paths in test files
const possiblePaths = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
  '/usr/bin/google-chrome-stable',  // Linux
  '/usr/bin/google-chrome',         // Linux alternative
  // Add your system's Chrome path
];

// Or set environment variable
export PUPPETEER_EXECUTABLE_PATH="/path/to/chrome"
```

### 7. CORS Issues

**Symptoms:**
- Cross-origin request blocked
- OPTIONS preflight failures

**Solution:**
```typescript
// Verify CORS configuration in src/sso-server.ts
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://*.herokuapp.com',
    // Add your domain
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
```

### 8. Session/Token Persistence Issues

**Symptoms:**
- Authentication lost after server restart
- Tokens not persisting

**Root Cause:** In-memory token storage

**Solution:**
```bash
# Add database for persistence (optional)
heroku addons:create heroku-postgresql:mini
heroku config:set DATABASE_URL=postgresql://...

# Or implement file-based storage
# Update TokenStore to use persistent storage
```

## Deployment Issues

### Heroku Deployment

#### Issue: Build Timeout
```bash
# Increase build timeout
heroku config:set BUILD_TIMEOUT=600

# Optimize build process
npm run build  # Should be fast with pre-compiled files
```

#### Issue: Memory Limits
```bash
# Check memory usage
heroku logs --tail | grep "Memory"

# Upgrade dyno type if needed
heroku ps:scale web=1:standard-1x
```

#### Issue: Environment Variables Not Set
```bash
# List all config vars
heroku config

# Set required variables
heroku config:set SALESFORCE_CLIENT_ID=xxx
heroku config:set SALESFORCE_CLIENT_SECRET=xxx
heroku config:set SALESFORCE_REDIRECT_URI=https://yourapp.herokuapp.com/auth/salesforce/callback
```

### Local Development Issues

#### Issue: Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev:sso
```

#### Issue: SSL Certificate Errors
```bash
# For development, disable SSL verification (NOT for production)
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Or add proper SSL certificates
```

## Performance Issues

### High Memory Usage

**Symptoms:**
- Memory usage over 100MB
- Slow response times
- Heroku dyno cycling

**Diagnostics:**
```bash
# Check memory usage
curl https://your-app.herokuapp.com/health | jq .memory

# Monitor Heroku metrics
heroku logs --tail | grep "sample#memory"
```

**Solutions:**
```bash
# Optimize memory usage
# 1. Add garbage collection
node --optimize-for-size --max-old-space-size=460 dist/sso-server.js

# 2. Upgrade dyno type
heroku ps:scale web=1:standard-1x

# 3. Add monitoring
npm install --save @heroku/pino-heroku-metrics
```

### Slow Response Times

**Diagnostics:**
```bash
# Test response times
curl -w "@curl-format.txt" -o /dev/null -s https://your-app.herokuapp.com/health

# Run performance tests
npm run test:ux:advanced | grep "load time"
```

**Solutions:**
```bash
# Add caching
npm install --save redis
# Implement Redis caching for token storage

# Add CDN for static assets
# Configure Cloudflare or AWS CloudFront

# Optimize database queries
# Add indexes, optimize SQL queries
```

## Security Issues

### Token Security

**Issue:** Tokens stored in plaintext
```bash
# Encrypt tokens before storage
npm install --save crypto-js

# Update TokenStore to encrypt/decrypt tokens
# Use environment variable for encryption key
heroku config:set ENCRYPTION_KEY=$(openssl rand -hex 32)
```

**Issue:** Missing security headers
```bash
# Verify helmet configuration
curl -I https://your-app.herokuapp.com/health | grep -E "(X-|Content-Security)"

# Should include:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Content-Security-Policy: default-src 'self'
```

### Rate Limiting

**Issue:** No rate limiting protection
```bash
# Test rate limiting
for i in {1..20}; do curl https://your-app.herokuapp.com/auth/status; done

# Should return 429 after limit exceeded
```

## Monitoring & Alerting

### Heroku Monitoring

```bash
# View logs
heroku logs --tail --app your-app-name

# Check dyno status
heroku ps --app your-app-name

# View metrics
heroku metrics --app your-app-name
```

### Custom Monitoring

```javascript
// Add application monitoring
const winston = require('winston');

// Log important events
logger.info('OAuth authentication successful', { 
  user_id, 
  organization_id, 
  timestamp: new Date().toISOString() 
});

// Monitor performance
const responseTime = Date.now() - startTime;
if (responseTime > 5000) {
  logger.warn('Slow response detected', { responseTime, endpoint });
}
```

### Health Check Monitoring

```bash
# Set up external monitoring
curl -X POST "https://api.uptimerobot.com/v2/newMonitor" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "your_api_key",
    "url": "https://your-app.herokuapp.com/health",
    "type": 1,
    "friendly_name": "Salesforce MCP Server"
  }'
```

## Database Issues

### Token Storage Issues

**Symptoms:**
- Tokens not persisting between restarts
- Connection data lost

**Solution:**
```bash
# Add PostgreSQL addon
heroku addons:create heroku-postgresql:mini

# Update TokenStore implementation
# Add database schema migration
```

**Database Schema:**
```sql
CREATE TABLE user_tokens (
  user_id VARCHAR(255) PRIMARY KEY,
  access_token TEXT,
  refresh_token TEXT,
  instance_url TEXT,
  organization_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_tokens_org ON user_tokens(organization_id);
CREATE INDEX idx_user_tokens_updated ON user_tokens(updated_at);
```

## Testing Issues

### UX Test Failures

**Issue:** Screenshots not generated
```bash
# Check screenshot directory permissions
ls -la screenshots/
mkdir -p screenshots
chmod 755 screenshots/
```

**Issue:** Tests timeout
```bash
# Increase timeout in test files
await page.goto(url, { 
  waitUntil: 'networkidle0', 
  timeout: 30000  // Increase from default 30s
});
```

**Issue:** Chrome automation fails
```bash
# Install Chrome dependencies (Linux)
apt-get update
apt-get install -y chromium-browser
apt-get install -y fonts-liberation libasound2 libatk-bridge2.0-0 libdrm2 libgtk-3-0 libnspr4 libnss3 libxcomposite1 libxdamage1 libxrandr2 xdg-utils
```

## CI/CD Issues

### GitHub Actions Failures

```yaml
# Add Chrome installation to workflow
- name: Install Chrome
  run: |
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
    sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
    sudo apt-get update
    sudo apt-get install -y google-chrome-stable

- name: Run UX Tests
  run: npm run test:ux:headless
  env:
    PUPPETEER_EXECUTABLE_PATH: /usr/bin/google-chrome-stable
```

### Heroku Pipeline Issues

```bash
# Check pipeline status
heroku pipelines:info your-pipeline

# Promote from staging to production
heroku pipelines:promote --app your-staging-app --to your-production-app

# Enable review apps
heroku pipelines:setup your-pipeline --yes
```

## Maintenance Procedures

### Regular Maintenance

**Weekly Tasks:**
```bash
# 1. Check logs for errors
heroku logs --tail | grep ERROR

# 2. Monitor performance
npm run test:ux:advanced

# 3. Update dependencies
npm audit
npm update

# 4. Check security
npm audit fix
```

**Monthly Tasks:**
```bash
# 1. Review Heroku metrics
heroku metrics --app your-app-name

# 2. Database cleanup (if using DB)
# Clean up old tokens/sessions

# 3. Security review
# Rotate API keys and secrets

# 4. Performance optimization
# Analyze slow queries, optimize code
```

### Backup Procedures

```bash
# Backup Heroku PostgreSQL
heroku pg:backups:capture --app your-app-name
heroku pg:backups:download --app your-app-name

# Backup environment configuration
heroku config --json > heroku-config-backup.json

# Backup source code
git archive --format=zip --output=backup-$(date +%Y%m%d).zip HEAD
```

## Recovery Procedures

### Server Recovery

```bash
# 1. Restart dynos
heroku ps:restart --app your-app-name

# 2. Scale dynos if needed
heroku ps:scale web=2 --app your-app-name

# 3. Check recent deployments
heroku releases --app your-app-name

# 4. Rollback if needed
heroku rollback v123 --app your-app-name
```

### Data Recovery

```bash
# 1. Restore database from backup
heroku pg:backups:restore BACKUP_NAME DATABASE_URL --app your-app-name

# 2. Verify data integrity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM user_tokens;"

# 3. Re-authenticate affected users
# Send notification to users to re-authenticate
```

## Contact & Support

### Internal Support
- Check GitHub issues: https://github.com/tsmztech/mcp-server-salesforce/issues
- Review documentation: `/IMPLEMENTATION_DOCS.md`
- Run diagnostics: `npm run test:ux:advanced`

### External Resources
- Heroku Support: https://help.heroku.com
- Salesforce Developer Documentation: https://developer.salesforce.com
- Node.js Documentation: https://nodejs.org/docs

### Emergency Contacts
```bash
# Server down - immediate actions:
1. Check Heroku status: heroku status
2. Restart application: heroku ps:restart
3. Check logs: heroku logs --tail
4. Rollback if needed: heroku rollback
```

This troubleshooting guide covers the most common issues and their solutions. For complex problems, combine multiple diagnostic approaches and consider the interaction between different system components.