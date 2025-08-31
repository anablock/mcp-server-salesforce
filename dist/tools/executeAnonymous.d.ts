import { Tool } from "@modelcontextprotocol/sdk/types.js";
export declare const EXECUTE_ANONYMOUS: Tool;
export interface ExecuteAnonymousArgs {
    apexCode: string;
    logLevel?: 'NONE' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'FINE' | 'FINER' | 'FINEST';
}
/**
 * Handles executing anonymous Apex code in Salesforce
 * @param conn Active Salesforce connection
 * @param args Arguments for executing anonymous Apex
 * @returns Tool response with execution results and debug logs
 */
export declare function handleExecuteAnonymous(conn: any, args: ExecuteAnonymousArgs): Promise<{
    content: {
        type: string;
        text: string;
    }[];
    isError?: undefined;
} | {
    content: {
        type: string;
        text: string;
    }[];
    isError: boolean;
}>;
