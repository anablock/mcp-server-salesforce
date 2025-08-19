import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';
const isProduction = process.env.NODE_ENV === 'production';

// Create logger instance
export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'salesforce-mcp-server',
    version: process.env.npm_package_version || '0.0.0'
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const metaString = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
          return `${timestamp} [${service}] ${level}: ${message} ${metaString}`;
        })
      )
    })
  ]
});

// Add file transport in production
if (isProduction) {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }));

  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }));
}

// Create request logger middleware
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.session?.userId
    };

    if (res.statusCode >= 400) {
      logger.warn('Request completed with error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
};

// Error logger
export const errorLogger = (error: Error, req: any, res: any, next: any) => {
  logger.error('Unhandled error', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      userId: req.session?.userId
    }
  });

  next(error);
};

// Audit logger for sensitive operations
export const auditLogger = {
  loginAttempt: (userId: string, success: boolean, req: any) => {
    logger.info('Login attempt', {
      type: 'AUDIT',
      event: 'LOGIN_ATTEMPT',
      userId,
      success,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  },

  tokenRefresh: (userId: string, success: boolean) => {
    logger.info('Token refresh', {
      type: 'AUDIT',
      event: 'TOKEN_REFRESH',
      userId,
      success
    });
  },

  mcpToolCall: (userId: string, toolName: string, success: boolean, duration: number) => {
    logger.info('MCP tool call', {
      type: 'AUDIT',
      event: 'MCP_TOOL_CALL',
      userId,
      toolName,
      success,
      duration: `${duration}ms`
    });
  },

  logout: (userId: string, req: any) => {
    logger.info('User logout', {
      type: 'AUDIT',
      event: 'LOGOUT',
      userId,
      ip: req.ip
    });
  }
};