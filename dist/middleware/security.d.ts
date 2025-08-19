import { Request, Response, NextFunction } from 'express';
import { Config } from '../utils/config.js';
/**
 * Security middleware configuration
 */
export declare function createSecurityMiddleware(config: Config): {
    helmet: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
    generalRateLimit: import("express-rate-limit").RateLimitRequestHandler;
    authRateLimit: import("express-rate-limit").RateLimitRequestHandler;
    mcpRateLimit: import("express-rate-limit").RateLimitRequestHandler;
};
/**
 * CSRF protection middleware
 */
export declare function csrfProtection(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
/**
 * Generate and set CSRF token
 */
export declare function generateCSRFToken(req: Request, res: Response, next: NextFunction): void;
/**
 * IP whitelist middleware (optional)
 */
export declare function createIPWhitelist(allowedIPs: string[]): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Request validation middleware
 */
export declare function validateRequest(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>>;
/**
 * Security headers for API responses
 */
export declare function securityHeaders(req: Request, res: Response, next: NextFunction): void;
/**
 * Request timeout middleware
 */
export declare function requestTimeout(timeoutMs?: number): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Health check bypass middleware
 */
export declare function healthCheckBypass(req: Request, res: Response, next: NextFunction): void;
