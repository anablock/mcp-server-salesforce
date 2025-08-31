export interface OAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    loginUrl: string;
}
export interface OAuthTokenResponse {
    access_token: string;
    refresh_token: string;
    instance_url: string;
    id: string;
    token_type: string;
    issued_at: string;
    signature: string;
}
export declare class SalesforceOAuth {
    private config;
    private pendingStates;
    constructor(config: OAuthConfig);
    generateAuthUrl(userId: string, sessionId: string, returnUrl?: string): string;
    validateState(state: string): {
        userId: string;
        sessionId: string;
        returnUrl?: string;
    } | null;
    exchangeCodeForTokens(code: string): Promise<OAuthTokenResponse>;
    refreshToken(refreshToken: string, instanceUrl: string): Promise<OAuthTokenResponse>;
    revokeToken(token: string, instanceUrl: string): Promise<void>;
    getUserInfo(accessToken: string, instanceUrl: string): Promise<any>;
    private cleanupExpiredStates;
}
