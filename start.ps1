$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
$backendPython = Join-Path $backendDir ".venv\Scripts\python.exe"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " PitchPilot AI local startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5473"
Write-Host "Backend:  http://localhost:8000"
Write-Host "Task 2 uses Supabase Auth when .env files are configured."
Write-Host "AI, CV, audio transcription, scoring, and database history are still deferred."
Write-Host ""

if (-not (Test-Path $backendPython)) {
  Write-Host "Backend virtual environment was not found. Using system python." -ForegroundColor Yellow
  Write-Host "Run backend setup first if uvicorn or FastAPI are missing." -ForegroundColor Yellow
  $backendPython = "python"
}

Write-Host "Starting backend..."
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$backendDir'; Write-Host 'PitchPilot AI backend -> http://localhost:8000' -ForegroundColor Cyan; & '$backendPython' -m uvicorn app.main:app --reload --port 8000"
)

Write-Host "Starting frontend..."
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$frontendDir'; Write-Host 'PitchPilot AI frontend -> http://localhost:5473' -ForegroundColor Cyan; npm run dev"
)

Write-Host ""
Write-Host "Startup commands launched. Keep both service windows open while developing." -ForegroundColor Green
