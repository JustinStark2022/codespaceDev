# Kingdom Kids Development Environment

This repository has been configured for local development and GitHub Codespaces with Docker containers.

## Quick Start

### GitHub Codespaces (Recommended)
1. Click "Code" → "Codespaces" → "Create codespace on main"
2. Wait for the environment to initialize
3. The development servers will start automatically
4. Access the frontend at the forwarded port 5173
5. Access the backend API at the forwarded port 5000

### Local Development
1. Ensure Docker and Docker Compose are installed
2. Clone the repository
3. Run: `docker compose up`
4. Frontend: http://localhost:5173
5. Backend: http://localhost:5000
6. Database: localhost:5432

## Services

### Frontend (React + Vite)
- **Port**: 5173
- **Technology**: React, TypeScript, Tailwind CSS
- **Hot reload**: Enabled
- **Location**: `/client`

### Backend (Node.js + Express)
- **Port**: 5000
- **Technology**: Node.js, Express, TypeScript
- **Hot reload**: Enabled with tsx
- **Location**: `/node_backend`

### Database (PostgreSQL)
- **Port**: 5432
- **Database**: kingdom_kids
- **Username**: postgres
- **Password**: postgres

## Environment Variables

The application uses multiple environment files:
- `.env` - Shared environment variables
- `.env.client` - Frontend-specific variables
- `.env.node_backend` - Backend-specific variables

## Development Commands

### Frontend
```bash
cd client
npm install
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
```

### Backend
```bash
cd node_backend
npm install
npm run dev          # Start development server
npm run build        # Build TypeScript
npm run start        # Start production server
npm run test         # Run tests
```

## Docker Configuration

### Multi-stage Dockerfiles
Both frontend and backend use multi-stage builds:
- **base**: Install dependencies
- **development**: Copy source and start dev server
- **builder**: Build the application
- **production**: Serve the built application

### Docker Compose Services
- **database**: PostgreSQL 15 with health checks
- **backend**: Node.js backend with volume mounting
- **client**: React frontend with volume mounting
- **Networks**: All services connected via app-network
- **Volumes**: Persistent node_modules and database data

## DevContainer Features

The `.devcontainer` configuration includes:
- VS Code extensions for TypeScript, Tailwind, Prettier
- Port forwarding for all services
- Docker-in-Docker support
- Node.js 22 runtime
- Automatic dependency installation

## Troubleshooting

### Port Conflicts
If ports are already in use, update the port mappings in `docker-compose.yml`

### Database Connection Issues
Ensure the database service is healthy before backend starts (handled by depends_on)

### Hot Reload Not Working
- Frontend: Ensure Vite is configured with `host: "0.0.0.0"`
- Backend: Ensure tsx is watching file changes

### Permission Issues
If you encounter permission issues with volumes, ensure proper file ownership

## Validation

Run the validation script to check your setup:
```bash
./validate-setup.sh
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React)       │    │   (Node.js)     │    │  (PostgreSQL)   │
│   Port: 5173    │◄──►│   Port: 5000    │◄──►│   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

The frontend communicates with the backend via API calls, and the backend connects to PostgreSQL for data persistence.
