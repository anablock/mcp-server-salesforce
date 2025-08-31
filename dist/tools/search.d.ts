import { Tool } from "@modelcontextprotocol/sdk/types.js";
export declare const SEARCH_OBJECTS: Tool;
export declare function handleSearchObjects(conn: any, searchPattern: string): Promise<{
    content: {
        type: string;
        text: string;
    }[];
    isError: boolean;
}>;
