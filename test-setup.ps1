# PowerShell script to test the application setup
Write-Host "Testing Kingdom Kids Application Setup..." -ForegroundColor Green

# Test 1: Check if Node.js is installed
Write-Host "`n1. Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Test 2: Check if npm is installed
Write-Host "`n2. Checking npm installation..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Test 3: Check backend dependencies
Write-Host "`n3. Checking backend dependencies..." -ForegroundColor Yellow
if (Test-Path "node_backend/node_modules") {
    Write-Host "✅ Backend dependencies are installed" -ForegroundColor Green
} else {
    Write-Host "❌ Backend dependencies not found. Installing..." -ForegroundColor Yellow
    Set-Location "node_backend"
    npm install
    Set-Location ".."
}

# Test 4: Check frontend dependencies
Write-Host "`n4. Checking frontend dependencies..." -ForegroundColor Yellow
if (Test-Path "client/node_modules") {
    Write-Host "✅ Frontend dependencies are installed" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend dependencies not found. Installing..." -ForegroundColor Yellow
    Set-Location "client"
    npm install
    Set-Location ".."
}

# Test 5: Test backend TypeScript compilation
Write-Host "`n5. Testing backend TypeScript compilation..." -ForegroundColor Yellow
Set-Location "node_backend"
$backendBuild = npm run build 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend TypeScript compilation successful" -ForegroundColor Green
} else {
    Write-Host "❌ Backend TypeScript compilation failed:" -ForegroundColor Red
    Write-Host $backendBuild -ForegroundColor Red
}
Set-Location ".."

# Test 6: Test frontend TypeScript compilation
Write-Host "`n6. Testing frontend TypeScript compilation..." -ForegroundColor Yellow
Set-Location "client"
$frontendCheck = npm run check 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend TypeScript compilation successful" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend TypeScript compilation failed:" -ForegroundColor Red
    Write-Host $frontendCheck -ForegroundColor Red
}
Set-Location ".."

# Test 7: Test frontend build
Write-Host "`n7. Testing frontend build..." -ForegroundColor Yellow
Set-Location "client"
$frontendBuild = npm run build 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend build successful" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend build failed:" -ForegroundColor Red
    Write-Host $frontendBuild -ForegroundColor Red
}
Set-Location ".."

Write-Host "`n🎉 Setup test completed!" -ForegroundColor Green
Write-Host "`nTo start the application, run one of these commands:" -ForegroundColor Cyan
Write-Host "  .\start-apps.ps1     (opens in separate windows)" -ForegroundColor White
Write-Host "  .\start-dev.ps1      (runs in current terminal)" -ForegroundColor White
Write-Host "`nOr start manually:" -ForegroundColor Cyan
Write-Host "  Backend:  cd node_backend && npm run dev" -ForegroundColor White
Write-Host "  Frontend: cd client && npm run dev" -ForegroundColor White
