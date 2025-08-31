import { Request, Response } from 'express';
export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    version: string;
    uptime: number;
    checks: {
        database: HealthCheckResult;
        salesforce: HealthCheckResult;
        memory: HealthCheckResult;
        activeConnections: HealthCheckResult;
    };
}
export interface HealthCheckResult {
    status: 'pass' | 'warn' | 'fail';
    message?: string;
    duration?: number;
    details?: any;
}
export declare function healthCheckHandler(req: Request, res: Response): Promise<void>;
export declare function pingHandler(req: Request, res: Response): void;
export declare function readinessHandler(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function livenessHandler(req: Request, res: Response): void;
export declare function startPeriodicHealthChecks(intervalMs?: number): void;
