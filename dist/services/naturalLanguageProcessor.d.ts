export interface NaturalLanguageRequest {
    request: string;
    userId: string;
    conversationHistory?: Array<{
        request: string;
        response: any;
        timestamp: number;
    }>;
}
export interface NaturalLanguageResponse {
    success: boolean;
    type: 'query' | 'apex' | 'metadata' | 'dml';
    intent: string;
    toolCall?: {
        name: string;
        arguments: any;
    };
    explanation?: string;
    soql?: string;
    apex?: string;
    error?: string;
    executedAt: string;
}
export declare class NaturalLanguageProcessor {
    private claudeApiKey;
    constructor();
    processNaturalLanguageRequest(nlRequest: NaturalLanguageRequest): Promise<NaturalLanguageResponse>;
    private analyzeRequest;
    private callClaudeAPI;
    private fallbackAnalysis;
}
