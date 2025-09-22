# =============================================================================
# KAINELLA REPORTING SERVICE - DOCKERFILE
# =============================================================================

# Use multi-stage build for smaller production image
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++ \
    curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev --legacy-peer-deps --ignore-engines && npm cache clean --force

# Remove build dependencies
RUN apk del .build-deps

# Production stage
FROM node:20-alpine AS production

# Install runtime dependencies for native packages
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    musl \
    pixman \
    pangomm \
    libjpeg-turbo \
    freetype \
    curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Create necessary directories
RUN mkdir -p /app/logs && \
    chown -R nodejs:nodejs /app/logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3007

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3007/health || exit 1

# Start the application
CMD ["npm", "start"]
