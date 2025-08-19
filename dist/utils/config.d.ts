export interface Config {
    nodeEnv: 'development' | 'production' | 'test';
    port: number;
    baseUrl: string;
    sessionSecret: string;
    allowedOrigins: string[];
    salesforce: {
        clientId: string;
        clientSecret: string;
        redirectUri: string;
        loginUrl: string;
    };
    database?: {
        url: string;
    };
    encryptionKey: string;
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
    logLevel: string;
}
export declare function validateConfig(): Config;
export declare function generateSecureKeys(): {
    sessionSecret: string;
    encryptionKey: string;
};
export declare function validateSalesforceConfig(config: Config): Promise<void>;
