# Testing Guide for Kingdom Kids Development Environment

## Pre-Testing Checklist

Before testing the fixed development environment, ensure you have:
- Docker and Docker Compose installed
- Git repository cloned
- Switched to the `fix-devcontainer-setup` branch

## Testing Steps

### 1. Basic Container Build Test
```bash
# Test if containers build successfully
docker compose build

# Expected output: Both frontend and backend should build without errors
```

### 2. Service Startup Test
```bash
# Start all services
docker compose up

# Expected behavior:
# - Database should start first and become healthy
# - Backend should wait for database and then start
# - Frontend should start after backend
# - All services should show "ready" status
```

### 3. Port Accessibility Test
```bash
# Test if ports are accessible
curl http://localhost:5000/health  # Backend health check
curl http://localhost:5173         # Frontend dev server

# Expected responses:
# - Backend: JSON response or 404 (depending on routes)
# - Frontend: HTML content or Vite dev server response
```

### 4. Database Connection Test
```bash
# Test database connectivity
docker compose exec database psql -U postgres -d kingdom_kids -c "SELECT version();"

# Expected: PostgreSQL version information
```

### 5. Hot Reload Test
```bash
# Make a small change to frontend code
echo "// Test change" >> client/src/App.tsx

# Make a small change to backend code  
echo "// Test change" >> node_backend/src/server.ts

# Expected: Both services should automatically reload
```

### 6. GitHub Codespaces Test
1. Push changes to GitHub
2. Create new Codespace from the branch
3. Wait for devcontainer to initialize
4. Verify all ports are forwarded
5. Test frontend and backend accessibility

## Critical Endpoints to Test

### Backend Endpoints
- `GET /health` - Health check
- `GET /api/status` - API status
- Database connection endpoints

### Frontend Functionality
- Page loads without errors
- API calls to backend work
- Hot reload functions properly

## Expected Logs

### Database Service
```
database_1  | PostgreSQL init process complete; ready for start up.
database_1  | LOG:  database system is ready to accept connections
```

### Backend Service
```
backend_1   | Server running on port 5000
backend_1   | Database connected successfully
```

### Frontend Service
```
client_1    | VITE v4.x.x ready in xxx ms
client_1    | Local:   http://localhost:5173/
client_1    | Network: http://0.0.0.0:5173/
```

## Troubleshooting Common Issues

### Port Conflicts
If ports 5000, 5173, or 5432 are in use:
```bash
# Check what's using the ports
lsof -i :5000
lsof -i :5173
lsof -i :5432

# Stop conflicting services or change ports in docker-compose.yml
```

### Database Connection Issues
```bash
# Check database logs
docker compose logs database

# Verify database is healthy
docker compose ps
```

### Build Failures
```bash
# Clean build (remove cached layers)
docker compose build --no-cache

# Check individual service logs
docker compose logs backend
docker compose logs client
```

## Success Criteria

✅ All containers build successfully
✅ All services start without errors  
✅ Database accepts connections
✅ Backend responds to requests
✅ Frontend serves content
✅ Hot reload works for both services
✅ GitHub Codespaces initializes properly
✅ All ports are accessible

## Manual Testing Commands

Run these commands to verify the setup:

```bash
# 1. Build test
docker compose build

# 2. Start services
docker compose up -d

# 3. Check service status
docker compose ps

# 4. Test backend
curl -f http://localhost:5000 || echo "Backend not responding"

# 5. Test frontend
curl -f http://localhost:5173 || echo "Frontend not responding"

# 6. Test database
docker compose exec database pg_isready -U postgres

# 7. View logs
docker compose logs --tail=50

# 8. Cleanup
docker compose down
```
