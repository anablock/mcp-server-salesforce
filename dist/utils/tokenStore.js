"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenStore = void 0;
const uuid_1 = require("uuid");
class TokenStore {
    constructor() {
        this.connections = new Map();
        this.userSessions = new Map(); // sessionId -> userId
        this.userTokens = new Map(); // userId -> connectionId
    }
    // Store user connection after OAuth
    storeConnection(userId, sessionId, tokens) {
        const connectionId = (0, uuid_1.v4)();
        const connection = {
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
    getConnectionBySession(sessionId) {
        const userId = this.userSessions.get(sessionId);
        if (!userId)
            return null;
        const connectionId = this.userTokens.get(userId);
        if (!connectionId)
            return null;
        const connection = this.connections.get(connectionId);
        if (!connection)
            return null;
        // Update last used
        connection.lastUsed = new Date();
        return connection;
    }
    // Get connection by user ID
    getConnectionByUserId(userId) {
        const connectionId = this.userTokens.get(userId);
        if (!connectionId)
            return null;
        const connection = this.connections.get(connectionId);
        if (!connection)
            return null;
        // Update last used
        connection.lastUsed = new Date();
        return connection;
    }
    // Update tokens after refresh
    updateTokens(userId, tokens) {
        const connectionId = this.userTokens.get(userId);
        if (!connectionId)
            return false;
        const connection = this.connections.get(connectionId);
        if (!connection)
            return false;
        connection.tokens = { ...connection.tokens, ...tokens };
        connection.lastUsed = new Date();
        return true;
    }
    // Remove connection
    removeConnection(userId) {
        const connectionId = this.userTokens.get(userId);
        if (!connectionId)
            return false;
        const connection = this.connections.get(connectionId);
        if (!connection)
            return false;
        this.connections.delete(connectionId);
        this.userSessions.delete(connection.sessionId);
        this.userTokens.delete(userId);
        return true;
    }
    // Check if user has active connection
    hasActiveConnection(userId) {
        return this.userTokens.has(userId);
    }
    // Cleanup expired connections (run periodically)
    cleanup() {
        const now = new Date();
        const expiredConnections = [];
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
    getActiveConnections() {
        return Array.from(this.connections.values());
    }
}
exports.tokenStore = new TokenStore();
// Cleanup every hour
setInterval(() => {
    const cleaned = exports.tokenStore.cleanup();
    if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} expired connections`);
    }
}, 60 * 60 * 1000);
