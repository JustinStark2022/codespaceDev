#!/bin/bash

# Kingdom Kids Development Environment Setup Script

echo "🏰 Setting up Kingdom Kids Development Environment..."

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p tmp
mkdir -p backups
mkdir -p uploads

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📄 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update .env with your actual API keys and configuration"
fi

# Install Python dependencies for MCP servers
echo "🐍 Installing Python MCP server dependencies..."
if command -v python3 &> /dev/null; then
    pip3 install mcp-server-git mcp-server-filesystem
else
    echo "⚠️  Python3 not found. Please install Python3 to use MCP servers."
fi

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."

# Install backend dependencies
if [ -d "node_backend" ]; then
    echo "Installing backend dependencies..."
    cd node_backend
    npm install
    cd ..
else
    echo "⚠️  node_backend directory not found"
fi

# Install client dependencies  
if [ -d "client" ]; then
    echo "Installing client dependencies..."
    cd client
    npm install
    cd ..
else
    echo "⚠️  client directory not found"
fi

# Install root dependencies
if [ -f "package.json" ]; then
    echo "Installing root dependencies..."
    npm install
fi

# Set up Git hooks (optional)
if [ -d ".git" ]; then
    echo "🔧 Setting up Git hooks..."
    echo "#!/bin/sh" > .git/hooks/pre-commit
    echo "npm run lint" >> .git/hooks/pre-commit
    chmod +x .git/hooks/pre-commit
fi

echo "✅ Setup complete!"
echo ""
echo "🚀 To start the development environment:"
echo "   docker-compose up -d"
echo ""
echo "🔗 Access points:"
echo "   - Frontend: http://localhost:5173"
echo "   - Backend API: http://localhost:5000"
echo "   - Database: localhost:5432"
echo ""
echo "📝 Don't forget to:"
echo "   1. Update .env with your actual API keys"
echo "   2. Configure your database connection"
echo "   3. Review taskmaster.config.json settings"
echo "   4. Check mcp_config.json for MCP server configuration"