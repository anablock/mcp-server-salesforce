FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application (build locally first)
COPY dist/ ./dist/

# Change ownership to non-root user
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port (Heroku will set PORT environment variable)
EXPOSE $PORT

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the HTTP server for web deployment
CMD ["node", "dist/http-server.js"] 