import { v4 as uuidv4 } from 'uuid';

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

class TokenStore {
  private connections: Map<string, UserConnection> = new Map();
  private userSessions: Map<string, string> = new Map(); // sessionId -> userId
  private userTokens: Map<string, string> = new Map(); // userId -> connectionId

  // Store user connection after OAuth
  storeConnection(userId: string, sessionId: string, tokens: Omit<SalesforceToken, 'userId'>): string {
    const connectionId = uuidv4();
    const connection: UserConnection = {
      userId,
      sessionId,
      tokens: { ...tokens, userId },
      lastUsed: new Date()
    };

    this.connections.set(connectionId, connection);
    this.userSessions.set(sessionId, userId);
    this.userTokens.set(userId, connectionId);

    return connectionId;
  }

  // Get connection by session ID
  getConnectionBySession(sessionId: string): UserConnection | null {
    const userId = this.userSessions.get(sessionId);
    if (!userId) return null;

    const connectionId = this.userTokens.get(userId);
    if (!connectionId) return null;

    const connection = this.connections.get(connectionId);
    if (!connection) return null;

    // Update last used
    connection.lastUsed = new Date();
    return connection;
  }

  // Get connection by user ID
  getConnectionByUserId(userId: string): UserConnection | null {
    const connectionId = this.userTokens.get(userId);
    if (!connectionId) return null;

    const connection = this.connections.get(connectionId);
    if (!connection) return null;

    // Update last used
    connection.lastUsed = new Date();
    return connection;
  }

  // Update tokens after refresh
  updateTokens(userId: string, tokens: Partial<SalesforceToken>): boolean {
    const connectionId = this.userTokens.get(userId);
    if (!connectionId) return false;

    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    connection.tokens = { ...connection.tokens, ...tokens };
    connection.lastUsed = new Date();
    return true;
  }

  // Remove connection
  removeConnection(userId: string): boolean {
    const connectionId = this.userTokens.get(userId);
    if (!connectionId) return false;

    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    this.connections.delete(connectionId);
    this.userSessions.delete(connection.sessionId);
    this.userTokens.delete(userId);
    return true;
  }

  // Check if user has active connection
  hasActiveConnection(userId: string): boolean {
    return this.userTokens.has(userId);
  }

  // Cleanup expired connections (run periodically)
  cleanup(): number {
    const now = new Date();
    const expiredConnections: string[] = [];
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [connectionId, connection] of this.connections.entries()) {
      const age = now.getTime() - connection.lastUsed.getTime();
      if (age > maxAge) {
        expiredConnections.push(connectionId);
      }
    }

    for (const connectionId of expiredConnections) {
      const connection = this.connections.get(connectionId);
      if (connection) {
        this.userSessions.delete(connection.sessionId);
        this.userTokens.delete(connection.userId);
        this.connections.delete(connectionId);
      }
    }

    return expiredConnections.length;
  }

  // Get all active connections (for debugging)
  getActiveConnections(): UserConnection[] {
    return Array.from(this.connections.values());
  }
}

export const tokenStore = new TokenStore();

// Cleanup every hour
setInterval(() => {
  const cleaned = tokenStore.cleanup();
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired connections`);
  }
}, 60 * 60 * 1000);