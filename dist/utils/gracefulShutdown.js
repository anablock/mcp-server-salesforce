import { persistentTokenStore } from './persistentTokenStore.js';
import { logger } from './logger.js';
export class GracefulShutdown {
    constructor(server, options = {
        timeout: 30000, // 30 seconds
        signals: ['SIGTERM', 'SIGINT']
    }) {
        this.options = options;
        this.isShuttingDown = false;
        this.activeRequests = new Set();
        this.shutdownHandlers = [];
        this.server = server;
        this.setupSignalHandlers();
        this.setupServerTracking();
    }
    setupSignalHandlers() {
        this.options.signals.forEach(signal => {
            process.on(signal, () => {
                logger.info(`Received ${signal}, starting graceful shutdown...`);
                this.shutdown();
            });
        });
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception, shutting down gracefully', { error: error.message, stack: error.stack });
            this.shutdown(1);
        });
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled promise rejection, shutting down gracefully', { reason, promise });
            this.shutdown(1);
        });
    }
    setupServerTracking() {
        if (!this.server)
            return;
        // Track active connections
        this.server.on('request', (req, res) => {
            this.activeRequests.add(req);
            res.on('finish', () => {
                this.activeRequests.delete(req);
            });
            res.on('close', () => {
                this.activeRequests.delete(req);
            });
        });
        // Prevent new connections during shutdown
        this.server.on('connection', (socket) => {
            if (this.isShuttingDown) {
                socket.destroy();
                return;
            }
            // Set timeout for idle connections
            socket.setTimeout(30000, () => {
                logger.warn('Destroying idle socket during shutdown');
                socket.destroy();
            });
        });
    }
    addShutdownHandler(handler) {
        this.shutdownHandlers.push(handler);
    }
    async shutdown(exitCode = 0) {
        if (this.isShuttingDown) {
            logger.info('Shutdown already in progress');
            return this.shutdownPromise;
        }
        this.isShuttingDown = true;
        const startTime = Date.now();
        this.shutdownPromise = this.performShutdown(exitCode, startTime);
        return this.shutdownPromise;
    }
    async performShutdown(exitCode, startTime) {
        try {
            logger.info('Starting graceful shutdown process', {
                activeRequests: this.activeRequests.size,
                timeout: this.options.timeout
            });
            // Set a timeout for the entire shutdown process
            const shutdownTimeout = setTimeout(() => {
                logger.error('Shutdown timeout reached, forcing exit');
                process.exit(exitCode || 1);
            }, this.options.timeout);
            // Step 1: Stop accepting new connections
            await this.stopAcceptingConnections();
            // Step 2: Wait for active requests to complete
            await this.waitForActiveRequests();
            // Step 3: Run custom shutdown handlers
            await this.runShutdownHandlers();
            // Step 4: Close database connections and cleanup
            await this.cleanupResources();
            // Step 5: Close the server
            await this.closeServer();
            clearTimeout(shutdownTimeout);
            const duration = Date.now() - startTime;
            logger.info(`Graceful shutdown completed in ${duration}ms`);
            process.exit(exitCode);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            logger.error('Error during graceful shutdown', {
                error: error instanceof Error ? error.message : String(error),
                duration
            });
            process.exit(exitCode || 1);
        }
    }
    async stopAcceptingConnections() {
        return new Promise((resolve) => {
            if (!this.server) {
                resolve();
                return;
            }
            this.server.close(() => {
                logger.info('Server stopped accepting new connections');
                resolve();
            });
        });
    }
    async waitForActiveRequests() {
        const maxWaitTime = Math.min(this.options.timeout - 5000, 20000); // Leave 5s buffer
        const pollInterval = 100;
        let waited = 0;
        logger.info(`Waiting for ${this.activeRequests.size} active requests to complete`);
        while (this.activeRequests.size > 0 && waited < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            waited += pollInterval;
            if (waited % 1000 === 0) { // Log every second
                logger.info(`Still waiting for ${this.activeRequests.size} active requests (${waited}ms elapsed)`);
            }
        }
        if (this.activeRequests.size > 0) {
            logger.warn(`Proceeding with ${this.activeRequests.size} active requests still pending`);
        }
        else {
            logger.info('All active requests completed');
        }
    }
    async runShutdownHandlers() {
        logger.info(`Running ${this.shutdownHandlers.length} shutdown handlers`);
        const handlerPromises = this.shutdownHandlers.map(async (handler, index) => {
            try {
                const start = Date.now();
                await handler();
                const duration = Date.now() - start;
                logger.info(`Shutdown handler ${index + 1} completed in ${duration}ms`);
            }
            catch (error) {
                logger.error(`Shutdown handler ${index + 1} failed`, {
                    error: error instanceof Error ? error.message : String(error)
                });
                // Continue with other handlers even if one fails
            }
        });
        await Promise.allSettled(handlerPromises);
        logger.info('All shutdown handlers completed');
    }
    async cleanupResources() {
        logger.info('Cleaning up resources');
        try {
            // Close database connections
            await persistentTokenStore.close();
            logger.info('Database connections closed');
        }
        catch (error) {
            logger.error('Error closing database connections', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
        try {
            // Perform final cleanup of expired tokens
            const cleaned = await persistentTokenStore.cleanup();
            logger.info(`Final cleanup: removed ${cleaned} expired connections`);
        }
        catch (error) {
            logger.error('Error during final cleanup', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async closeServer() {
        return new Promise((resolve) => {
            if (!this.server) {
                resolve();
                return;
            }
            // Force close any remaining connections
            this.server.closeAllConnections?.();
            logger.info('Server closed');
            resolve();
        });
    }
    isShutdownInProgress() {
        return this.isShuttingDown;
    }
    // Middleware to reject requests during shutdown
    shutdownMiddleware() {
        return (req, res, next) => {
            if (this.isShuttingDown) {
                res.status(503).json({
                    error: 'Service unavailable',
                    code: 'SHUTTING_DOWN',
                    message: 'Server is shutting down, please try again later'
                });
                return;
            }
            next();
        };
    }
}
// Factory function to create and configure graceful shutdown
export function createGracefulShutdown(server, options) {
    const defaultOptions = {
        timeout: 30000,
        signals: ['SIGTERM', 'SIGINT']
    };
    const finalOptions = { ...defaultOptions, ...options };
    const gracefulShutdown = new GracefulShutdown(server, finalOptions);
    // Add common shutdown handlers
    gracefulShutdown.addShutdownHandler(async () => {
        logger.info('Performing application-specific cleanup');
        // Add any application-specific cleanup here
    });
    return gracefulShutdown;
}
// Health check during shutdown
export function createShutdownHealthCheck(gracefulShutdown) {
    return (req, res) => {
        if (gracefulShutdown.isShutdownInProgress()) {
            res.status(503).json({
                status: 'shutting_down',
                message: 'Server is shutting down',
                timestamp: new Date().toISOString()
            });
        }
        else {
            res.status(200).json({
                status: 'ok',
                message: 'Server is operational',
                timestamp: new Date().toISOString()
            });
        }
    };
}
