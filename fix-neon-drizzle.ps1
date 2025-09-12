param(
  [string]$ProjectDir = (Join-Path $PSScriptRoot "node_backend"),
  [switch]$SkipDevStart
)

function Fail($msg) { Write-Error $msg; exit 1 }
function Info($msg) { Write-Host $msg -ForegroundColor Cyan }
function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Green }

# 0) Sanity checks
& node -v *> $null; if ($LASTEXITCODE -ne 0) { Fail "Node.js not found. Install Node 18+." }
& npm -v  *> $null; if ($LASTEXITCODE -ne 0) { Fail "npm not found in PATH." }

if (-not (Test-Path $ProjectDir)) { Fail "Project directory not found: $ProjectDir" }
Set-Location $ProjectDir

$driverPath = Join-Path $ProjectDir "node_modules\drizzle-orm\neon-http\driver.cjs"

Step "Inspect current installation"
if (Test-Path $driverPath) {
  Info "Found: $driverPath"
} else {
  Info "Missing: $driverPath"
}

# 1) Clean install
Step "Clean node_modules and lockfile"
if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
if (Test-Path "package-lock.json") { Remove-Item -Force "package-lock.json" }

Step "npm install"
& npm install
if ($LASTEXITCODE -ne 0) { Fail "npm install failed." }

# 2) Ensure @neondatabase/serverless is present
Step "Verify @neondatabase/serverless"
& npm ls @neondatabase/serverless --depth=0 *> $null
if ($LASTEXITCODE -ne 0) {
  Info "@neondatabase/serverless not found. Installing..."
  & npm i @neondatabase/serverless
  if ($LASTEXITCODE -ne 0) { Fail "Failed to install @neondatabase/serverless." }
} else {
  Info "@neondatabase/serverless is installed."
}

# 3) Re-check driver.cjs
Step "Check drizzle-orm neon-http driver.cjs after install"
if (-not (Test-Path $driverPath)) {
  Info "driver.cjs still missing. Pinning drizzle-orm to a stable version..."
  & npm i -E drizzle-orm@0.36.4
  if ($LASTEXITCODE -ne 0) { Fail "Failed to pin drizzle-orm@0.36.4." }

  # After pin, ensure node_modules is consistent
  & npm install
  if ($LASTEXITCODE -ne 0) { Fail "npm install after pinning drizzle-orm failed." }
}

# 4) Final verification
Step "Final verification of driver.cjs"
if (-not (Test-Path $driverPath)) {
  Write-Warning "drizzle-orm neon-http driver.cjs is still missing.
- Possible causes: upstream package bug or incompatible version.
- Next options:
  1) Show me your src\db\db.ts so I can adjust imports to use the right Neon driver.
  2) Try a different drizzle-orm version (e.g., npm i -E drizzle-orm@0.32.0 or latest).
  3) Remove lockfile again and reinstall."
  if (-not $SkipDevStart) { Write-Host "`nSkipping dev start because the driver is missing." }
  exit 2
}

Info "driver.cjs found: $driverPath"

# 5) Start dev server
if (-not $SkipDevStart) {
  Step "Starting dev server: npm run dev"
  & npm run dev
  exit $LASTEXITCODE
} else {
  Step "Done (dev start skipped). You can now run: npm run dev"
}
