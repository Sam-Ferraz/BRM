#!/bin/bash

# Load environment variables
set -a
source .env
set +a

# Create schema directory
mkdir -p db/schema

# Run pg_dump with Docker
docker run --rm \
  -e PGPASSWORD="$DB_PASSWORD" \
  postgres:17 \
  pg_dump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --schema-only \
    --no-owner \
    --no-privileges \
    > db/schema/current-schema.sql

echo "Schema dumped to db/schema/current-schema.sql"