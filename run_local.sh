#!/bin/bash

set -e

echo "Building Docker image..."
docker build -t brm .

echo "Running Docker container..."
docker run --rm --env-file .env --network host brm
