import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  loginUrl: string; // https://login.salesforce.com or custom domain
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

export class SalesforceOAuth {
  private config: OAuthConfig;
  private pendingStates: Map<string, { userId: string; sessionId: string; timestamp: number; returnUrl?: string }> = new Map();

  constructor(config: OAuthConfig) {
    this.config = config;
    
    // Cleanup expired states every 10 minutes
    setInterval(() => this.cleanupExpiredStates(), 10 * 60 * 1000);
  }

  // Generate authorization URL
  generateAuthUrl(userId: string, sessionId: string, returnUrl?: string): string {
    const state = uuidv4();
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
  validateState(state: string): { userId: string; sessionId: string } | null {
    const stateInfo = this.pendingStates.get(state);
    if (!stateInfo) return null;

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
  async exchangeCodeForTokens(code: string): Promise<OAuthTokenResponse> {
    const tokenUrl = `${this.config.loginUrl}/services/oauth2/token`;
    
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri
    });

    const response = await fetch(tokenUrl, {
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

    const tokenData = await response.json() as OAuthTokenResponse;
    return tokenData;
  }

  // Refresh access token
  async refreshToken(refreshToken: string, instanceUrl: string): Promise<OAuthTokenResponse> {
    const tokenUrl = `${instanceUrl}/services/oauth2/token`;
    
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    });

    const response = await fetch(tokenUrl, {
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

    const tokenData = await response.json() as OAuthTokenResponse;
    return tokenData;
  }

  // Revoke tokens (logout)
  async revokeToken(token: string, instanceUrl: string): Promise<void> {
    const revokeUrl = `${instanceUrl}/services/oauth2/revoke`;
    
    const body = new URLSearchParams({
      token
    });

    const response = await fetch(revokeUrl, {
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
  async getUserInfo(accessToken: string, instanceUrl: string): Promise<any> {
    const userInfoUrl = `${instanceUrl}/services/oauth2/userinfo`;
    
    const response = await fetch(userInfoUrl, {
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
  private cleanupExpiredStates(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [state, stateInfo] of this.pendingStates.entries()) {
      if (now - stateInfo.timestamp > maxAge) {
        this.pendingStates.delete(state);
      }
    }
  }
}