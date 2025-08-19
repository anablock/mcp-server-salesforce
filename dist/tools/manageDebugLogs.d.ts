import { Tool } from "@modelcontextprotocol/sdk/types.js";
export declare const MANAGE_DEBUG_LOGS: Tool;
export interface ManageDebugLogsArgs {
    operation: 'enable' | 'disable' | 'retrieve';
    username: string;
    logLevel?: 'NONE' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'FINE' | 'FINER' | 'FINEST';
    expirationTime?: number;
    limit?: number;
    logId?: string;
    includeBody?: boolean;
}
/**
 * Handles managing debug logs for Salesforce users
 * @param conn Active Salesforce connection
 * @param args Arguments for managing debug logs
 * @returns Tool response with operation results
 */
export declare function handleManageDebugLogs(conn: any, args: ManageDebugLogsArgs): Promise<{
    content: {
        type: string;
        text: string;
    }[];
    isError: boolean;
} | {
    content: {
        type: string;
        text: string;
    }[];
    isError?: undefined;
}>;
