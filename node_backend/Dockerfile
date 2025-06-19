# Use multi-stage build to reduce image size
FROM node:22-slim as builder
WORKDIR /node_backend
COPY package*.json ./
RUN npm install
COPY . .

# Production stage
FROM node:22-slim as production
WORKDIR /node_backend
COPY --from=builder /node_backend/node_modules ./node_modules
COPY --from=builder /node_backend/dist ./dist
CMD ["npm", "run", "start"]

# Development stage
FROM node:22-slim as development
WORKDIR /node_backend
COPY --from=builder /node_backend/node_modules ./node_modules
CMD ["npm", "run", "dev"]
