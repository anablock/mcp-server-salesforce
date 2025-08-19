import winston from 'winston';
export declare const logger: winston.Logger;
export declare const requestLogger: (req: any, res: any, next: any) => void;
export declare const errorLogger: (error: Error, req: any, res: any, next: any) => void;
export declare const auditLogger: {
    loginAttempt: (userId: string, success: boolean, req: any) => void;
    tokenRefresh: (userId: string, success: boolean) => void;
    mcpToolCall: (userId: string, toolName: string, success: boolean, duration: number) => void;
    logout: (userId: string, req: any) => void;
};
