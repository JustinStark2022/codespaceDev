# Simple PowerShell script to start both applications
Write-Host "Starting Kingdom Kids Development Environment..." -ForegroundColor Green

# Get current directory
$currentDir = Get-Location

Write-Host "Starting backend on port 5000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$currentDir\node_backend'; Write-Host 'Backend starting...' -ForegroundColor Green; npm run dev"

# Wait a moment for backend to start
Start-Sleep -Seconds 3

Write-Host "Starting frontend on port 5173..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$currentDir\client'; Write-Host 'Frontend starting...' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "✅ Applications started successfully!" -ForegroundColor Green
Write-Host "🔗 Frontend: http://localhost:5173" -ForegroundColor Blue
Write-Host "🔗 Backend API: http://localhost:5000" -ForegroundColor Blue
Write-Host ""
Write-Host "Both applications are running in separate PowerShell windows." -ForegroundColor Yellow
Write-Host "Close those windows when you're done developing." -ForegroundColor Yellow
