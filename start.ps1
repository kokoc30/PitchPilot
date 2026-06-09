Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
$backendPython = Join-Path $backendDir ".venv\Scripts\python.exe"
$frontendPort = 5173
$backendPort = 8000

function Write-Section {
  param([string]$Message)
  Write-Host ""
  Write-Host $Message -ForegroundColor Cyan
}

function Test-PortInUse {
  param([int]$Port)

  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  return $null -ne $connections
}

function Show-PortHelp {
  param([int]$Port)

  Write-Host "Port $Port is already in use." -ForegroundColor Red
  Write-Host "Inspect it with: Get-NetTCPConnection -LocalPort $Port" -ForegroundColor Yellow
  Write-Host "Then stop the owning process with:" -ForegroundColor Yellow
  Write-Host "  Get-NetTCPConnection -LocalPort $Port | Select-Object LocalPort, State, OwningProcess" -ForegroundColor Yellow
  Write-Host "  Stop-Process -Id <OwningProcess> -Force" -ForegroundColor Yellow
}

function Start-PowerShellWindow {
  param(
    [string]$Title,
    [string]$WorkingDirectory,
    [string]$Command
  )

  Start-Process -FilePath "powershell.exe" -WorkingDirectory $WorkingDirectory -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    $Command
  ) | Out-Null

  Write-Host "$Title window launched." -ForegroundColor Green
}

Write-Section "PitchPilot AI local startup"
Write-Host "Frontend: http://localhost:$frontendPort"
Write-Host "Backend:  http://localhost:$backendPort"
Write-Host "WebSocket: ws://localhost:$backendPort/ws/realtime"

if (Test-PortInUse -Port $frontendPort) {
  Show-PortHelp -Port $frontendPort
  throw "Frontend port $frontendPort is busy."
}

if (Test-PortInUse -Port $backendPort) {
  Show-PortHelp -Port $backendPort
  throw "Backend port $backendPort is busy."
}

if (-not (Test-Path $backendPython)) {
  throw "Backend virtual environment was not found at $backendPython. Run .\setup.ps1 first."
}

$backendCommand = @"
Write-Host 'PitchPilot AI backend -> http://localhost:$backendPort' -ForegroundColor Cyan
Set-Location -LiteralPath '$backendDir'
& '$backendPython' -m uvicorn app.main:app --host 0.0.0.0 --port $backendPort --reload
"@

$frontendCommand = @"
Write-Host 'PitchPilot AI frontend -> http://localhost:$frontendPort' -ForegroundColor Cyan
Set-Location -LiteralPath '$frontendDir'
npm run dev
"@

Write-Section "Starting services"
Start-PowerShellWindow -Title "Backend" -WorkingDirectory $backendDir -Command $backendCommand
Start-PowerShellWindow -Title "Frontend" -WorkingDirectory $frontendDir -Command $frontendCommand

Write-Section "Ready"
Write-Host "Open the URLs above in your browser." -ForegroundColor Green
Write-Host "If Vite reports a different port, use the one shown in the frontend window." -ForegroundColor Green
