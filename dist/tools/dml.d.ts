import { Tool } from "@modelcontextprotocol/sdk/types.js";
export declare const DML_RECORDS: Tool;
export interface DMLArgs {
    operation: 'insert' | 'update' | 'delete' | 'upsert';
    objectName: string;
    records: Record<string, any>[];
    externalIdField?: string;
}
export declare function handleDMLRecords(conn: any, args: DMLArgs): Promise<{
    content: {
        type: string;
        text: string;
    }[];
    isError: boolean;
}>;
