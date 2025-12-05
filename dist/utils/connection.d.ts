import { ConnectionConfig } from '../types/connection.js';
interface JSForceConnection {
    instanceUrl?: string;
    accessToken?: string;
    refreshToken?: string;
    login(username: string, password: string): Promise<any>;
    on(event: string, handler: Function): void;
    query(soql: string): Promise<any>;
    identity(): Promise<any>;
}
/**
 * Creates a Salesforce connection using either username/password or OAuth 2.0 Client Credentials Flow
 * @param config Optional connection configuration
 * @returns Connected jsforce Connection instance
 */
export declare function createSalesforceConnection(config?: ConnectionConfig): Promise<JSForceConnection>;
/**
 * Creates a Salesforce connection for a specific user using stored tokens
 * @param userId User identifier
 * @returns Connected jsforce Connection instance
 */
export declare function createUserSalesforceConnection(userId: string): Promise<JSForceConnection>;
/**
 * Creates a Salesforce connection for a specific session
 * @param sessionId Session identifier
 * @returns Connected jsforce Connection instance
 */
export declare function createSessionSalesforceConnection(sessionId: string): Promise<JSForceConnection>;
export {};
