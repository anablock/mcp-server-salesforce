import { Request, Response } from 'express';
import { persistentTokenStore } from './persistentTokenStore.js';
import { checkConnectionHealth, createSalesforceConnection } from './improvedConnection.js';
import { logger } from './logger.js';

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

class HealthChecker {
  private startTime: number;

  public getStartTime(): number {
    return this.startTime;
  }

  constructor() {
    this.startTime = Date.now();
  }

  async performHealthCheck(detailed: boolean = false): Promise<HealthStatus> {
    const startTime = Date.now();
    const checks = {
      database: await this.checkDatabase(),
      salesforce: await this.checkSalesforce(),
      memory: await this.checkMemory(),
      activeConnections: await this.checkActiveConnections()
    };

    const overallStatus = this.determineOverallStatus(checks);
    const duration = Date.now() - startTime;

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.0.0',
      uptime: Date.now() - this.startTime,
      checks
    };

    // Log health check results
    if (overallStatus !== 'healthy') {
      logger.warn('Health check completed with issues', { 
        status: overallStatus, 
        duration: `${duration}ms`,
        failedChecks: Object.entries(checks)
          .filter(([_, check]) => check.status === 'fail')
          .map(([name]) => name)
      });
    } else {
      logger.debug('Health check completed successfully', { duration: `${duration}ms` });
    }

    return healthStatus;
  }

  private async checkDatabase(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      // Try to get active connections count
      const connections = await persistentTokenStore.getActiveConnections();
      const duration = Date.now() - start;

      return {
        status: 'pass',
        message: `Database accessible, ${connections.length} active connections`,
        duration,
        details: {
          connectionsCount: connections.length
        }
      };
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Database health check failed', { error: error instanceof Error ? error.message : String(error) });
      
      return {
        status: 'fail',
        message: 'Database connection failed',
        duration,
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  private async checkSalesforce(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      // Try to create a basic connection to test Salesforce connectivity
      const conn = await createSalesforceConnection();
      const healthResult = await checkConnectionHealth(conn);
      const duration = Date.now() - start;

      if (healthResult.healthy) {
        return {
          status: 'pass',
          message: 'Salesforce API accessible',
          duration,
          details: {
            latency: healthResult.latency
          }
        };
      } else {
        return {
          status: 'warn',
          message: 'Salesforce API issues detected',
          duration,
          details: {
            error: healthResult.error
          }
        };
      }
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Salesforce health check failed', { error: error instanceof Error ? error.message : String(error) });
      
      return {
        status: process.env.SALESFORCE_CLIENT_ID ? 'fail' : 'warn',
        message: process.env.SALESFORCE_CLIENT_ID ? 'Salesforce connection failed' : 'Salesforce not configured',
        duration,
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  private async checkMemory(): Promise<HealthCheckResult> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    let status: 'pass' | 'warn' | 'fail' = 'pass';
    let message = `Memory usage: ${memoryUsagePercent.toFixed(1)}%`;

    if (memoryUsagePercent > 90) {
      status = 'fail';
      message = `Critical memory usage: ${memoryUsagePercent.toFixed(1)}%`;
    } else if (memoryUsagePercent > 80) {
      status = 'warn';
      message = `High memory usage: ${memoryUsagePercent.toFixed(1)}%`;
    }

    return {
      status,
      message,
      details: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
        external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB',
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
        usagePercent: Math.round(memoryUsagePercent * 100) / 100
      }
    };
  }

  private async checkActiveConnections(): Promise<HealthCheckResult> {
    try {
      const connections = await persistentTokenStore.getActiveConnections();
      const now = Date.now();
      const recentConnections = connections.filter(conn => 
        now - conn.lastUsed.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
      );

      return {
        status: 'pass',
        message: `${connections.length} total, ${recentConnections.length} recent connections`,
        details: {
          totalConnections: connections.length,
          recentConnections: recentConnections.length,
          oldestConnection: connections.length > 0 
            ? Math.min(...connections.map(c => c.lastUsed.getTime()))
            : null
        }
      };
    } catch (error) {
      return {
        status: 'warn',
        message: 'Unable to check active connections',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  private determineOverallStatus(checks: HealthStatus['checks']): 'healthy' | 'degraded' | 'unhealthy' {
    const checkValues = Object.values(checks);
    
    if (checkValues.some(check => check.status === 'fail')) {
      return 'unhealthy';
    }
    
    if (checkValues.some(check => check.status === 'warn')) {
      return 'degraded';
    }
    
    return 'healthy';
  }
}

const healthChecker = new HealthChecker();

// Express route handlers
export async function healthCheckHandler(req: Request, res: Response) {
  try {
    const detailed = req.query.detailed === 'true';
    const healthStatus = await healthChecker.performHealthCheck(detailed);
    
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Health check handler failed', { error: error instanceof Error ? error.message : String(error) });
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      message: 'Health check failed',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Simple ping endpoint
export function pingHandler(req: Request, res: Response) {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Date.now() - healthChecker.getStartTime()
  });
}

// Ready/liveness probe handlers for Kubernetes
export async function readinessHandler(req: Request, res: Response) {
  try {
    const healthStatus = await healthChecker.performHealthCheck(false);
    
    if (healthStatus.status === 'unhealthy') {
      return res.status(503).json({
        ready: false,
        message: 'Service not ready'
      });
    }
    
    res.json({
      ready: true,
      message: 'Service is ready'
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      message: 'Readiness check failed'
    });
  }
}

export function livenessHandler(req: Request, res: Response) {
  // Simple liveness check - just verify the process is running
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: Date.now() - healthChecker.getStartTime()
  });
}

// Periodic health check (optional background monitoring)
export function startPeriodicHealthChecks(intervalMs: number = 5 * 60 * 1000) {
  setInterval(async () => {
    try {
      const healthStatus = await healthChecker.performHealthCheck(true);
      
      if (healthStatus.status === 'unhealthy') {
        logger.error('Periodic health check failed', { healthStatus });
      } else if (healthStatus.status === 'degraded') {
        logger.warn('Periodic health check shows degraded status', { healthStatus });
      } else {
        logger.debug('Periodic health check passed', { 
          uptime: healthStatus.uptime,
          activeConnections: healthStatus.checks.activeConnections.details?.totalConnections
        });
      }
    } catch (error) {
      logger.error('Periodic health check error', { error: error instanceof Error ? error.message : String(error) });
    }
  }, intervalMs);
}