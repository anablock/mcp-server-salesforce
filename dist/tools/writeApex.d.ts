import { Tool } from "@modelcontextprotocol/sdk/types.js";
export declare const WRITE_APEX: Tool;
export interface WriteApexArgs {
    operation: 'create' | 'update';
    className: string;
    apiVersion?: string;
    body: string;
}
/**
 * Handles creating or updating Apex classes in Salesforce
 * @param conn Active Salesforce connection
 * @param args Arguments for writing Apex classes
 * @returns Tool response with operation result
 */
export declare function handleWriteApex(conn: any, args: WriteApexArgs): Promise<{
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
