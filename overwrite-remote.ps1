param(
  [string]$Branch,
  [string]$Remote = "origin",
  [string]$TagPrefix = "pre-overwrite",
  [switch]$Yes,
  [switch]$DryRun
)

function Fail($msg) { Write-Error $msg; exit 1 }

# 1) Ensure git and determine branch
& git --version *> $null
if ($LASTEXITCODE -ne 0) { Fail "git not found in PATH." }

if (-not $Branch) {
  $Branch = (& git branch --show-current).Trim()
  if ($LASTEXITCODE -ne 0 -or -not $Branch) { Fail "Cannot determine current branch. Specify -Branch." }
}

# 2) Fetch latest refs
Write-Host "Fetching from '$Remote'..."
& git fetch $Remote
if ($LASTEXITCODE -ne 0) { Fail "git fetch failed." }

# 3) Compute divergence info (use rev-list counts)
$remoteRef = "$Remote/$Branch"

# Default counts
$ahead = 0
$behind = 0

# Prefer exact divergence counts (no cherry-pick suppression)
$counts = & git rev-list --left-right --count "HEAD...$remoteRef" 2>$null
if ($LASTEXITCODE -eq 0 -and $counts -match '^\s*(\d+)\s+(\d+)\s*$') {
  $ahead = [int]$matches[1]
  $behind = [int]$matches[2]
}

Write-Host "Branch: $Branch"
Write-Host "Remote: $remoteRef"
Write-Host "Ahead (local only): $ahead; Behind (remote only): $behind"

# If nothing to do, stop early
if ($ahead -eq 0 -and $behind -eq 0 -and -not $DryRun) {
  Write-Host "Local and remote appear identical. Nothing to push."
  exit 0
}

# 4) Prepare safety tag at current remote tip (if exists)
$remoteExists = $true
& git show-ref --verify --quiet "refs/remotes/$Remote/$Branch"
if ($LASTEXITCODE -ne 0) { $remoteExists = $false }

$tag = "$TagPrefix/$Branch"
if ($remoteExists) {
  # Ensure unique tag
  & git rev-parse -q --verify "refs/tags/$tag" *> $null
  if ($LASTEXITCODE -eq 0) {
    $tag = "$tag-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
  }
}

Write-Host ""
Write-Host "Planned actions:"
if ($remoteExists) {
  Write-Host " - Create safety tag '$tag' at $remoteRef and push tag"
} else {
  Write-Host " - No remote tip found; skipping safety tag"
}
Write-Host " - Force-push local HEAD to '$remoteRef' with --force-with-lease"
Write-Host ""

if (-not $Yes) {
  $resp = Read-Host "Proceed? Type 'yes' to continue"
  if ($resp -ne "yes") { Fail "Aborted by user." }
}

if ($DryRun) {
  Write-Host "[DryRun] Skipping changes."
  exit 0
}

# 5) Create and push safety tag
if ($remoteExists) {
  & git tag $tag $remoteRef
  if ($LASTEXITCODE -ne 0) { Fail "Failed to create tag '$tag'." }
  & git push $Remote "refs/tags/$tag"
  if ($LASTEXITCODE -ne 0) { Fail "Failed to push tag '$tag'." }
  Write-Host "Safety tag pushed: $tag"
}

# 6) Force-push local to remote
& git push --force-with-lease $Remote "HEAD:refs/heads/$Branch"
if ($LASTEXITCODE -ne 0) {
  Fail "Force-push failed. Check branch protection or permissions."
}

Write-Host ""
Write-Host "Done. Remote '$remoteRef' now matches your local HEAD."
if ($remoteExists) {
  $undo = "git push --force-with-lease $Remote $tag`:refs/heads/$Branch"
  Write-Host "To undo: $undo"
}
