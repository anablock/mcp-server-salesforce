"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesforceOAuth = void 0;
const uuid_1 = require("uuid");
const node_fetch_1 = __importDefault(require("node-fetch"));
class SalesforceOAuth {
    constructor(config) {
        this.pendingStates = new Map();
        this.config = config;
        // Cleanup expired states every 10 minutes
        setInterval(() => this.cleanupExpiredStates(), 10 * 60 * 1000);
    }
    // Generate authorization URL
    generateAuthUrl(userId, sessionId, returnUrl) {
        const state = (0, uuid_1.v4)();
        const timestamp = Date.now();
        this.pendingStates.set(state, { userId, sessionId, timestamp, returnUrl });
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri,
            scope: 'full refresh_token',
            state,
            prompt: 'login consent'
        });
        return `${this.config.loginUrl}/services/oauth2/authorize?${params.toString()}`;
    }
    // Validate state and get user info
    validateState(state) {
        const stateInfo = this.pendingStates.get(state);
        if (!stateInfo)
            return null;
        // Check if state is expired (5 minutes)
        const maxAge = 5 * 60 * 1000;
        if (Date.now() - stateInfo.timestamp > maxAge) {
            this.pendingStates.delete(state);
            return null;
        }
        this.pendingStates.delete(state);
        return { userId: stateInfo.userId, sessionId: stateInfo.sessionId };
    }
    // Exchange code for tokens
    async exchangeCodeForTokens(code) {
        const tokenUrl = `${this.config.loginUrl}/services/oauth2/token`;
        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            redirect_uri: this.config.redirectUri
        });
        const response = await (0, node_fetch_1.default)(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body.toString()
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
        }
        const tokenData = await response.json();
        return tokenData;
    }
    // Refresh access token
    async refreshToken(refreshToken, instanceUrl) {
        const tokenUrl = `${instanceUrl}/services/oauth2/token`;
        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret
        });
        const response = await (0, node_fetch_1.default)(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body.toString()
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
        }
        const tokenData = await response.json();
        return tokenData;
    }
    // Revoke tokens (logout)
    async revokeToken(token, instanceUrl) {
        const revokeUrl = `${instanceUrl}/services/oauth2/revoke`;
        const body = new URLSearchParams({
            token
        });
        const response = await (0, node_fetch_1.default)(revokeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body.toString()
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Token revocation failed: ${response.status} ${errorText}`);
        }
    }
    // Get user info from Salesforce
    async getUserInfo(accessToken, instanceUrl) {
        const userInfoUrl = `${instanceUrl}/services/oauth2/userinfo`;
        const response = await (0, node_fetch_1.default)(userInfoUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`User info fetch failed: ${response.status} ${errorText}`);
        }
        return await response.json();
    }
    // Cleanup expired states
    cleanupExpiredStates() {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutes
        for (const [state, stateInfo] of this.pendingStates.entries()) {
            if (now - stateInfo.timestamp > maxAge) {
                this.pendingStates.delete(state);
            }
        }
    }
}
exports.SalesforceOAuth = SalesforceOAuth;
