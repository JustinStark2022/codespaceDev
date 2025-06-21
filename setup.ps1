# Kingdom Kids Development Environment Setup Script (PowerShell)

Write-Host "🏰 Setting up Kingdom Kids Development Environment..." -ForegroundColor Green

# Create necessary directories
Write-Host "📁 Creating necessary directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "logs" | Out-Null
New-Item -ItemType Directory -Force -Path "tmp" | Out-Null
New-Item -ItemType Directory -Force -Path "backups" | Out-Null
New-Item -ItemType Directory -Force -Path "uploads" | Out-Null

# Copy environment file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "📄 Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "⚠️  Please update .env with your actual API keys and configuration" -ForegroundColor Red
}

# Install Python dependencies for MCP servers
Write-Host "🐍 Installing Python MCP server dependencies..." -ForegroundColor Yellow
if (Get-Command python -ErrorAction SilentlyContinue) {
    pip install mcp-server-git mcp-server-filesystem
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    pip3 install mcp-server-git mcp-server-filesystem
} else {
    Write-Host "⚠️  Python not found. Please install Python to use MCP servers." -ForegroundColor Red
}

# Install Node.js dependencies
Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Yellow

# Install backend dependencies
if (Test-Path "node_backend") {
    Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
    Set-Location "node_backend"
    npm install
    Set-Location ".."
} else {
    Write-Host "⚠️  node_backend directory not found" -ForegroundColor Red
}

# Install client dependencies  
if (Test-Path "client") {
    Write-Host "Installing client dependencies..." -ForegroundColor Cyan
    Set-Location "client"
    npm install
    Set-Location ".."
} else {
    Write-Host "⚠️  client directory not found" -ForegroundColor Red
}

# Install root dependencies
if (Test-Path "package.json") {
    Write-Host "Installing root dependencies..." -ForegroundColor Cyan
    npm install
}

# Set up Git hooks (optional)
if (Test-Path ".git") {
    Write-Host "🔧 Setting up Git hooks..." -ForegroundColor Yellow
    $preCommitHook = @"
#!/bin/sh
npm run lint
"@
    New-Item -ItemType Directory -Force -Path ".git/hooks" | Out-Null
    $preCommitHook | Out-File -FilePath ".git/hooks/pre-commit" -Encoding ASCII
}

Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 To start the development environment:" -ForegroundColor Cyan
Write-Host "   docker-compose up -d" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Access points:" -ForegroundColor Cyan
Write-Host "   - Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "   - Backend API: http://localhost:5000" -ForegroundColor White
Write-Host "   - Database: localhost:5432" -ForegroundColor White
Write-Host ""
Write-Host "📝 Don't forget to:" -ForegroundColor Yellow
Write-Host "   1. Update .env with your actual API keys" -ForegroundColor White
Write-Host "   2. Configure your database connection" -ForegroundColor White
Write-Host "   3. Review taskmaster.config.json settings" -ForegroundColor White
Write-Host "   4. Check mcp_config.json for MCP server configuration" -ForegroundColor White