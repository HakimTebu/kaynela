# Netflix-Level Production Nginx Gateway
# Optimized for security and performance

FROM nginx:1.25-alpine

# Install security updates and monitoring tools
RUN apk add --no-cache --upgrade \
    curl \
    openssl \
    tzdata \
    && rm -rf /var/cache/apk/*

# Create necessary directories with proper permissions
RUN mkdir -p /var/log/nginx /var/cache/nginx /etc/nginx/conf.d && \
    chown -R nginx:nginx /var/log/nginx /var/cache/nginx /etc/nginx/conf.d

# Copy configuration files
COPY nginx.conf /etc/nginx/nginx.conf
COPY cors_preflight.conf /etc/nginx/cors_preflight.conf

# Set proper permissions
RUN chown nginx:nginx /etc/nginx/nginx.conf /etc/nginx/cors_preflight.conf && \
    chmod 644 /etc/nginx/nginx.conf /etc/nginx/cors_preflight.conf

# Create health check script
RUN echo '#!/bin/sh\ncurl -f http://localhost:8080/health || exit 1' > /usr/local/bin/healthcheck && \
    chmod +x /usr/local/bin/healthcheck

# Switch to non-root user (nginx user already exists in base image)
# USER nginx  # Commented out to fix permission issues with /var/run/nginx.pid

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck

# Start nginx
CMD ["nginx", "-g", "daemon off;"]