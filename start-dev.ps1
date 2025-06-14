# PowerShell script to start both frontend and backend
Write-Host "Starting Kingdom Kids Development Environment..." -ForegroundColor Green

# Function to cleanup background processes
function Cleanup {
    Write-Host "Shutting down applications..." -ForegroundColor Yellow
    Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue
    exit 0
}

# Set up signal handlers for Ctrl+C
[Console]::TreatControlCAsInput = $false
[Console]::CancelKeyPress += {
    Cleanup
}

try {
    # Get current directory
    $currentDir = Get-Location

    Write-Host "Starting backend on port 5000..." -ForegroundColor Cyan
    # Start backend process
    $backendProcess = Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$currentDir\node_backend'; npm run dev" -PassThru

    # Wait a moment for backend to start
    Start-Sleep -Seconds 3

    Write-Host "Starting frontend on port 5173..." -ForegroundColor Cyan
    # Start frontend process
    $frontendProcess = Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$currentDir\client'; npm run dev" -PassThru

    Write-Host ""
    Write-Host "✅ Applications started successfully!" -ForegroundColor Green
    Write-Host "🔗 Frontend: http://localhost:5173" -ForegroundColor Blue
    Write-Host "🔗 Backend API: http://localhost:5000" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Both applications are running in separate windows." -ForegroundColor Yellow
    Write-Host "Close those windows or press Ctrl+C here to stop both applications." -ForegroundColor Yellow
    Write-Host ""

    # Wait for user input or process termination
    Write-Host "Press any key to stop both applications..." -ForegroundColor Cyan
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

}
catch {
    Write-Host "Error occurred: $_" -ForegroundColor Red
}
finally {
    Cleanup
}
