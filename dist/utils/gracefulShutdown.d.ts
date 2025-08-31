import { Server } from 'http';
export interface ShutdownOptions {
    timeout: number;
    signals: string[];
}
export declare class GracefulShutdown {
    private options;
    private server?;
    private isShuttingDown;
    private shutdownPromise?;
    private activeRequests;
    private shutdownHandlers;
    constructor(server: Server, options?: ShutdownOptions);
    private setupSignalHandlers;
    private setupServerTracking;
    addShutdownHandler(handler: () => Promise<void>): void;
    shutdown(exitCode?: number): Promise<void>;
    private performShutdown;
    private stopAcceptingConnections;
    private waitForActiveRequests;
    private runShutdownHandlers;
    private cleanupResources;
    private closeServer;
    isShutdownInProgress(): boolean;
    shutdownMiddleware(): (req: any, res: any, next: any) => void;
}
export declare function createGracefulShutdown(server: Server, options?: Partial<ShutdownOptions>): GracefulShutdown;
export declare function createShutdownHealthCheck(gracefulShutdown: GracefulShutdown): (req: any, res: any) => void;
