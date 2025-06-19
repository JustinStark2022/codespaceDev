# Use multi-stage build to reduce image size
FROM node:22-slim as base
WORKDIR /node_backend

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Development stage
FROM base as development
WORKDIR /node_backend

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Start development server
CMD ["npm", "run", "dev"]

# Build stage
FROM base as builder
WORKDIR /node_backend

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:22-slim as production
WORKDIR /node_backend

# Copy built application and node_modules
COPY --from=builder /node_backend/dist ./dist
COPY --from=builder /node_backend/node_modules ./node_modules
COPY --from=builder /node_backend/package*.json ./

# Expose port
EXPOSE 5000

# Start production server
CMD ["npm", "run", "start"]

