#!/bin/bash

# BRM Application Deployment Script
# Usage: ./deploy.sh [environment] [region]

set -e

# Default values
ENVIRONMENT=${1:-production}
AWS_REGION=${2:-us-east-1}
APP_NAME="brm-app"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== BRM Application Deployment ===${NC}"
echo -e "${YELLOW}Environment: ${ENVIRONMENT}${NC}"
echo -e "${YELLOW}Region: ${AWS_REGION}${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI not found. Please install AWS CLI${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker not found. Please install Docker${NC}"
    exit 1
fi

if ! docker ps &> /dev/null; then
    echo -e "${RED}Docker is not running. Please start Docker${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}AWS credentials not configured. Please run 'aws configure'${NC}"
    exit 1
fi

echo -e "${GREEN}Prerequisites check passed${NC}"
echo ""

# Set environment variables
export APP_NAME=$APP_NAME
export ENVIRONMENT=$ENVIRONMENT
export AWS_REGION=$AWS_REGION

# Deploy infrastructure
echo -e "${YELLOW}Step 1: Deploying infrastructure...${NC}"
make deploy-infrastructure

# Build and push image
echo -e "${YELLOW}Step 2: Building and pushing Docker image...${NC}"
make push-image

# Update ECS service
echo -e "${YELLOW}Step 3: Updating ECS service...${NC}"
make update-service

# Wait for deployment
echo -e "${YELLOW}Step 4: Waiting for deployment to complete...${NC}"
make wait-for-deployment

# Get application URL
echo -e "${GREEN}=== Deployment Completed Successfully! ===${NC}"
echo ""
echo -e "${GREEN}Application URL:${NC}"
make get-url
echo ""
echo -e "${YELLOW}Note: It may take a few minutes for the load balancer to be fully ready.${NC}"
echo -e "${YELLOW}You can check the status with: make status${NC}"
echo -e "${YELLOW}You can view logs with: make logs${NC}"