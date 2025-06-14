@echo off
echo Starting Kingdom Kids Development Environment...

echo.
echo Starting backend on port 5000...
start "Backend Server" cmd /k "cd /d node_backend && npm run dev"

echo Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo.
echo Starting frontend on port 5173...
start "Frontend Server" cmd /k "cd /d client && npm run dev"

echo.
echo ✅ Applications started successfully!
echo 🔗 Frontend: http://localhost:5173
echo 🔗 Backend API: http://localhost:5000
echo.
echo Both applications are running in separate command windows.
echo Close those windows when you're done developing.
echo.
pause
