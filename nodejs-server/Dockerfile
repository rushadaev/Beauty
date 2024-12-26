# Stage 1: Build Stage
FROM mcr.microsoft.com/playwright:v1.47.2-focal AS builder

WORKDIR /usr/src/app

# Install global dev dependencies
RUN npm install -g webpack webpack-cli nodemon

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy the rest of your application code
COPY . .

# Build the TypeScript files
RUN npm run build

# Stage 2: Development Stage
FROM node:20-slim

WORKDIR /usr/src/app

# Install necessary system dependencies for Playwright and development tools
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libxdamage1 \
    libxfixes3 \
    libpango-1.0-0 \
    libgtk-3-0 \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install global development tools
RUN npm install -g webpack webpack-cli nodemon

# Create necessary directories
RUN mkdir -p /var/www/wb-back/storage/state

# Copy package files
COPY package*.json ./

# Install dependencies
RUN if [ "$NODE_ENV" = "production" ]; then \
        npm ci --only=production; \
    else \
        npm ci; \
    fi

# Copy the source code and config files
COPY . .

# Copy built files from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose port
EXPOSE 3000

# Set environment variables
ENV PORT=3000

# Start command based on NODE_ENV
CMD if [ "$NODE_ENV" = "production" ]; then \
        node dist/main.js; \
    else \
        npm run dev; \
    fi