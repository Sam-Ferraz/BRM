#!/bin/bash

# Fast Docker build script with BuildKit optimizations
# Usage: ./docker-build.sh [tag]

set -e

# Default tag
TAG=${1:-brm-app:latest}

# Enable BuildKit for faster builds
export DOCKER_BUILDKIT=1

echo "🚀 Building Docker image with optimizations..."
echo "Tag: $TAG"

# Build with cache mount and parallel processing
docker build \
  --tag "$TAG" \
  --target production \
  --cache-from type=local,src=/tmp/.buildx-cache \
  --cache-to type=local,dest=/tmp/.buildx-cache-new,mode=max \
  .

# Rotate cache to prevent it from growing indefinitely
rm -rf /tmp/.buildx-cache
mv /tmp/.buildx-cache-new /tmp/.buildx-cache

echo "✅ Build complete: $TAG"
echo "💡 To run: docker run -p 3002:3002 $TAG"