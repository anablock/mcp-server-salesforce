import jsforce from 'jsforce';
import { ConnectionConfig } from '../types/connection.js';
/**
 * Enhanced connection utility with improved error handling and token management
 */
export declare class SalesforceConnectionError extends Error {
    code: string;
    statusCode: number;
    isRetryable: boolean;
    constructor(message: string, code: string, statusCode?: number, isRetryable?: boolean);
}
export interface ConnectionResult {
    connection: jsforce;
    refreshed: boolean;
}
/**
 * Creates a Salesforce connection using either username/password or OAuth 2.0 Client Credentials Flow
 * @param config Optional connection configuration
 * @returns Connected jsforce Connection instance
 */
export declare function createSalesforceConnection(config?: ConnectionConfig): Promise<jsforce>;
/**
 * Creates a Salesforce connection for a specific user using stored tokens
 */
export declare function createUserSalesforceConnection(userId: string): Promise<ConnectionResult>;
/**
 * Creates a Salesforce connection for a specific session
 */
export declare function createSessionSalesforceConnection(sessionId: string): Promise<ConnectionResult>;
/**
 * Connection health check
 */
export declare function checkConnectionHealth(conn: any): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
}>;
/**
 * Cleanup connections
 */
export declare function cleanupConnections(): Promise<void>;
