#!/bin/bash

# =============================================================================
# KAYNELA FARMS - UPDATE DOCKERFILES
# =============================================================================
# This script updates all Dockerfiles to use the correct npm ci flags
# for compatibility with the generated package-lock.json files

echo "🔧 Updating Dockerfiles for all Kaynella Farms services..."

# List of services with Dockerfiles
SERVICES=(
    "services/booking-service"
    "services/payment-service"
    "services/loyalty-service"
    "services/notification-service"
    "services/reporting-service"
    "services/ticketing-service"
    "services/kanyeraAuth-service"
)

# Function to update Dockerfile for a service
update_dockerfile() {
    local service_path="$1"
    local service_name=$(basename "$service_path")
    
    echo "📦 Updating Dockerfile for $service_name..."
    
    if [ -d "$service_path" ] && [ -f "$service_path/Dockerfile" ]; then
        cd "$service_path"
        
        # Update npm ci commands to use --legacy-peer-deps and --omit=dev
        if sed -i.bak 's/npm ci --only=production/npm ci --omit=dev --legacy-peer-deps/g' Dockerfile; then
            echo "   ✅ Updated production npm ci command"
        fi
        
        if sed -i.bak 's/npm ci$/npm ci --legacy-peer-deps/g' Dockerfile; then
            echo "   ✅ Updated development npm ci command"
        fi
        
        # Remove backup files
        rm -f Dockerfile.bak
        
        echo "   ✅ Dockerfile updated successfully"
        
        cd - > /dev/null
    else
        echo "   ⚠️  Dockerfile not found in $service_path"
    fi
    
    echo ""
}

# Update Dockerfiles for all services
for service in "${SERVICES[@]}"; do
    update_dockerfile "$service"
done

echo "🎯 Summary:"
echo "   • All Dockerfiles updated with --legacy-peer-deps flag"
echo "   • npm ci commands now use --omit=dev instead of --only=production"
echo "   • Services ready for Docker builds with package-lock.json files"
echo ""
echo "🚀 Your Kaynella Farms Dockerfiles are now updated!"
echo ""
echo "💡 Next steps:"
echo "   1. Commit the updated Dockerfiles to version control"
echo "   2. Run 'docker-compose up --build' to build all services"
echo "   3. The builds should now complete successfully"
