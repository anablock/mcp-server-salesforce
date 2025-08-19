import { Tool } from "@modelcontextprotocol/sdk/types.js";
export declare const DESCRIBE_OBJECT: Tool;
export declare function handleDescribeObject(conn: any, objectName: string): Promise<{
    content: {
        type: string;
        text: string;
    }[];
    isError: boolean;
}>;
