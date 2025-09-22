#!/bin/bash

# =============================================================================
# KAYNELA FARMS - GENERATE PACKAGE-LOCK.JSON FILES
# =============================================================================
# This script generates package-lock.json files for all services without installing node_modules
# This is essential for Docker builds using 'npm ci'

echo "🔧 Generating package-lock.json files for all Kaynella Farms services..."

# List of services that need package-lock.json files
SERVICES=(
    "services/booking-service"
    "services/payment-service"
    "services/loyalty-service"
    "services/notification-service"
    "services/reporting-service"
)

# Function to generate package-lock.json for a service
generate_lockfile() {
    local service_path="$1"
    local service_name=$(basename "$service_path")
    
    echo "📦 Generating package-lock.json for $service_name..."
    
    if [ -d "$service_path" ]; then
        cd "$service_path"
        
        # Check if package.json exists
        if [ -f "package.json" ]; then
            # Generate package-lock.json without installing dependencies
            # Use --legacy-peer-deps to resolve peer dependency conflicts
            if npm install --package-lock-only --legacy-peer-deps; then
                echo "✅ Successfully generated package-lock.json for $service_name"
                
                # Verify the file was created
                if [ -f "package-lock.json" ]; then
                    echo "   📁 File size: $(du -h package-lock.json | cut -f1)"
                else
                    echo "   ❌ package-lock.json was not created"
                fi
            else
                echo "   ❌ Failed to generate package-lock.json for $service_name"
            fi
        else
            echo "   ⚠️  package.json not found in $service_path"
        fi
        
        cd - > /dev/null
    else
        echo "   ⚠️  Service directory not found: $service_path"
    fi
    
    echo ""
}

# Generate lockfiles for all services
for service in "${SERVICES[@]}"; do
    generate_lockfile "$service"
done

echo "🎯 Summary:"
echo "   • package-lock.json files generated for Docker builds"
echo "   • No node_modules installed locally"
echo "   • Services ready for 'npm ci' in Docker containers"
echo ""
echo "🚀 Your Kaynella Farms services are now ready for Docker builds!"
echo ""
echo "💡 Next steps:"
echo "   1. Commit the new package-lock.json files to version control"
echo "   2. Run 'docker-compose up --build' to build all services"
echo "   3. The 'npm ci' commands in Dockerfiles will now work correctly"
