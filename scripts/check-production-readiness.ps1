# check-production-readiness.ps1
$ErrorActionPreference = "Stop"

Write-Host "========================================"
Write-Host "PITCHPILOT AI - PRODUCTION READINESS CHECK"
Write-Host "========================================"

$frontendEnv = ".\frontend\.env.production.example"
$backendEnv = ".\backend\.env.production.example"
$deploymentDocs = ".\DEPLOYMENT.md"

if (Test-Path $frontendEnv) { Write-Host "[PASS] Frontend .env template exists" -ForegroundColor Green } else { Write-Host "[FAIL] Missing Frontend .env template" -ForegroundColor Red; exit 1 }
if (Test-Path $backendEnv) { Write-Host "[PASS] Backend .env template exists" -ForegroundColor Green } else { Write-Host "[FAIL] Missing Backend .env template" -ForegroundColor Red; exit 1 }
if (Test-Path $deploymentDocs) { Write-Host "[PASS] DEPLOYMENT.md exists" -ForegroundColor Green } else { Write-Host "[FAIL] Missing DEPLOYMENT.md" -ForegroundColor Red; exit 1 }

Write-Host "`nBuilding Frontend..."
Push-Location .\frontend
try {
    npm run build
    Write-Host "[PASS] Frontend built successfully" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Frontend build failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

Write-Host "`nCompiling Backend..."
Push-Location .\backend
try {
    # Using python -m compileall app
    python -m compileall app
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[PASS] Backend compiled successfully" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Backend compilation failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
} catch {
    Write-Host "[FAIL] Backend compilation failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

Write-Host "`n========================================"
Write-Host "All static checks passed! Ready for deployment." -ForegroundColor Green
Write-Host "Be sure to verify health endpoints locally if servers are running."
