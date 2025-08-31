import { Tool } from "@modelcontextprotocol/sdk/types.js";
export declare const READ_APEX: Tool;
export interface ReadApexArgs {
    className?: string;
    namePattern?: string;
    includeMetadata?: boolean;
}
/**
 * Handles reading Apex classes from Salesforce
 * @param conn Active Salesforce connection
 * @param args Arguments for reading Apex classes
 * @returns Tool response with Apex class information
 */
export declare function handleReadApex(conn: any, args: ReadApexArgs): Promise<{
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
