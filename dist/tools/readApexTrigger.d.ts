import { Tool } from "@modelcontextprotocol/sdk/types.js";
export declare const READ_APEX_TRIGGER: Tool;
export interface ReadApexTriggerArgs {
    triggerName?: string;
    namePattern?: string;
    includeMetadata?: boolean;
}
/**
 * Handles reading Apex triggers from Salesforce
 * @param conn Active Salesforce connection
 * @param args Arguments for reading Apex triggers
 * @returns Tool response with Apex trigger information
 */
export declare function handleReadApexTrigger(conn: any, args: ReadApexTriggerArgs): Promise<{
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
