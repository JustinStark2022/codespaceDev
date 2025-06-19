# Use multi-stage build to reduce image size
FROM node:22-slim as base
WORKDIR /client

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Development stage
FROM base as development
WORKDIR /client

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Start development server with host binding
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build stage
FROM base as builder
WORKDIR /client

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:22-slim as production
WORKDIR /client

# Install serve globally
RUN npm install -g serve

# Copy built application
COPY --from=builder /client/dist ./dist

# Expose port
EXPOSE 5173

# Start production server
CMD ["serve", "-s", "dist", "-l", "5173", "-H", "0.0.0.0"]

