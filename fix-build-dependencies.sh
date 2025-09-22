#!/bin/bash

# =============================================================================
# KAYNELA FARMS - FIX BUILD DEPENDENCIES
# =============================================================================
# This script adds necessary build dependencies to Dockerfiles for native packages
# like canvas, chart.js, and qrcode that require compilation

echo "🔧 Fixing build dependencies in Dockerfiles for native packages..."

# Services that need build dependencies (have canvas, chart.js, qrcode, etc.)
SERVICES_WITH_NATIVE_DEPS=(
    "services/kanyeraAuth-service"
    "services/reporting-service"
    "services/ticketing-service"
)

# Function to fix build dependencies in a Dockerfile
fix_build_dependencies() {
    local service_path="$1"
    local service_name=$(basename "$service_path")
    
    echo "📦 Fixing build dependencies for $service_name..."
    
    if [ -d "$service_path" ] && [ -f "$service_path/Dockerfile" ]; then
        cd "$service_path"
        
        # Check if Dockerfile already has comprehensive build dependencies
        if grep -q "cairo-dev" Dockerfile; then
            echo "   ✅ Dockerfile already has build dependencies"
        else
            echo "   🔧 Adding build dependencies..."
            
            # Create backup
            cp Dockerfile Dockerfile.backup
            
            # Add comprehensive build dependencies after FROM line
            if sed -i.bak '/^FROM node:18-alpine/a\
# Install dependencies for native modules (canvas, chart.js, qrcode, etc.)\
RUN apk add --no-cache \\\
    python3 \\\
    make \\\
    g++ \\\
    cairo-dev \\\
    jpeg-dev \\\
    pango-dev \\\
    musl-dev \\\
    pixman-dev \\\
    pangomm-dev \\\
    libjpeg-turbo-dev \\\
    freetype-dev \\\
    && rm -rf /var/cache/apk/*' Dockerfile; then
                echo "   ✅ Build dependencies added successfully"
            else
                echo "   ❌ Failed to add build dependencies"
                # Restore backup
                mv Dockerfile.backup Dockerfile
            fi
            
            # Remove backup files
            rm -f Dockerfile.bak Dockerfile.backup
        fi
        
        cd - > /dev/null
    else
        echo "   ⚠️  Dockerfile not found in $service_path"
    fi
    
    echo ""
}

# Fix build dependencies for all services
for service in "${SERVICES_WITH_NATIVE_DEPS[@]}"; do
    fix_build_dependencies "$service"
done

echo "🎯 Summary:"
echo "   • Build dependencies added to Dockerfiles with native packages"
echo "   • Services now have Python, make, g++, and graphics libraries"
echo "   • Canvas, chart.js, and qrcode packages should build successfully"
echo ""
echo "🚀 Your Dockerfiles are now ready for native package compilation!"
echo ""
echo "💡 Next steps:"
echo "   1. Commit the updated Dockerfiles"
echo "   2. Run 'docker-compose up --build' again"
echo "   3. The native package compilation should now succeed"
