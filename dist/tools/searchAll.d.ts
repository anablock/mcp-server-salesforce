import { Tool } from "@modelcontextprotocol/sdk/types.js";
export declare const SEARCH_ALL: Tool;
export interface SearchObject {
    name: string;
    fields: string[];
    where?: string;
    orderBy?: string;
    limit?: number;
}
export interface WithClause {
    type: "DATA CATEGORY" | "DIVISION" | "METADATA" | "NETWORK" | "PRICEBOOKID" | "SNIPPET" | "SECURITY_ENFORCED";
    value?: string;
    fields?: string[];
}
export interface SearchAllArgs {
    searchTerm: string;
    searchIn?: "ALL FIELDS" | "NAME FIELDS" | "EMAIL FIELDS" | "PHONE FIELDS" | "SIDEBAR FIELDS";
    objects: SearchObject[];
    withClauses?: WithClause[];
    updateable?: boolean;
    viewable?: boolean;
}
export declare function handleSearchAll(conn: any, args: SearchAllArgs): Promise<{
    content: {
        type: string;
        text: string;
    }[];
    isError: boolean;
}>;
