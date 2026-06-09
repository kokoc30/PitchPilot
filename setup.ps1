Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$frontendDir = Join-Path $root "frontend"
$backendDir = Join-Path $root "backend"
$rootEnvExample = Join-Path $root ".env.example"
$rootEnv = Join-Path $root ".env"
$frontendEnvExample = Join-Path $frontendDir ".env.example"
$frontendEnv = Join-Path $frontendDir ".env"
$backendEnvExample = Join-Path $backendDir ".env.example"
$backendEnv = Join-Path $backendDir ".env"
$backendVenvPython = Join-Path $backendDir ".venv\Scripts\python.exe"
$backendVenvConfig = Join-Path $backendDir ".venv\pyvenv.cfg"

function Write-Section {
  param([string]$Message)
  Write-Host ""
  Write-Host $Message -ForegroundColor Cyan
}

function Assert-CommandAvailable {
  param(
    [string[]]$Names,
    [string]$FriendlyName
  )

  foreach ($name in $Names) {
    if (Get-Command $name -ErrorAction SilentlyContinue) {
      return $name
    }
  }

  throw "$FriendlyName is required but was not found. Please install it and try again."
}

function Invoke-CheckedCommand {
  param(
    [scriptblock]$ScriptBlock,
    [string]$ErrorMessage
  )

  & $ScriptBlock
  if ($LASTEXITCODE -ne 0) {
    throw $ErrorMessage
  }
}

function Copy-EnvExampleIfMissing {
  param(
    [string]$ExamplePath,
    [string]$TargetPath,
    [string]$Label
  )

  if ((-not (Test-Path $TargetPath)) -and (Test-Path $ExamplePath)) {
    Copy-Item -Path $ExamplePath -Destination $TargetPath
    Write-Host "$Label .env created from .env.example." -ForegroundColor Green
  }
}

function Test-BackendVirtualEnvironmentValid {
  return (Test-Path $backendVenvPython) -and (Test-Path $backendVenvConfig)
}

function Reset-BackendVirtualEnvironment {
  if (Test-Path (Join-Path $backendDir ".venv")) {
    Remove-Item -Recurse -Force (Join-Path $backendDir ".venv")
  }
}

$nodeCommand = Assert-CommandAvailable -Names @("node") -FriendlyName "Node.js"
$npmCommand = Assert-CommandAvailable -Names @("npm") -FriendlyName "npm"
$pythonCommand = Assert-CommandAvailable -Names @("python", "py") -FriendlyName "Python"
$gitCommand = Assert-CommandAvailable -Names @("git") -FriendlyName "Git"

Write-Section "Prerequisites"
Write-Host "Node.js: $nodeCommand" -ForegroundColor Green
Write-Host "npm: $npmCommand" -ForegroundColor Green
Write-Host "Python: $pythonCommand" -ForegroundColor Green
Write-Host "Git: $gitCommand" -ForegroundColor Green

Write-Section "Environment files"
Copy-EnvExampleIfMissing -ExamplePath $rootEnvExample -TargetPath $rootEnv -Label "Root"
Copy-EnvExampleIfMissing -ExamplePath $frontendEnvExample -TargetPath $frontendEnv -Label "Frontend"
Copy-EnvExampleIfMissing -ExamplePath $backendEnvExample -TargetPath $backendEnv -Label "Backend"
Write-Host "Fill in real Supabase and API keys manually before running the app." -ForegroundColor Yellow

Write-Section "Frontend setup"
if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
  Push-Location $frontendDir
  try {
    Invoke-CheckedCommand -ScriptBlock { & $npmCommand install } -ErrorMessage "Frontend dependency installation failed."
  } finally {
    Pop-Location
  }
} else {
  Write-Host "frontend/node_modules already exists; skipping npm install." -ForegroundColor Green
}

Write-Section "Backend setup"
if (-not (Test-BackendVirtualEnvironmentValid)) {
  if (Test-Path (Join-Path $backendDir ".venv")) {
    Write-Host "backend/.venv is incomplete; recreating it." -ForegroundColor Yellow
    Reset-BackendVirtualEnvironment
  }

  Push-Location $backendDir
  try {
    if ($pythonCommand -eq "py") {
      Invoke-CheckedCommand -ScriptBlock { & $pythonCommand -3 -m venv .venv } -ErrorMessage "Backend virtual environment creation failed."
    } else {
      Invoke-CheckedCommand -ScriptBlock { & $pythonCommand -m venv .venv } -ErrorMessage "Backend virtual environment creation failed."
    }
  } finally {
    Pop-Location
  }
} else {
  Write-Host "backend/.venv already exists; reusing it." -ForegroundColor Green
}

Push-Location $backendDir
try {
  Invoke-CheckedCommand -ScriptBlock { & $backendVenvPython -m pip install --upgrade pip } -ErrorMessage "Upgrading pip in the backend virtual environment failed."
  Invoke-CheckedCommand -ScriptBlock { & $backendVenvPython -m pip install -r requirements.txt } -ErrorMessage "Backend dependency installation failed."
} finally {
  Pop-Location
}

Write-Section "Validation"
Push-Location $frontendDir
try {
  Invoke-CheckedCommand -ScriptBlock { & $npmCommand run build } -ErrorMessage "Frontend build validation failed."
} finally {
  Pop-Location
}

Push-Location $backendDir
try {
  Invoke-CheckedCommand -ScriptBlock { & $backendVenvPython -m compileall app } -ErrorMessage "Backend compile validation failed."
} finally {
  Pop-Location
}

Write-Section "Setup complete"
Write-Host "Run .\start.ps1 to launch the app." -ForegroundColor Green