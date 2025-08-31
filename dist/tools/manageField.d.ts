import { Tool } from "@modelcontextprotocol/sdk/types.js";
export declare const MANAGE_FIELD: Tool;
export interface ManageFieldArgs {
    operation: 'create' | 'update';
    objectName: string;
    fieldName: string;
    label?: string;
    type?: string;
    required?: boolean;
    unique?: boolean;
    externalId?: boolean;
    length?: number;
    precision?: number;
    scale?: number;
    referenceTo?: string;
    relationshipLabel?: string;
    relationshipName?: string;
    deleteConstraint?: 'Cascade' | 'Restrict' | 'SetNull';
    picklistValues?: Array<{
        label: string;
        isDefault?: boolean;
    }>;
    description?: string;
}
export declare function handleManageField(conn: any, args: ManageFieldArgs): Promise<{
    content: {
        type: string;
        text: string;
    }[];
    isError: boolean;
}>;
