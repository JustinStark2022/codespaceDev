#!/bin/bash

# This script runs after the dev container is created.
# It installs dependencies for both the backend and frontend.

echo "--- Running post-create script ---"

# Install backend dependencies
echo "--- Installing backend dependencies in /workspace/node_backend ---"
cd /workspace/node_backend && npm ci

# Install frontend dependencies
echo "--- Installing frontend dependencies in /workspace/client ---"
cd /workspace/client && npm ci

echo "--- Post-create script finished ---"
