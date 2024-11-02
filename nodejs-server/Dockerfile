# Stage 1: Build Stage
FROM mcr.microsoft.com/playwright:v1.47.2-focal AS builder

WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm install

# Copy the rest of your application code
COPY . .

# Build the TypeScript files
RUN npm run build

# Stage 2: Production Stage
FROM node:20-slim

WORKDIR /usr/src/app

# Install necessary system dependencies for Playwright
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
    && rm -rf /var/lib/apt/lists/*

# # Copy the node_modules from the builder stage
# COPY --from=builder /usr/src/app/node_modules ./node_modules

# # Copy the built code and necessary assets from the builder stage
# COPY --from=builder /usr/src/app/dist ./dist
# COPY --from=builder /usr/src/app/src ./src

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the server
CMD ["node", "dist/main.js"]
