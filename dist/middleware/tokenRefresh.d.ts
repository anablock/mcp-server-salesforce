import { Request, Response, NextFunction } from 'express';
import { SalesforceOAuth } from '../utils/salesforceOAuth.js';
declare global {
    namespace Express {
        interface Request {
            salesforceConnection?: any;
            userId?: string;
        }
    }
}
export interface TokenRefreshMiddlewareOptions {
    oauth: SalesforceOAuth;
    refreshThresholdMinutes?: number;
}
export declare function createTokenRefreshMiddleware(options: TokenRefreshMiddlewareOptions): (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare function requireAuth(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>>;
export declare const authRateLimit: {
    windowMs: number;
    maxRequests: number;
    message: {
        error: string;
        code: string;
        message: string;
    };
};
export declare function addAuthHeaders(req: Request, res: Response, next: NextFunction): void;
