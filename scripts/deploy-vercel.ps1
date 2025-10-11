Param(
    [switch]$Prod
)

# Simple PowerShell helper to deploy to Vercel.
# REQUIREMENTS:
# - npm i -g vercel
# - Environment variables already configured in Vercel dashboard
# - First login done locally:  vercel login
# - Optionally set VERCEL_ORG_ID / VERCEL_PROJECT_ID if you want fully non-interactive

Write-Host "==> Build (prod)" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed, aborting deploy"; exit 1 }

$deployArgs = @()
if ($Prod) { $deployArgs += "--prod" }

Write-Host "==> Deploying to Vercel ($([string]::Join(' ', $deployArgs)))" -ForegroundColor Cyan
vercel $deployArgs
if ($LASTEXITCODE -ne 0) { Write-Error "Vercel deploy failed"; exit 1 }

Write-Host "✅ Deploy script finished" -ForegroundColor Green
