# Heroku Deployment Guide

This guide will help you deploy the Salesforce MCP Server to Heroku.

## Prerequisites

1. **Heroku CLI** - Install from [https://devcenter.heroku.com/articles/heroku-cli](https://devcenter.heroku.com/articles/heroku-cli)
2. **Git** - For version control
3. **Salesforce Credentials** - Either username/password or OAuth client credentials

## Quick Deploy

### Option 1: Deploy to Heroku Button (Recommended)

Click this button to deploy directly to Heroku:

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/your-username/mcp-server-salesforce)

### Option 2: Manual Deployment

1. **Login to Heroku**
   ```bash
   heroku login
   ```

2. **Create a new Heroku app**
   ```bash
   heroku create your-salesforce-mcp-server
   ```

3. **Set Environment Variables**
   
   For Username/Password authentication:
   ```bash
   heroku config:set SALESFORCE_CONNECTION_TYPE=User_Password
   heroku config:set SALESFORCE_USERNAME=your_username@example.com
   heroku config:set SALESFORCE_PASSWORD=your_password
   heroku config:set SALESFORCE_TOKEN=your_security_token
   heroku config:set SALESFORCE_INSTANCE_URL=https://login.salesforce.com
   ```

   For OAuth 2.0 Client Credentials:
   ```bash
   heroku config:set SALESFORCE_CONNECTION_TYPE=OAuth_2.0_Client_Credentials
   heroku config:set SALESFORCE_CLIENT_ID=your_client_id
   heroku config:set SALESFORCE_CLIENT_SECRET=your_client_secret
   heroku config:set SALESFORCE_INSTANCE_URL=https://your-domain.my.salesforce.com
   ```

4. **Deploy the code**
   ```bash
   git add .
   git commit -m "Prepare for Heroku deployment"
   git push heroku main
   ```

## Post-Deployment

1. **Check the logs**
   ```bash
   heroku logs --tail
   ```

2. **Scale the app** (if needed)
   ```bash
   heroku ps:scale web=1
   ```

3. **Get your app URL**
   ```bash
   heroku apps:info
   ```

## Important Notes

- **MCP Protocol**: This server uses the MCP (Model Context Protocol) which typically communicates via stdio. In a cloud environment, you may need to modify the server to work with HTTP endpoints if you plan to use it differently.

- **Environment Variables**: All Salesforce credentials are stored as environment variables for security.

- **Scaling**: The basic dyno size should be sufficient for most use cases. Scale up if needed.

- **Logs**: Monitor the logs to ensure successful Salesforce connections.

## Troubleshooting

- **Build Failures**: Ensure all dependencies are listed in package.json
- **Connection Issues**: Verify your Salesforce credentials and instance URL
- **Permission Errors**: Check that your Salesforce user has the necessary API permissions

## Security Considerations

- Never commit sensitive credentials to version control
- Use environment variables for all sensitive data
- Consider using OAuth 2.0 for production deployments
- Regularly rotate your Salesforce security tokens

## Support

For issues specific to:
- Heroku deployment: Check Heroku documentation
- Salesforce connection: Verify credentials and API permissions
- MCP protocol: Refer to the MCP documentation 