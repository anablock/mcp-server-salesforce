interface ErrorResult {
    success: boolean;
    fullName?: string;
    errors?: Array<{
        message: string;
        statusCode?: string;
        fields?: string | string[];
    }> | {
        message: string;
        statusCode?: string;
        fields?: string | string[];
    };
}
export declare function formatMetadataError(result: ErrorResult | ErrorResult[], operation: string): string;
export {};
