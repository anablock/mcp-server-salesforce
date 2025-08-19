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
export declare class PersistentTokenStore {
    private pool;
    private encryptionKey;
    private fallbackStore;
    private userSessions;
    private userTokens;
    constructor(databaseUrl?: string, encryptionKey?: string);
    private initializeDatabase;
    private encrypt;
    private decrypt;
    storeConnection(userId: string, sessionId: string, tokens: Omit<SalesforceToken, 'userId'>): Promise<string>;
    private storeInMemory;
    getConnectionBySession(sessionId: string): Promise<UserConnection | null>;
    getConnectionByUserId(userId: string): Promise<UserConnection | null>;
    updateTokens(userId: string, tokens: Partial<SalesforceToken>): Promise<boolean>;
    removeConnection(userId: string): Promise<boolean>;
    hasActiveConnection(userId: string): Promise<boolean>;
    cleanup(): Promise<number>;
    getActiveConnections(): Promise<UserConnection[]>;
    close(): Promise<void>;
}
export declare const persistentTokenStore: PersistentTokenStore;
