import { persistentTokenStore } from '../utils/persistentTokenStore.js';
import { logger, auditLogger } from '../utils/logger.js';
export function createTokenRefreshMiddleware(options) {
    const { oauth, refreshThresholdMinutes = 30 } = options;
    return async (req, res, next) => {
        try {
            // Skip token refresh for non-authenticated endpoints
            if (!req.session?.id) {
                return next();
            }
            const connection = await persistentTokenStore.getConnectionBySession(req.session.id);
            if (!connection) {
                return next();
            }
            req.userId = connection.userId;
            // Check if token needs refresh
            const needsRefresh = shouldRefreshToken(connection.tokens, refreshThresholdMinutes);
            if (needsRefresh) {
                logger.info('Token refresh needed', { userId: connection.userId });
                try {
                    const refreshed = await refreshTokens(oauth, connection);
                    if (refreshed) {
                        auditLogger.tokenRefresh(connection.userId, true);
                        logger.info('Token refresh successful', { userId: connection.userId });
                    }
                    else {
                        auditLogger.tokenRefresh(connection.userId, false);
                        logger.warn('Token refresh failed', { userId: connection.userId });
                        // Clear invalid connection
                        await persistentTokenStore.removeConnection(connection.userId);
                        return res.status(401).json({
                            error: 'Authentication expired',
                            code: 'TOKEN_EXPIRED',
                            message: 'Please re-authenticate with Salesforce'
                        });
                    }
                }
                catch (error) {
                    auditLogger.tokenRefresh(connection.userId, false);
                    logger.error('Token refresh error', {
                        userId: connection.userId,
                        error: error instanceof Error ? error.message : String(error)
                    });
                    return res.status(401).json({
                        error: 'Authentication error',
                        code: 'TOKEN_REFRESH_FAILED',
                        message: 'Failed to refresh authentication. Please re-authenticate with Salesforce'
                    });
                }
            }
            next();
        }
        catch (error) {
            logger.error('Token refresh middleware error', {
                error: error instanceof Error ? error.message : String(error)
            });
            next(error);
        }
    };
}
function shouldRefreshToken(tokens, thresholdMinutes) {
    if (!tokens.expiresAt) {
        // If no expiration time, check if token is older than 1 hour
        const tokenAge = Date.now() - new Date(tokens.createdAt).getTime();
        return tokenAge > (60 * 60 * 1000); // 1 hour
    }
    const expirationTime = new Date(tokens.expiresAt).getTime();
    const thresholdTime = expirationTime - (thresholdMinutes * 60 * 1000);
    return Date.now() > thresholdTime;
}
async function refreshTokens(oauth, connection) {
    try {
        const tokenData = await oauth.refreshToken(connection.tokens.refreshToken, connection.tokens.instanceUrl);
        // Update stored tokens
        const updated = await persistentTokenStore.updateTokens(connection.userId, {
            accessToken: tokenData.access_token,
            expiresAt: tokenData.issued_at ? new Date(parseInt(tokenData.issued_at)) : undefined
        });
        return updated;
    }
    catch (error) {
        logger.error('Token refresh failed', {
            userId: connection.userId,
            error: error instanceof Error ? error.message : String(error)
        });
        return false;
    }
}
// Middleware to ensure authentication
export function requireAuth(req, res, next) {
    if (!req.session?.id) {
        return res.status(401).json({
            error: 'Authentication required',
            code: 'NO_SESSION',
            message: 'Please authenticate with Salesforce first'
        });
    }
    // Check if we have a valid user ID (set by token refresh middleware)
    if (!req.userId) {
        return res.status(401).json({
            error: 'Invalid session',
            code: 'INVALID_SESSION',
            message: 'Session is invalid. Please re-authenticate with Salesforce'
        });
    }
    next();
}
// Rate limiting for authentication endpoints
export const authRateLimit = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 attempts per window
    message: {
        error: 'Too many authentication attempts',
        code: 'RATE_LIMITED',
        message: 'Please wait before trying again'
    }
};
// Middleware to add CORS headers for authentication endpoints
export function addAuthHeaders(req, res, next) {
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Add cache control for auth endpoints
    if (req.path.startsWith('/auth/')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
}
