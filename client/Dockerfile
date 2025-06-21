# Use multi-stage build to reduce image size
FROM node:22-slim as builder
WORKDIR /workspace/client
COPY package*.json ./
RUN npm install
COPY . .

# Production stage
FROM node:22-slim as production
WORKDIR /workspace/client
COPY --from=builder /workspace/client/node_modules ./node_modules
COPY --from=builder /workspace/client/dist ./dist
COPY --from=builder /workspace/client/package*.json ./
CMD ["npm", "run", "start"]

# Development stage
FROM node:22-slim as development
WORKDIR /workspace/client

COPY package*.json ./
RUN npm install

COPY . .

# Expose port
EXPOSE 5173

CMD ["npm", "run", "dev"]
