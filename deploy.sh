#!/bin/bash

# BRM Production Deployment Script
# This script handles the complete deployment process:
# 1. Fetch latest trunk
# 2. Run database migrations
# 3. Rebuild Docker image
# 4. Deploy new container

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

# Step 1: Fetch latest trunk
print_status "Fetching latest code from trunk..."
git fetch origin
git checkout trunk
git pull origin trunk
print_success "Code updated to latest trunk"

# Step 2: Run database migrations
print_status "Running database migrations..."
docker-compose -f docker-compose.prod.yml --profile migration up flyway --remove-orphans
if [ $? -eq 0 ]; then
    print_success "Database migrations completed"
else
    print_error "Database migrations failed"
    exit 1
fi

# Step 3: Stop existing containers
print_status "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Step 4: Rebuild Docker image
print_status "Rebuilding Docker image..."
docker-compose -f docker-compose.prod.yml build --no-cache app
if [ $? -eq 0 ]; then
    print_success "Docker image rebuilt successfully"
else
    print_error "Docker image build failed"
    exit 1
fi

# Step 5: Start new containers
print_status "Starting new containers..."
docker-compose -f docker-compose.prod.yml up -d
if [ $? -eq 0 ]; then
    print_success "New containers started successfully"
else
    print_error "Failed to start new containers"
    exit 1
fi

# Step 6: Wait for health checks
print_status "Waiting for services to be healthy..."
sleep 30

# Check if app is healthy
if docker-compose -f docker-compose.prod.yml ps app | grep -q "healthy"; then
    print_success "Application is healthy and running"
else
    print_warning "Application may not be fully healthy yet. Check logs with: docker-compose -f docker-compose.prod.yml logs app"
fi

# Step 7: Show status
print_status "Deployment completed! Service status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
print_success "🎉 BRM deployment completed successfully!"
print_status "Application is running on port 3001"
print_status "To view logs: docker-compose -f docker-compose.prod.yml logs -f app"
print_status "To check status: docker-compose -f docker-compose.prod.yml ps"