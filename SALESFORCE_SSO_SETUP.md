# Salesforce SSO Setup Guide

This guide will help you set up Salesforce Single Sign-On (SSO) with your MCP server, allowing users to connect their individual Salesforce instances to notepad.ai.

## Prerequisites

- Salesforce org (Production or Sandbox)
- Admin access to create Connected Apps
- Heroku app (or other hosting platform)

## Step 1: Create Salesforce Connected App

1. **Login to your Salesforce org** as an administrator

2. **Navigate to App Manager**:
   - Setup → Apps → App Manager
   - Click "New Connected App"

3. **Fill in Basic Information**:

   ```text
   Connected App Name: Notepad AI MCP Server
   API Name: Notepad_AI_MCP_Server
   Contact Email: your-email@domain.com
   Description: MCP Server for Notepad AI Salesforce integration
   ```

4. **Enable OAuth Settings**:
   - ✅ Check "Enable OAuth Settings"
   - **Callback URL**: `https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/auth/salesforce/callback`
   - **Selected OAuth Scopes**:
     - ✅ Full access (full)
     - ✅ Perform requests at any time (refresh_token, offline_access)
     - ✅ Access the identity URL service (id, profile, email, address, phone)

5. **Additional Settings**:
   - ✅ Check "Require Secret for Web Server Flow"
   - ✅ Check "Require Secret for Refresh Token Flow"
   - ⚠️ **Important**: Leave "Enable Client Credentials Flow" UNCHECKED for SSO

6. **Save and Continue**

7. **Copy Your Credentials**:
   - **Consumer Key** (Client ID)
   - **Consumer Secret** (Client Secret) - Click "Click to reveal"

## Step 2: Configure Heroku Environment Variables

Set these environment variables in your Heroku app:

```bash
# Required Salesforce OAuth Configuration
heroku config:set SALESFORCE_CLIENT_ID=your_consumer_key_from_step_1
heroku config:set SALESFORCE_CLIENT_SECRET=your_consumer_secret_from_step_1

# Server Configuration
heroku config:set SESSION_SECRET=$(openssl rand -hex 32)
heroku config:set BASE_URL=https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com
heroku config:set SALESFORCE_REDIRECT_URI=https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/auth/salesforce/callback

# CORS Configuration
heroku config:set ALLOWED_ORIGINS=https://notepad.ai,https://your-frontend-domain.com

# Salesforce Login URL (optional - defaults to login.salesforce.com)
heroku config:set SALESFORCE_LOGIN_URL=https://login.salesforce.com
# For sandbox orgs: heroku config:set SALESFORCE_LOGIN_URL=https://test.salesforce.com

# MCP Mode
heroku config:set MCP_MODE=http
```

## Step 3: Deploy to Heroku

1. **Commit your changes**:

   ```bash
   git add .
   git commit -m "Add Salesforce SSO support"
   ```

2. **Deploy to Heroku**:

   ```bash
   git push heroku main
   ```

3. **Verify deployment**:

   ```bash
   heroku logs --tail
   ```

4. **Test health check**:

   ```bash
   curl https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/health
   ```

## Step 4: Test SSO Flow

1. **Start OAuth flow**:

   ```text
   https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/auth/salesforce/login?user_id=test_user_123
   ```

2. **Expected flow**:
   - Redirects to Salesforce login
   - User logs in to Salesforce
   - User grants permissions
   - Redirects back to success page
   - Tokens are stored in server memory

3. **Test MCP tool call**:

   ```bash
   curl -X POST https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/mcp/call \
     -H "Content-Type: application/json" \
     -H "Cookie: connect.sid=your_session_cookie" \
     -d '{
       "name": "salesforce_search_objects",
       "arguments": {
         "searchPattern": "Account"
       }
     }'
   ```

## Step 5: Integrate with Notepad.ai

### Frontend Integration

Add this to your notepad.ai frontend:

```typescript
// Initiate Salesforce connection
const connectSalesforce = async (userId: string) => {
  const returnUrl = encodeURIComponent(window.location.href);
  const authUrl = `https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/auth/salesforce/login?user_id=${userId}&return_url=${returnUrl}`;
  
  // Open popup or redirect
  window.open(authUrl, 'salesforce-auth', 'width=600,height=700');
};

// Check connection status
const checkSalesforceConnection = async () => {
  const response = await fetch('https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/auth/status', {
    credentials: 'include'
  });
  return response.json();
};

// Call MCP tools
const callSalesforceTool = async (toolName: string, args: any) => {
  const response = await fetch('https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/mcp/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name: toolName, arguments: args })
  });
  return response.json();
};
```

### Backend Integration

If you need server-side integration:

```typescript
// Store user's MCP session
app.post('/api/salesforce/connect', async (req, res) => {
  const { userId } = req.body;
  
  // Generate session for user
  const sessionId = generateSessionId();
  
  // Store mapping in your database
  await storeUserSession(userId, sessionId);
  
  // Redirect to MCP server OAuth
  const authUrl = `https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/auth/salesforce/login?user_id=${userId}&return_url=${req.body.returnUrl}`;
  res.json({ authUrl });
});
```

## Step 6: Production Considerations

### Security Hardening

1. **Secure session secret**:

   ```bash
   heroku config:set SESSION_SECRET=$(openssl rand -hex 64)
   ```

2. **Restrict CORS origins**:

   ```bash
   heroku config:set ALLOWED_ORIGINS=https://notepad.ai
   ```

3. **Use HTTPS everywhere**:

   ```bash
   heroku config:set NODE_ENV=production
   ```

### Monitoring

1. **Add Heroku logging**:

   ```bash
   heroku addons:create papertrail
   ```

2. **Monitor health**:

   ```bash
   heroku addons:create newrelic
   ```

### Scaling

1. **Auto-scaling**:

   ```bash
   heroku ps:scale web=1:standard-1x
   heroku addons:create scheduler:standard
   ```

2. **Database for token persistence** (optional):

   ```bash
   heroku addons:create heroku-postgresql:mini
   ```

## Troubleshooting

### Common Issues

1. **"Invalid redirect_uri"**:
   - Check that `SALESFORCE_REDIRECT_URI` matches Connected App callback URL exactly
   - Ensure HTTPS in production

2. **"Invalid client_id"**:
   - Verify `SALESFORCE_CLIENT_ID` is correct Consumer Key from Connected App
   - Check for extra spaces or characters

3. **CORS errors**:
   - Add your frontend domain to `ALLOWED_ORIGINS`
   - Ensure `credentials: 'include'` in frontend requests

4. **Session not found**:
   - Check that cookies are being sent with requests
   - Verify session configuration in production

### Debug Mode

Enable debug logging:

```bash
heroku config:set DEBUG=salesforce:*
heroku logs --tail
```

### Test Endpoints

- **Health**: `GET https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/health`
- **Auth Status**: `GET https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/auth/status`
- **Available Tools**: `GET https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/mcp/tools`
- **Start OAuth**: `GET https://vuk-salesforce-mcp-acef9db54bd2.herokuapp.com/auth/salesforce/login?user_id=test`

## Architecture Overview

```text
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Notepad.ai    │────│  MCP SSO Server  │────│   Salesforce     │
│   Frontend      │    │   (Heroku)       │    │     Org          │
└─────────────────┘    └──────────────────┘    └──────────────────┘
         │                       │                       │
         │ 1. Connect Request    │ 2. OAuth Flow        │
         │ 4. Tool Calls         │ 3. Token Exchange     │
         │                       │ 5. API Calls          │
```

## Next Steps

1. **Set up Connected App** ✅
2. **Configure Heroku environment** ✅  
3. **Deploy and test** ✅
4. **Integrate with frontend** 📋
5. **Add error handling** 📋
6. **Monitor and scale** 📋

For additional support, check the server logs or create an issue in the repository.