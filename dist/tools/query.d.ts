import { Tool } from "@modelcontextprotocol/sdk/types.js";
export declare const QUERY_RECORDS: Tool;
export interface QueryArgs {
    objectName: string;
    fields: string[];
    whereClause?: string;
    orderBy?: string;
    limit?: number;
}
export declare function handleQueryRecords(conn: any, args: QueryArgs): Promise<{
    content: {
        type: string;
        text: string;
    }[];
    isError: boolean;
    records?: undefined;
    metadata?: undefined;
} | {
    content: {
        type: string;
        text: string;
    }[];
    records: any;
    metadata: {
        totalSize: any;
        done: any;
        soql: string;
    };
    isError: boolean;
}>;
