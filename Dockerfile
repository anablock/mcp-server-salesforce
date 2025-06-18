FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application (build locally first)
COPY dist/ ./dist/

# Expose port (Heroku will set PORT environment variable)
EXPOSE $PORT

# Start the HTTP server for web deployment
CMD ["node", "dist/http-server.js"] 