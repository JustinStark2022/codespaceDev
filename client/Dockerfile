# Use multi-stage build to reduce image size
FROM node:22-slim as builder
WORKDIR /client
COPY package*.json ./
RUN npm install
COPY . .

# Production stage
FROM node:22-slim as production
WORKDIR /client
COPY --from=builder /client/node_modules ./node_modules
COPY --from=builder /client/dist ./dist
CMD ["npm", "run", "start"]

# Development stage
FROM node:22-slim as development
WORKDIR /client
COPY --from=builder /client/node_modules ./node_modules
CMD ["npm", "run", "dev"]
