import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { logger } from '../utils/logger.js';
/**
 * Security middleware configuration
 */
export function createSecurityMiddleware(config) {
    return {
        // Helmet for security headers
        helmet: helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", ...config.allowedOrigins],
                    fontSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"],
                },
            },
            crossOriginEmbedderPolicy: false, // Allow iframe embedding for OAuth
        }),
        // General rate limiting
        generalRateLimit: rateLimit({
            windowMs: config.rateLimit.windowMs,
            max: config.rateLimit.maxRequests,
            message: {
                error: 'Too many requests',
                code: 'RATE_LIMITED',
                message: `Too many requests from this IP, please try again after ${config.rateLimit.windowMs / 60000} minutes.`
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                logger.warn('Rate limit exceeded', {
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    path: req.path
                });
                res.status(429).json({
                    error: 'Too many requests',
                    code: 'RATE_LIMITED',
                    message: `Too many requests from this IP, please try again after ${config.rateLimit.windowMs / 60000} minutes.`
                });
            }
        }),
        // Strict rate limiting for authentication endpoints
        authRateLimit: rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 10, // 10 attempts per window per IP
            message: {
                error: 'Too many authentication attempts',
                code: 'AUTH_RATE_LIMITED',
                message: 'Too many authentication attempts. Please wait 15 minutes before trying again.'
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                logger.warn('Auth rate limit exceeded', {
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    path: req.path,
                    userId: req.session?.userId
                });
                res.status(429).json({
                    error: 'Too many authentication attempts',
                    code: 'AUTH_RATE_LIMITED',
                    message: 'Too many authentication attempts. Please wait 15 minutes before trying again.'
                });
            }
        }),
        // Rate limiting for MCP tool calls
        mcpRateLimit: rateLimit({
            windowMs: 1 * 60 * 1000, // 1 minute
            max: 30, // 30 tool calls per minute per session
            keyGenerator: (req) => {
                // Rate limit per session instead of IP for authenticated calls
                return req.session?.id || req.ip || 'unknown';
            },
            message: {
                error: 'Too many MCP requests',
                code: 'MCP_RATE_LIMITED',
                message: 'Too many MCP tool calls. Please wait a moment before trying again.'
            },
            handler: (req, res) => {
                logger.warn('MCP rate limit exceeded', {
                    sessionId: req.session?.id,
                    userId: req.session?.userId,
                    path: req.path,
                    ip: req.ip
                });
                res.status(429).json({
                    error: 'Too many MCP requests',
                    code: 'MCP_RATE_LIMITED',
                    message: 'Too many MCP tool calls. Please wait a moment before trying again.'
                });
            }
        })
    };
}
/**
 * CSRF protection middleware
 */
export function csrfProtection(req, res, next) {
    // Skip CSRF protection for OAuth callback (external redirect)
    if (req.path === '/auth/salesforce/callback') {
        return next();
    }
    // Skip for GET requests (safe operations)
    if (req.method === 'GET') {
        return next();
    }
    // Check for CSRF token in header or body
    const token = req.get('X-CSRF-Token') || req.body.csrfToken;
    const sessionToken = req.session?.csrfToken;
    if (!token || !sessionToken || token !== sessionToken) {
        logger.warn('CSRF token mismatch', {
            path: req.path,
            method: req.method,
            hasToken: !!token,
            hasSessionToken: !!sessionToken,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        return res.status(403).json({
            error: 'CSRF token mismatch',
            code: 'CSRF_ERROR',
            message: 'Invalid or missing CSRF token'
        });
    }
    next();
}
/**
 * Generate and set CSRF token
 */
export function generateCSRFToken(req, res, next) {
    if (!req.session?.csrfToken) {
        const crypto = require('crypto');
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    // Add CSRF token to response headers for client use
    res.setHeader('X-CSRF-Token', req.session.csrfToken);
    next();
}
/**
 * IP whitelist middleware (optional)
 */
export function createIPWhitelist(allowedIPs) {
    if (!allowedIPs || allowedIPs.length === 0) {
        return (req, res, next) => next();
    }
    return (req, res, next) => {
        const clientIP = req.ip || req.connection.remoteAddress || '';
        // Check if IP is in whitelist
        const isAllowed = allowedIPs.some(allowedIP => {
            if (allowedIP.includes('/')) {
                // CIDR notation support (basic)
                const [network, prefix] = allowedIP.split('/');
                // Simplified CIDR check - would need proper implementation for production
                return clientIP.startsWith(network.split('.').slice(0, parseInt(prefix) / 8).join('.'));
            }
            return clientIP === allowedIP;
        });
        if (!isAllowed) {
            logger.warn('IP not in whitelist', {
                clientIP,
                path: req.path,
                userAgent: req.get('User-Agent')
            });
            return res.status(403).json({
                error: 'Access denied',
                code: 'IP_NOT_ALLOWED',
                message: 'Your IP address is not authorized to access this service'
            });
        }
        next();
    };
}
/**
 * Request validation middleware
 */
export function validateRequest(req, res, next) {
    // Validate Content-Type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.get('Content-Type');
        if (contentType && !contentType.includes('application/json') && !contentType.includes('application/x-www-form-urlencoded')) {
            return res.status(415).json({
                error: 'Unsupported Media Type',
                code: 'INVALID_CONTENT_TYPE',
                message: 'Content-Type must be application/json or application/x-www-form-urlencoded'
            });
        }
    }
    // Validate request size
    const contentLength = req.get('Content-Length');
    if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB limit
        return res.status(413).json({
            error: 'Payload too large',
            code: 'PAYLOAD_TOO_LARGE',
            message: 'Request body exceeds maximum size limit'
        });
    }
    next();
}
/**
 * Security headers for API responses
 */
export function securityHeaders(req, res, next) {
    // Prevent caching of sensitive endpoints
    if (req.path.startsWith('/auth/') || req.path.startsWith('/mcp/')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Remove server signature
    res.removeHeader('X-Powered-By');
    next();
}
/**
 * Request timeout middleware
 */
export function requestTimeout(timeoutMs = 30000) {
    return (req, res, next) => {
        const timeout = setTimeout(() => {
            if (!res.headersSent) {
                logger.warn('Request timeout', {
                    path: req.path,
                    method: req.method,
                    timeout: timeoutMs,
                    ip: req.ip
                });
                res.status(408).json({
                    error: 'Request timeout',
                    code: 'TIMEOUT',
                    message: 'Request took too long to process'
                });
            }
        }, timeoutMs);
        res.on('finish', () => clearTimeout(timeout));
        res.on('close', () => clearTimeout(timeout));
        next();
    };
}
/**
 * Health check bypass middleware
 */
export function healthCheckBypass(req, res, next) {
    // Bypass all middleware for health checks
    if (req.path === '/health' || req.path === '/ping') {
        return next();
    }
    next();
}
