# Kingdom Kids Development Environment

A comprehensive development environment for the Kingdom Kids project with Docker, MCP (Model Context Protocol) integration, and AI-powered task management.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.8+ (for MCP servers)
- Git

### Setup
1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd codespaceDev
   ```

2. **Run Setup Script**
   ```bash
   # On Unix/Linux/macOS
   chmod +x setup.sh
   ./setup.sh
   
   # On Windows
   .\setup.ps1
   ```

3. **Configure Environment**
   - Update `.env` with your actual API keys and configuration
   - Review `taskmaster.config.json` for AI task management settings
   - Check `mcp_config.json` for MCP server configuration

4. **Start Development Environment**
   ```bash
   docker-compose up -d
   ```

## 🏗️ Architecture

### Services
- **Database**: PostgreSQL 15 with persistent storage
- **Backend**: Node.js API server (port 5000)
- **Client**: Frontend development server (port 5173)

### File Structure
```
codespaceDev/
├── .devcontainer/           # VS Code development container config
├── client/                  # Frontend application
├── node_backend/           # Backend API server
├── Roo-Code/              # Additional code modules
├── docker-compose.yml     # Docker services configuration
├── taskmaster.config.json # AI task management configuration
├── mcp_config.json       # MCP server configuration
├── .env                  # Environment variables
└── setup.sh/setup.ps1   # Setup scripts
```

## 🔧 Configuration Files

### Docker Configuration
- **docker-compose.yml**: Multi-service setup with database, backend, and frontend
- **Dockerfiles**: Multi-stage builds for development and production
- **.devcontainer/**: VS Code development container with extensions and settings

### Environment Configuration
- **.env**: Main environment variables
- **.env.node_backend**: Backend-specific variables
- **.env.client**: Frontend-specific variables
- **.env.example**: Template for environment setup

### AI & MCP Configuration
- **taskmaster.config.json**: Comprehensive AI task management configuration
- **mcp_config.json**: Model Context Protocol server definitions

## 🐳 Docker Services

### Database Service
- **Image**: PostgreSQL 15 Alpine
- **Port**: 5432
- **Database**: faith_fortress_db
- **Credentials**: user/password (configurable via .env)
- **Volume**: Persistent data storage

### Backend Service
- **Port**: 5000 (external) → 3001 (internal)
- **Environment**: Development with hot reload
- **Dependencies**: Database service
- **Features**: MCP integration, Python support

### Client Service  
- **Port**: 5173
- **Environment**: Vite development server
- **Dependencies**: Backend service
- **Features**: Hot module replacement

## 🤖 MCP (Model Context Protocol) Integration

### Available MCP Servers
1. **Git Server**: Git repository operations
2. **Filesystem Server**: File system operations  
3. **Neon Server**: Database operations (requires API key)
4. **Taskmaster AI**: AI-powered task management

### Configuration
- API keys are now environment variables (no hardcoded secrets)
- Servers can be enabled/disabled individually
- Configurable through `mcp_config.json`

## 🎯 Taskmaster AI Features

### Task Management
- Create, update, delete, list, and prioritize tasks
- Intelligent scheduling and automation
- Project analysis and code generation

### File Operations
- Multi-language support (JS, TS, Python, SQL, etc.)
- Automatic backups
- File size and access restrictions

### Database Integration
- Direct database operations
- Query optimization and monitoring
- Connection pooling

### Security Features
- API key validation
- Command whitelisting
- Execution time limits
- File access restrictions

## 🔍 Development Workflow

### Local Development
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### VS Code Development Container
```bash
# Open in VS Code
code .

# Use Command Palette: "Dev Containers: Reopen in Container"
```

### Database Access
```bash
# Connect to database
docker-compose exec database psql -U user -d faith_fortress_db
```

## 📊 Port Mapping
- **5432**: PostgreSQL Database
- **5000**: Backend API Server
- **5173**: Frontend Development Server

## 🔐 Security Considerations

### Environment Variables
- Never commit `.env` files with real API keys
- Use `.env.example` as a template
- Rotate API keys regularly

### MCP Security
- API keys are environment variables only
- Command execution is whitelisted
- File access is restricted
- Execution timeouts prevent hanging processes

### Database Security
- Use strong passwords in production
- Enable SSL in production environments
- Regular backups and monitoring

## 🐛 Troubleshooting

### Common Issues
1. **Port Conflicts**: Check if ports 5000, 5173, or 5432 are in use
2. **Docker Issues**: Ensure Docker is running and has sufficient resources
3. **Permission Issues**: Check file permissions for setup scripts
4. **API Keys**: Verify all required API keys are set in .env

### Logs
- **Docker**: `docker-compose logs [service-name]`
- **Taskmaster**: Check `./logs/taskmaster.log`
- **Application**: Check individual service logs

## 📝 License

See LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review configuration files
- Check Docker and service logs
- Create an issue in the repository
