# Use multi-stage build to reduce image size
FROM node:22-slim as builder
WORKDIR /workspace/node_backend
COPY package*.json ./
RUN npm install
COPY . .

# Production stage
FROM node:22-slim as production
WORKDIR /workspace/node_backend
COPY --from=builder /workspace/node_backend/node_modules ./node_modules
COPY --from=builder /workspace/node_backend/dist ./dist
COPY --from=builder /workspace/node_backend/package*.json ./
CMD ["npm", "run", "start"]

# Development stage
FROM node:22-slim as development
WORKDIR /workspace/node_backend

# Install Python for MCP servers
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create symlink for python command
RUN ln -s /usr/bin/python3 /usr/bin/python

COPY package*.json ./
RUN npm install

# Install MCP server dependencies
RUN python3 -m pip install --break-system-packages mcp-server-git

COPY . .

# Expose port
EXPOSE 3001

CMD ["npm", "run", "dev"]
