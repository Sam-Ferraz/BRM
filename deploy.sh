#!/bin/bash

# BRM Production Deployment Script with Zero-Downtime
# This script handles the complete deployment process using Docker Swarm:
# 1. Initialize Docker Swarm (if needed)
# 2. Fetch latest trunk
# 3. Run database migrations
# 4. Deploy with rolling updates (zero-downtime)

set -e  # Exit on any error

echo "🚀 Starting BRM deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the correct directory
if [ ! -f "package.json" ] || [ ! -f "docker-compose.prod.yml" ]; then
    print_error "This script must be run from the BRM project root directory"
    exit 1
fi

# Copy production environment file to repository
if [ -f "/root/brm/production.env" ]; then
    print_status "Copying production.env to repository"
    cp /root/brm/production.env .env
    print_success "Production environment file copied"
else
    print_error "Production environment file not found at /root/brm/production.env"
    exit 1
fi

# Step 1: Initialize Docker Swarm if not already active
print_status "Checking Docker Swarm status..."
if ! docker info | grep -q "Swarm: active"; then
    print_status "Initializing Docker Swarm..."
    docker swarm init --advertise-addr $(hostname -I | awk '{print $1}')
    print_success "Docker Swarm initialized"
else
    print_status "Docker Swarm already active"
fi

# Step 2: Fetch latest trunk
print_status "Fetching latest code from trunk..."
git fetch origin
git checkout trunk
git pull origin trunk
print_success "Code updated to latest trunk"

# Step 3: Create network if it doesn't exist (for Swarm overlay network)
print_status "Ensuring Docker overlay network exists..."
if ! docker network ls | grep -q "brm-prod-network"; then
    print_status "Creating brm-prod-network overlay network..."
    docker network create --driver overlay --attachable brm-prod-network
    print_success "Overlay network brm-prod-network created"
else
    print_status "Network brm-prod-network already exists"
fi

# Step 4: Run database migrations (using Docker Swarm service)
print_status "Running database migrations..."
# First, ensure postgres service is running for migrations
docker stack deploy -c docker-compose.prod.yml brm --with-registry-auth
sleep 10  # Wait for postgres to be ready

# Run migration as a one-time service
docker service create \
    --name brm_migration \
    --network brm-prod-network \
    --mount type=bind,source=/root/Repos/brm/db/migrations,target=/flyway/sql \
    --mount type=bind,source=/root/Repos/brm/flyway.conf,target=/flyway/conf/flyway.conf \
    --env FLYWAY_URL=jdbc:postgresql://brm_postgres:5432/brm \
    --env FLYWAY_USER=postgres \
    --env FLYWAY_PASSWORD=brm_muito_loko_birl \
    --env FLYWAY_SCHEMAS=public \
    --env FLYWAY_CONNECT_RETRIES=60 \
    --env FLYWAY_CONNECT_RETRIES_INTERVAL=1 \
    --restart-condition none \
    flyway/flyway:11.11.1 migrate

# Wait for migration to complete
print_status "Waiting for database migration to complete..."
while docker service ps brm_migration --format "{{.CurrentState}}" | grep -q "Running\|Pending"; do
    sleep 2
    print_status "Migration still running..."
done

# Check if migration succeeded
if docker service ps brm_migration --format "{{.CurrentState}}" | grep -q "Complete"; then
    print_success "Database migrations completed successfully"
    docker service rm brm_migration
else
    print_error "Database migrations failed"
    docker service logs brm_migration
    docker service rm brm_migration
    exit 1
fi

# Step 5: Build Docker image
print_status "Building Docker image..."
docker compose -f docker-compose.prod.yml build --no-cache app
if [ $? -eq 0 ]; then
    print_success "Docker image built successfully"
else
    print_error "Docker image build failed"
    exit 1
fi

# Step 6: Deploy stack with zero-downtime rolling updates
print_status "Deploying stack with rolling updates (zero-downtime)..."
docker stack deploy -c docker-compose.prod.yml brm --with-registry-auth
if [ $? -eq 0 ]; then
    print_success "Stack deployed successfully"
else
    print_error "Stack deployment failed"
    exit 1
fi

# Step 7: Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 30

# Monitor deployment progress
print_status "Monitoring deployment progress..."
for i in {1..12}; do
    if docker service ls --format "{{.Name}} {{.Replicas}}" | grep "brm_app" | grep -q "2/2"; then
        print_success "All app replicas are running"
        break
    else
        print_status "Waiting for app replicas to be ready... ($i/12)"
        sleep 10
    fi
    
    if [ $i -eq 12 ]; then
        print_warning "Deployment may still be in progress. Check service status with: docker service ls"
    fi
done

# Step 8: Show status
print_status "Deployment completed! Service status:"
docker service ls
docker stack ps brm

echo ""
print_success "🎉 BRM zero-downtime deployment completed successfully!"
print_status "Application is running on port 3001 with 2 replicas"
print_status "To view logs: docker service logs -f brm_app"
print_status "To check status: docker service ls"
print_status "To scale replicas: docker service scale brm_app=N"
print_status "To remove stack: docker stack rm brm"
