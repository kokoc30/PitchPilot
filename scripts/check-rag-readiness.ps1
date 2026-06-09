# Resume RAG readiness smoke check.
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Pass($message) {
    Write-Host "[PASS] $message" -ForegroundColor Green
}

function Warn($message) {
    Write-Host "[WARN] $message" -ForegroundColor Yellow
}

function Fail($message) {
    Write-Host "[FAIL] $message" -ForegroundColor Red
    exit 1
}

Write-Host "PitchPilot AI Resume RAG readiness check"
Write-Host "========================================"

$requiredMigrations = @(
    "backend/supabase/migrations/2026_task19_resume_rag_foundation.sql",
    "backend/supabase/migrations/2026_task20_resume_question_generation.sql",
    "backend/supabase/migrations/2026_task21_practice_prompt_context.sql",
    "backend/supabase/migrations/2026_task22_resume_question_history.sql",
    "backend/supabase/migrations/2026_task23_resume_rag_security_hardening.sql"
)

foreach ($migration in $requiredMigrations) {
    if (Test-Path $migration) {
        Pass "Migration present: $migration"
    } else {
        Fail "Missing migration: $migration"
    }
}

$frontendEnvFiles = Get-ChildItem -Path "frontend" -Force -File -Filter ".env*" -ErrorAction SilentlyContinue
$forbiddenFrontendKeys = @(
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_API_KEY",
    "GEMINI_API_KEY",
    "DEEPGRAM_API_KEY",
    "SERVICE_ROLE"
)

foreach ($envFile in $frontendEnvFiles) {
    $rawEnv = Get-Content $envFile.FullName -Raw
    if ($rawEnv -match "sb_secret|service_role") {
        Fail "Possible backend secret value appears in frontend env file: $($envFile.Name)"
    }
    $keys = Get-Content $envFile.FullName |
        Where-Object { $_ -match "=" } |
        ForEach-Object { ($_ -split "=", 2)[0].Trim() }
    foreach ($key in $keys) {
        if ($forbiddenFrontendKeys -contains $key) {
            Fail "Backend-only key appears in frontend env file: $($envFile.Name) -> $key"
        }
    }
}
Pass "Frontend env files contain only frontend-safe keys"

$frontendSourceLeak = Select-String `
    -Path "frontend/src/**/*" `
    -Pattern "VITE_SUPABASE_SERVICE_ROLE_KEY|VITE_OPENAI_API_KEY|VITE_GEMINI_API_KEY|VITE_DEEPGRAM_API_KEY" `
    -ErrorAction SilentlyContinue
if ($frontendSourceLeak) {
    Fail "Frontend source references a VITE_* backend secret name"
}
Pass "Frontend source does not reference VITE_* backend secret names"

Write-Host ""
Write-Host "Compiling backend..."
Push-Location "backend"
python -m compileall app | Out-Host
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Fail "Backend compile failed"
}
Pop-Location
Pass "Backend compile passed"

Write-Host ""
Write-Host "Building frontend..."
Push-Location "frontend"
npm run build | Out-Host
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Fail "Frontend build failed"
}
Pop-Location
Pass "Frontend build passed"

$healthUrl = "http://localhost:8000/health"
try {
    $health = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 3
    if ($health.status) {
        Pass "Backend health endpoint responded"
    }

    Invoke-RestMethod -Uri "http://localhost:8000/api/diagnostics" -Method Get -TimeoutSec 3 | Out-Null
    Pass "Diagnostics endpoint responded"

    Invoke-RestMethod -Uri "http://localhost:8000/api/resumes/status" -Method Get -TimeoutSec 3 | Out-Null
    Pass "Resume RAG status endpoint responded"

    try {
        Invoke-RestMethod -Uri "http://localhost:8000/api/resumes" -Method Get -TimeoutSec 3 | Out-Null
        Warn "GET /api/resumes without auth did not return 401"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 401) {
            Pass "GET /api/resumes without auth returns 401"
        } else {
            Warn "GET /api/resumes without auth returned unexpected status"
        }
    }
} catch {
    Warn "Backend is not running on http://localhost:8000; skipped live API checks"
}

Write-Host ""
Pass "Resume RAG readiness checks completed"
