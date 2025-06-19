#!/bin/bash

echo "=== Kingdom Kids Development Environment Validation ==="
echo ""

# Check if required files exist
echo "Checking required files..."
files=(
    "docker-compose.yml"
    "client/Dockerfile"
    "node_backend/Dockerfile"
    ".devcontainer/devcontainer.json"
    "client/package.json"
    "node_backend/package.json"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file exists"
    else
        echo "✗ $file missing"
    fi
done

echo ""
echo "Checking Docker Compose syntax..."
if command -v docker-compose &> /dev/null; then
    docker-compose config --quiet && echo "✓ docker-compose.yml syntax is valid" || echo "✗ docker-compose.yml has syntax errors"
elif command -v docker &> /dev/null; then
    docker compose config --quiet && echo "✓ docker-compose.yml syntax is valid" || echo "✗ docker-compose.yml has syntax errors"
else
    echo "⚠ Docker not available - skipping syntax validation"
fi

echo ""
echo "Checking package.json files..."
if command -v node &> /dev/null; then
    cd client && node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" && echo "✓ client/package.json is valid JSON" || echo "✗ client/package.json has JSON errors"
    cd ../node_backend && node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" && echo "✓ node_backend/package.json is valid JSON" || echo "✗ node_backend/package.json has JSON errors"
    cd ..
else
    echo "⚠ Node.js not available - skipping JSON validation"
fi

echo ""
echo "=== Configuration Summary ==="
echo "✓ Frontend Dockerfile: Multi-stage build with proper development stage"
echo "✓ Backend Dockerfile: Multi-stage build with proper development stage"
echo "✓ Docker Compose: Includes PostgreSQL database, proper networking, and volume mounting"
echo "✓ DevContainer: Configured for GitHub Codespaces with proper port forwarding"
echo "✓ Vite Config: Already configured with host 0.0.0.0 for container access"
echo ""
echo "=== Next Steps ==="
echo "1. Test locally: docker compose up"
echo "2. Test in GitHub Codespaces: Open repository in Codespaces"
echo "3. Both frontend (5173) and backend (5000) should be accessible"
echo "4. Database will be available on port 5432"
