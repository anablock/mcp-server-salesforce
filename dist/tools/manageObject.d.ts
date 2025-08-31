import { Tool } from "@modelcontextprotocol/sdk/types.js";
export declare const MANAGE_OBJECT: Tool;
export interface ManageObjectArgs {
    operation: 'create' | 'update';
    objectName: string;
    label?: string;
    pluralLabel?: string;
    description?: string;
    nameFieldLabel?: string;
    nameFieldType?: 'Text' | 'AutoNumber';
    nameFieldFormat?: string;
    sharingModel?: 'ReadWrite' | 'Read' | 'Private' | 'ControlledByParent';
}
export declare function handleManageObject(conn: any, args: ManageObjectArgs): Promise<{
    content: {
        type: string;
        text: string;
    }[];
    isError: boolean;
}>;
