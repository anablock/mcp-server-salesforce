export interface SalesforceToken {
    userId: string;
    accessToken: string;
    refreshToken: string;
    instanceUrl: string;
    createdAt: Date;
    expiresAt?: Date;
}
export interface UserConnection {
    userId: string;
    sessionId: string;
    tokens: SalesforceToken;
    lastUsed: Date;
}
declare class TokenStore {
    private connections;
    private userSessions;
    private userTokens;
    storeConnection(userId: string, sessionId: string, tokens: Omit<SalesforceToken, 'userId'>): string;
    getConnectionBySession(sessionId: string): UserConnection | null;
    getConnectionByUserId(userId: string): UserConnection | null;
    updateTokens(userId: string, tokens: Partial<SalesforceToken>): boolean;
    removeConnection(userId: string): boolean;
    hasActiveConnection(userId: string): boolean;
    cleanup(): number;
    getActiveConnections(): UserConnection[];
}
export declare const tokenStore: TokenStore;
export {};
