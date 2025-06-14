# PowerShell script to start both frontend and backend
Write-Host "Starting Kingdom Kids Development Environment..." -ForegroundColor Green

# Function to cleanup background processes
function Cleanup {
    Write-Host "Shutting down applications..." -ForegroundColor Yellow
    if ($BackendJob) { Stop-Job $BackendJob; Remove-Job $BackendJob }
    if ($FrontendJob) { Stop-Job $FrontendJob; Remove-Job $FrontendJob }
    exit 0
}

# Set up signal handlers
$null = Register-EngineEvent PowerShell.Exiting -Action { Cleanup }

try {
    # Start backend
    Write-Host "Starting backend on port 5000..." -ForegroundColor Cyan
    $BackendJob = Start-Job -ScriptBlock {
        Set-Location "node_backend"
        npm run dev
    }

    # Wait a moment for backend to start
    Start-Sleep -Seconds 3

    # Start frontend
    Write-Host "Starting frontend on port 5173..." -ForegroundColor Cyan
    $FrontendJob = Start-Job -ScriptBlock {
        Set-Location "client"
        npm run dev
    }

    Write-Host ""
    Write-Host "✅ Applications started successfully!" -ForegroundColor Green
    Write-Host "🔗 Frontend: http://localhost:5173" -ForegroundColor Blue
    Write-Host "🔗 Backend API: http://localhost:5000" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Press Ctrl+C to stop both applications" -ForegroundColor Yellow
    Write-Host ""

    # Monitor jobs and show output
    while ($BackendJob.State -eq "Running" -or $FrontendJob.State -eq "Running") {
        # Show backend output
        $BackendOutput = Receive-Job $BackendJob -ErrorAction SilentlyContinue
        if ($BackendOutput) {
            Write-Host "[BACKEND] $BackendOutput" -ForegroundColor Magenta
        }

        # Show frontend output
        $FrontendOutput = Receive-Job $FrontendJob -ErrorAction SilentlyContinue
        if ($FrontendOutput) {
            Write-Host "[FRONTEND] $FrontendOutput" -ForegroundColor Cyan
        }

        Start-Sleep -Seconds 1
    }
}
catch {
    Write-Host "Error occurred: $_" -ForegroundColor Red
}
finally {
    Cleanup
}
