# Production Deployment Guide

This guide covers deploying the Salesforce MCP Server to Railway for production use.

## Railway Deployment

### 1. Prepare for Deployment

1. **Fork/Clone** this repository to your GitHub account
2. **Set up Railway account** at [railway.app](https://railway.app)
3. **Connect your GitHub** repository to Railway

### 2. Environment Variables

Set these environment variables in Railway:

```bash
# Required Salesforce Configuration
SALESFORCE_CONNECTION_TYPE=User_Password
SALESFORCE_USERNAME=your-salesforce-username
SALESFORCE_PASSWORD=your-salesforce-password
SALESFORCE_TOKEN=your-salesforce-security-token
SALESFORCE_INSTANCE_URL=https://login.salesforce.com

# Production Configuration
NODE_ENV=production

# Optional: CORS Configuration (comma-separated)
# ALLOWED_ORIGINS=https://your-client-domain.com,https://another-domain.com
```

### 3. Deploy to Railway

1. **Create a new project** in Railway
2. **Connect your GitHub repository**
3. **Add environment variables** (see above)
4. **Deploy** - Railway will automatically detect the configuration

The deployment uses:
- `railway.json` for build and deploy configuration
- `nixpacks.toml` for Node.js setup
- `Procfile` for the start command
- Production server at `src/production-server.ts`

### 4. Test Your Deployment

Once deployed, your server will be available at:
- **Health check**: `https://your-app.railway.app/health`
- **MCP endpoint**: `https://your-app.railway.app/mcp`
- **Tools list**: `https://your-app.railway.app/tools`

## Using the Production Server

### Local Testing

Test the production server locally:

```bash
# Build the project
npm run build

# Test production server in development mode
npm run dev:production

# Or run production mode
NODE_ENV=production npm run start:production
```

### MCP Client Configuration

#### For Local Development
```
URL: http://localhost:3003/mcp
```

#### For Production (Railway)
```
URL: https://your-app.railway.app/mcp
```

## Server Features

### Production Enhancements

- **Environment-based configuration**
- **Enhanced CORS support** with configurable origins
- **Security headers** for production
- **Comprehensive logging** with timestamps
- **Health check endpoint** for monitoring
- **Error handling** with appropriate status codes
- **Graceful failure modes**

### Endpoints

1. **GET /** - Server information and documentation
2. **GET /health** - Health check (required for Railway)
3. **GET /tools** - List all available Salesforce tools
4. **POST /tools/:toolName** - Execute specific tool (REST API)
5. **GET /mcp** - MCP SSE endpoint
6. **POST /mcp** - MCP JSON-RPC endpoint

### Authentication

The server uses Salesforce Username/Password authentication. Configure these environment variables:

- `SALESFORCE_USERNAME` - Your Salesforce username
- `SALESFORCE_PASSWORD` - Your Salesforce password  
- `SALESFORCE_TOKEN` - Your Salesforce security token
- `SALESFORCE_INSTANCE_URL` - Usually `https://login.salesforce.com`

## Security Considerations

### Production Security

- **CORS Configuration**: Set `ALLOWED_ORIGINS` to restrict client domains
- **Environment Variables**: Never commit credentials to code
- **HTTPS Only**: Railway provides HTTPS by default
- **Security Headers**: Automatically added in production mode

### Environment Variables Security

- Use Railway's environment variable management
- Consider using Railway's secret management for sensitive data
- Rotate credentials regularly

## Monitoring and Maintenance

### Health Checks

The `/health` endpoint provides:
- Server status
- Environment information
- Version details
- Timestamp

### Logs

View logs in Railway dashboard:
- Application logs
- Build logs
- Deployment logs

### Updates

To update the deployment:
1. Push changes to your GitHub repository
2. Railway will automatically redeploy
3. Monitor the deployment logs

## Troubleshooting

### Common Issues

1. **Build Failures**: Check Node.js version compatibility
2. **Connection Issues**: Verify Salesforce credentials
3. **CORS Errors**: Configure `ALLOWED_ORIGINS` correctly
4. **Port Issues**: Railway handles port assignment automatically

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=salesforce-mcp:*
```

## Cost Optimization

### Railway Pricing

- Monitor usage in Railway dashboard
- Consider scaling settings
- Use sleep mode for development instances

### Resource Usage

- The server is lightweight and efficient
- Memory usage typically under 100MB
- CPU usage is minimal during idle periods

## Support

For issues:
1. Check Railway deployment logs
2. Verify environment variables
3. Test Salesforce connectivity
4. Review MCP client configuration

## API Documentation

### REST API

All tools are available via REST API at `/tools/:toolName`:

```bash
# Example: Query Salesforce records
POST https://your-app.railway.app/tools/salesforce_query_records
Content-Type: application/json

{
  "objectName": "Account",
  "fields": ["Id", "Name", "Industry"],
  "limit": 10
}
```

### MCP Protocol

Standard MCP 2024-11-05 protocol support:
- `initialize` - Server initialization
- `tools/list` - List available tools
- `tools/call` - Execute tools
- Server-Sent Events for real-time communication