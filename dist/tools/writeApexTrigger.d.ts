import { Tool } from "@modelcontextprotocol/sdk/types.js";
export declare const WRITE_APEX_TRIGGER: Tool;
export interface WriteApexTriggerArgs {
    operation: 'create' | 'update';
    triggerName: string;
    objectName?: string;
    apiVersion?: string;
    body: string;
}
/**
 * Handles creating or updating Apex triggers in Salesforce
 * @param conn Active Salesforce connection
 * @param args Arguments for writing Apex triggers
 * @returns Tool response with operation result
 */
export declare function handleWriteApexTrigger(conn: any, args: WriteApexTriggerArgs): Promise<{
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
