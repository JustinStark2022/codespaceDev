@echo off
title Kingdom Kids Launcher
color 0A
echo.
echo ========================================
echo   Kingdom Kids Development Launcher
echo ========================================
echo.

echo [1/3] Checking if Node.js is installed...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js is installed

echo.
echo [2/3] Starting backend server on port 5000...
start "Kingdom Kids - Backend Server" cmd /k "title Kingdom Kids Backend && color 0B && cd /d %~dp0node_backend && echo Starting backend server... && npm run dev"

echo Waiting for backend to initialize...
timeout /t 4 /nobreak >nul

echo.
echo [3/3] Starting frontend server on port 5173...
start "Kingdom Kids - Frontend Server" cmd /k "title Kingdom Kids Frontend && color 0C && cd /d %~dp0client && echo Starting frontend server... && npm run dev"

echo.
echo ========================================
echo ✅ Applications started successfully!
echo ========================================
echo.
echo 🌐 Frontend: http://localhost:5173
echo 🔧 Backend API: http://localhost:5000
echo.
echo Both applications are running in separate windows.
echo Close those windows when you're done developing.
echo.
echo Press any key to exit this launcher...
pause >nul
