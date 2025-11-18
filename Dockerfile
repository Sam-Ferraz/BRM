# Multi-stage build for production deployment
FROM node:18-alpine AS deps

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --silent

# Builder stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

# Copy source code
COPY . .

# Build the application (client + server)
RUN npm run build && npm run server:build

# Production dependencies stage
FROM node:18-alpine AS prod-deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production --silent

# Production stage
FROM node:18-alpine AS production

# Install dumb-init, curl, tar, bash (Flyway wrapper uses bash), glibc compat libs, and system JRE for Flyway
RUN apk add --no-cache dumb-init curl tar bash libc6-compat gcompat openjdk17-jre-headless

# Install Flyway CLI (used for in-container migrations)
ARG FLYWAY_VERSION=11.17.0
RUN curl -L "https://download.red-gate.com/maven/release/com/redgate/flyway/flyway-commandline/${FLYWAY_VERSION}/flyway-commandline-${FLYWAY_VERSION}-linux-x64.tar.gz" \
    -o /tmp/flyway.tar.gz \
 && tar -xzf /tmp/flyway.tar.gz -C /opt \
 && mv /opt/flyway-${FLYWAY_VERSION} /opt/flyway \
 && ln -s /opt/flyway/flyway /usr/local/bin/flyway \
 && rm /tmp/flyway.tar.gz

# Remove bundled JRE to force usage of system OpenJDK
RUN rm -rf /opt/flyway/jre

ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk
ENV PATH=${JAVA_HOME}/bin:${PATH}

# Create app directory and user FIRST
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Set workdir and ownership in one step
WORKDIR /app
RUN chown nodejs:nodejs /app

# Switch to nodejs user BEFORE copying files
USER nodejs

# Copy files as nodejs user (avoids chown entirely)
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/server ./server
COPY --chown=nodejs:nodejs flyway.conf ./flyway.conf
COPY --chown=nodejs:nodejs db/migrations ./db/migrations

# Environment file is provided via docker-compose env_file



# Expose port
EXPOSE 3002

# Start the application with dumb-init (use built server output)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/dist/index.js"]
