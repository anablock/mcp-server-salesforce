import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';

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

interface DatabaseConnection {
  id: string;
  user_id: string;
  session_id: string;
  access_token: string;
  refresh_token: string;
  instance_url: string;
  created_at: Date;
  expires_at?: Date;
  last_used: Date;
}

export class PersistentTokenStore {
  private pool: Pool | null = null;
  private encryptionKey: string;
  private fallbackStore: Map<string, UserConnection> = new Map();
  private userSessions: Map<string, string> = new Map();
  private userTokens: Map<string, string> = new Map();

  constructor(databaseUrl?: string, encryptionKey?: string) {
    this.encryptionKey = encryptionKey || process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    
    if (databaseUrl) {
      try {
        this.pool = new Pool({
          connectionString: databaseUrl,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        this.initializeDatabase();
      } catch (error) {
        console.error('Failed to initialize database pool:', error);
        console.log('Falling back to in-memory storage');
      }
    }

    // Cleanup every hour
    setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }

  private async initializeDatabase(): Promise<void> {
    if (!this.pool) return;

    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS salesforce_connections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(255) NOT NULL,
          session_id VARCHAR(255) NOT NULL,
          access_token TEXT NOT NULL,
          refresh_token TEXT NOT NULL,
          instance_url VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          expires_at TIMESTAMP WITH TIME ZONE,
          last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id),
          UNIQUE(session_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_salesforce_connections_user_id ON salesforce_connections(user_id);
        CREATE INDEX IF NOT EXISTS idx_salesforce_connections_session_id ON salesforce_connections(session_id);
        CREATE INDEX IF NOT EXISTS idx_salesforce_connections_last_used ON salesforce_connections(last_used);
      `);
    } catch (error) {
      console.error('Failed to initialize database schema:', error);
      throw error;
    }
  }

  private encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, this.encryptionKey).toString();
  }

  private decrypt(ciphertext: string): string {
    const bytes = CryptoJS.AES.decrypt(ciphertext, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  async storeConnection(userId: string, sessionId: string, tokens: Omit<SalesforceToken, 'userId'>): Promise<string> {
    const connectionId = uuidv4();
    const connection: UserConnection = {
      userId,
      sessionId,
      tokens: { ...tokens, userId },
      lastUsed: new Date()
    };

    if (this.pool) {
      try {
        // Store in database with encryption
        await this.pool.query(`
          INSERT INTO salesforce_connections (
            id, user_id, session_id, access_token, refresh_token, 
            instance_url, created_at, expires_at, last_used
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (user_id) DO UPDATE SET
            session_id = EXCLUDED.session_id,
            access_token = EXCLUDED.access_token,
            refresh_token = EXCLUDED.refresh_token,
            instance_url = EXCLUDED.instance_url,
            expires_at = EXCLUDED.expires_at,
            last_used = EXCLUDED.last_used
        `, [
          connectionId,
          userId,
          sessionId,
          this.encrypt(tokens.accessToken),
          this.encrypt(tokens.refreshToken),
          tokens.instanceUrl,
          tokens.createdAt,
          tokens.expiresAt,
          connection.lastUsed
        ]);
      } catch (error) {
        console.error('Database storage failed, using fallback:', error);
        return this.storeInMemory(userId, sessionId, tokens);
      }
    } else {
      return this.storeInMemory(userId, sessionId, tokens);
    }

    return connectionId;
  }

  private storeInMemory(userId: string, sessionId: string, tokens: Omit<SalesforceToken, 'userId'>): string {
    const connectionId = uuidv4();
    const connection: UserConnection = {
      userId,
      sessionId,
      tokens: { ...tokens, userId },
      lastUsed: new Date()
    };

    this.fallbackStore.set(connectionId, connection);
    this.userSessions.set(sessionId, userId);
    this.userTokens.set(userId, connectionId);

    return connectionId;
  }

  async getConnectionBySession(sessionId: string): Promise<UserConnection | null> {
    if (this.pool) {
      try {
        const result = await this.pool.query<DatabaseConnection>(`
          SELECT * FROM salesforce_connections WHERE session_id = $1
        `, [sessionId]);

        if (result.rows.length > 0) {
          const row = result.rows[0];
          
          // Update last used
          await this.pool.query(`
            UPDATE salesforce_connections SET last_used = NOW() WHERE id = $1
          `, [row.id]);

          return {
            userId: row.user_id,
            sessionId: row.session_id,
            tokens: {
              userId: row.user_id,
              accessToken: this.decrypt(row.access_token),
              refreshToken: this.decrypt(row.refresh_token),
              instanceUrl: row.instance_url,
              createdAt: row.created_at,
              expiresAt: row.expires_at || undefined
            },
            lastUsed: new Date()
          };
        }
      } catch (error) {
        console.error('Database query failed, using fallback:', error);
      }
    }

    // Fallback to in-memory
    const userId = this.userSessions.get(sessionId);
    if (!userId) return null;

    const connectionId = this.userTokens.get(userId);
    if (!connectionId) return null;

    const connection = this.fallbackStore.get(connectionId);
    if (!connection) return null;

    connection.lastUsed = new Date();
    return connection;
  }

  async getConnectionByUserId(userId: string): Promise<UserConnection | null> {
    if (this.pool) {
      try {
        const result = await this.pool.query<DatabaseConnection>(`
          SELECT * FROM salesforce_connections WHERE user_id = $1
        `, [userId]);

        if (result.rows.length > 0) {
          const row = result.rows[0];
          
          // Update last used
          await this.pool.query(`
            UPDATE salesforce_connections SET last_used = NOW() WHERE id = $1
          `, [row.id]);

          return {
            userId: row.user_id,
            sessionId: row.session_id,
            tokens: {
              userId: row.user_id,
              accessToken: this.decrypt(row.access_token),
              refreshToken: this.decrypt(row.refresh_token),
              instanceUrl: row.instance_url,
              createdAt: row.created_at,
              expiresAt: row.expires_at || undefined
            },
            lastUsed: new Date()
          };
        }
      } catch (error) {
        console.error('Database query failed, using fallback:', error);
      }
    }

    // Fallback to in-memory
    const connectionId = this.userTokens.get(userId);
    if (!connectionId) return null;

    const connection = this.fallbackStore.get(connectionId);
    if (!connection) return null;

    connection.lastUsed = new Date();
    return connection;
  }

  async updateTokens(userId: string, tokens: Partial<SalesforceToken>): Promise<boolean> {
    if (this.pool) {
      try {
        const updateFields: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (tokens.accessToken) {
          updateFields.push(`access_token = $${paramCount++}`);
          values.push(this.encrypt(tokens.accessToken));
        }
        if (tokens.refreshToken) {
          updateFields.push(`refresh_token = $${paramCount++}`);
          values.push(this.encrypt(tokens.refreshToken));
        }
        if (tokens.expiresAt) {
          updateFields.push(`expires_at = $${paramCount++}`);
          values.push(tokens.expiresAt);
        }
        
        updateFields.push(`last_used = NOW()`);
        values.push(userId);

        if (updateFields.length > 1) { // More than just last_used
          const result = await this.pool.query(`
            UPDATE salesforce_connections SET ${updateFields.join(', ')} 
            WHERE user_id = $${paramCount}
          `, values);

          return result.rowCount > 0;
        }
      } catch (error) {
        console.error('Database update failed, using fallback:', error);
      }
    }

    // Fallback to in-memory
    const connectionId = this.userTokens.get(userId);
    if (!connectionId) return false;

    const connection = this.fallbackStore.get(connectionId);
    if (!connection) return false;

    connection.tokens = { ...connection.tokens, ...tokens };
    connection.lastUsed = new Date();
    return true;
  }

  async removeConnection(userId: string): Promise<boolean> {
    if (this.pool) {
      try {
        const result = await this.pool.query(`
          DELETE FROM salesforce_connections WHERE user_id = $1
        `, [userId]);

        return result.rowCount > 0;
      } catch (error) {
        console.error('Database delete failed, using fallback:', error);
      }
    }

    // Fallback to in-memory
    const connectionId = this.userTokens.get(userId);
    if (!connectionId) return false;

    const connection = this.fallbackStore.get(connectionId);
    if (!connection) return false;

    this.fallbackStore.delete(connectionId);
    this.userSessions.delete(connection.sessionId);
    this.userTokens.delete(userId);
    return true;
  }

  async hasActiveConnection(userId: string): Promise<boolean> {
    const connection = await this.getConnectionByUserId(userId);
    return connection !== null;
  }

  async cleanup(): Promise<number> {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let cleanedCount = 0;

    if (this.pool) {
      try {
        const result = await this.pool.query(`
          DELETE FROM salesforce_connections 
          WHERE last_used < NOW() - INTERVAL '24 hours'
        `);
        cleanedCount = result.rowCount || 0;
      } catch (error) {
        console.error('Database cleanup failed:', error);
      }
    }

    // Also cleanup in-memory store
    const now = new Date();
    const expiredConnections: string[] = [];

    for (const [connectionId, connection] of this.fallbackStore.entries()) {
      const age = now.getTime() - connection.lastUsed.getTime();
      if (age > maxAge) {
        expiredConnections.push(connectionId);
      }
    }

    for (const connectionId of expiredConnections) {
      const connection = this.fallbackStore.get(connectionId);
      if (connection) {
        this.userSessions.delete(connection.sessionId);
        this.userTokens.delete(connection.userId);
        this.fallbackStore.delete(connectionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired connections`);
    }

    return cleanedCount;
  }

  async getActiveConnections(): Promise<UserConnection[]> {
    const connections: UserConnection[] = [];

    if (this.pool) {
      try {
        const result = await this.pool.query<DatabaseConnection>(`
          SELECT * FROM salesforce_connections ORDER BY last_used DESC
        `);

        for (const row of result.rows) {
          connections.push({
            userId: row.user_id,
            sessionId: row.session_id,
            tokens: {
              userId: row.user_id,
              accessToken: this.decrypt(row.access_token),
              refreshToken: this.decrypt(row.refresh_token),
              instanceUrl: row.instance_url,
              createdAt: row.created_at,
              expiresAt: row.expires_at || undefined
            },
            lastUsed: row.last_used
          });
        }
      } catch (error) {
        console.error('Database query failed, using fallback:', error);
      }
    }

    // Add in-memory connections
    connections.push(...Array.from(this.fallbackStore.values()));

    return connections;
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }
}

// Create singleton instance
const databaseUrl = process.env.DATABASE_URL;
const encryptionKey = process.env.ENCRYPTION_KEY;

export const persistentTokenStore = new PersistentTokenStore(databaseUrl, encryptionKey);