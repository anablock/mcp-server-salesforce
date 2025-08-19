import Joi from 'joi';
import { logger } from './logger.js';

export interface Config {
  // Server configuration
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  baseUrl: string;
  
  // Session configuration
  sessionSecret: string;
  
  // CORS configuration
  allowedOrigins: string[];
  
  // Salesforce OAuth configuration
  salesforce: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    loginUrl: string;
  };
  
  // Database configuration
  database?: {
    url: string;
  };
  
  // Encryption
  encryptionKey: string;
  
  // Rate limiting
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  
  // Logging
  logLevel: string;
}

const configSchema = Joi.object({
  nodeEnv: Joi.string().valid('development', 'production', 'test').default('development'),
  port: Joi.number().port().default(3000),
  baseUrl: Joi.string().uri().required(),
  
  sessionSecret: Joi.string().min(32).required(),
  
  allowedOrigins: Joi.array().items(Joi.string().uri()).min(1).required(),
  
  salesforce: Joi.object({
    clientId: Joi.string().required(),
    clientSecret: Joi.string().required(),
    redirectUri: Joi.string().uri().required(),
    loginUrl: Joi.string().uri().default('https://login.salesforce.com')
  }).required(),
  
  database: Joi.object({
    url: Joi.string().uri().required()
  }).optional(),
  
  encryptionKey: Joi.string().min(32).required(),
  
  rateLimit: Joi.object({
    windowMs: Joi.number().positive().default(15 * 60 * 1000), // 15 minutes
    maxRequests: Joi.number().positive().default(100)
  }).default(),
  
  logLevel: Joi.string().valid('error', 'warn', 'info', 'debug').default('info')
});

function loadConfig(): Config {
  const rawConfig = {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT ? parseInt(process.env.PORT) : undefined,
    baseUrl: process.env.BASE_URL,
    
    sessionSecret: process.env.SESSION_SECRET,
    
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [],
    
    salesforce: {
      clientId: process.env.SALESFORCE_CLIENT_ID,
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
      redirectUri: process.env.SALESFORCE_REDIRECT_URI,
      loginUrl: process.env.SALESFORCE_LOGIN_URL
    },
    
    database: process.env.DATABASE_URL ? {
      url: process.env.DATABASE_URL
    } : undefined,
    
    encryptionKey: process.env.ENCRYPTION_KEY,
    
    rateLimit: {
      windowMs: process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS) : undefined,
      maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) : undefined
    },
    
    logLevel: process.env.LOG_LEVEL
  };

  const { error, value } = configSchema.validate(rawConfig, {
    abortEarly: false,
    allowUnknown: false
  });

  if (error) {
    const errorMessages = error.details.map(detail => detail.message).join(', ');
    throw new Error(`Configuration validation failed: ${errorMessages}`);
  }

  return value as Config;
}

export function validateConfig(): Config {
  try {
    const config = loadConfig();
    
    // Additional validation for production
    if (config.nodeEnv === 'production') {
      const productionChecks = [
        {
          condition: config.baseUrl.startsWith('https://'),
          message: 'BASE_URL must use HTTPS in production'
        },
        {
          condition: config.salesforce.redirectUri.startsWith('https://'),
          message: 'SALESFORCE_REDIRECT_URI must use HTTPS in production'
        },
        {
          condition: config.sessionSecret.length >= 64,
          message: 'SESSION_SECRET should be at least 64 characters in production'
        },
        {
          condition: config.encryptionKey.length >= 64,
          message: 'ENCRYPTION_KEY should be at least 64 characters in production'
        }
      ];

      const failedChecks = productionChecks.filter(check => !check.condition);
      if (failedChecks.length > 0) {
        const messages = failedChecks.map(check => check.message).join(', ');
        throw new Error(`Production validation failed: ${messages}`);
      }
    }

    logger.info('Configuration validated successfully', {
      nodeEnv: config.nodeEnv,
      port: config.port,
      hasDatabase: !!config.database,
      allowedOriginsCount: config.allowedOrigins.length
    });

    return config;
  } catch (error) {
    logger.error('Configuration validation failed', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// Generate secure random keys for development
export function generateSecureKeys(): { sessionSecret: string; encryptionKey: string } {
  const crypto = require('crypto');
  return {
    sessionSecret: crypto.randomBytes(64).toString('hex'),
    encryptionKey: crypto.randomBytes(64).toString('hex')
  };
}

// Validate Salesforce OAuth configuration
export async function validateSalesforceConfig(config: Config): Promise<void> {
  try {
    // Test if the client ID and secret are valid by attempting to get metadata
    const response = await fetch(`${config.salesforce.loginUrl}/services/oauth2/.well-known/openid_configuration`);
    
    if (!response.ok) {
      throw new Error(`Failed to reach Salesforce OAuth endpoint: ${response.status}`);
    }

    const metadata = await response.json();
    logger.info('Salesforce OAuth configuration validated', {
      issuer: metadata.issuer,
      authorizationEndpoint: metadata.authorization_endpoint,
      tokenEndpoint: metadata.token_endpoint
    });
  } catch (error) {
    logger.warn('Salesforce OAuth configuration validation failed', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    // Don't throw - this is a soft validation
  }
}