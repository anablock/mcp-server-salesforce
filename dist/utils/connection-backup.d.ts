import jsforce from 'jsforce';
import { ConnectionConfig } from '../types/connection.js';
/**
 * Creates a Salesforce connection using either username/password or OAuth 2.0 Client Credentials Flow
 * @param config Optional connection configuration
 * @returns Connected jsforce Connection instance
 */
export declare function createSalesforceConnection(config?: ConnectionConfig): Promise<jsforce>;
/**
 * Creates a Salesforce connection for a specific user using stored tokens
 * @param userId User identifier
 * @returns Connected jsforce Connection instance
 */
export declare function createUserSalesforceConnection(userId: string): Promise<any>;
/**
 * Creates a Salesforce connection for a specific session
 * @param sessionId Session identifier
 * @returns Connected jsforce Connection instance
 */
export declare function createSessionSalesforceConnection(sessionId: string): Promise<any>;
