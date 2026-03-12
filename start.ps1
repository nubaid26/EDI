#Requires -Version 5.1
param(
    [switch]$UseDocker,
    [switch]$NoBrowser
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step { param($msg) Write-Host ""; Write-Host ">>> $msg" -ForegroundColor Cyan }
function Write-Ok   { param($msg) Write-Host "    OK   $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "    WARN $msg" -ForegroundColor Yellow }
function Write-Fail { param($msg) Write-Host "    FAIL $msg" -ForegroundColor Red; exit 1 }

function Test-Cmd {
    param([string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

Write-Host ""
Write-Host "================================================" -ForegroundColor White
Write-Host "    CloudGuard AI -- Project Launcher           " -ForegroundColor White
Write-Host "================================================" -ForegroundColor White

# --- 1. .env file -------------------------------------------------------------
Write-Step "Checking environment configuration"
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Warn ".env missing -- created from .env.example"
        Write-Warn "Edit .env and set GEMINI_API_KEY before using AI features"
    } else {
        Write-Warn "No .env or .env.example found -- continuing without it"
    }
} else {
    Write-Ok ".env found"
}

# --- 2. Docker ----------------------------------------------------------------
Write-Step "Checking Docker"
$DockerAvailable = Test-Cmd "docker"

if ($DockerAvailable) {
    Write-Ok "Docker CLI found"
    $dockerRunning = $false
    try { $null = docker info 2>&1; $dockerRunning = ($LASTEXITCODE -eq 0) } catch {}

    if (-not $dockerRunning) {
        Write-Warn "Docker daemon not running -- trying to start Docker Desktop..."
        $dd = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
        if (Test-Path $dd) {
            Start-Process $dd
            $waited = 0
            while (-not $dockerRunning -and $waited -lt 60) {
                Start-Sleep 3; $waited += 3
                try { $null = docker info 2>&1; $dockerRunning = ($LASTEXITCODE -eq 0) } catch {}
            }
        }
        if (-not $dockerRunning) {
            Write-Warn "Docker daemon unavailable -- skipping Docker"
            $DockerAvailable = $false
        }
    }

    if ($DockerAvailable -and $UseDocker) {
        $cf = "docker\docker-compose.yml"
        if (Test-Path $cf) {
            Write-Step "Starting via Docker Compose"
            docker compose -f $cf up --build -d
            if ($LASTEXITCODE -eq 0) {
                Write-Ok "Docker Compose up"
                Write-Host "    Backend   : http://localhost:3000" -ForegroundColor Green
                Write-Host "    ML Engine : http://localhost:8000" -ForegroundColor Green
                if (-not $NoBrowser) { Start-Process "http://localhost:3000" }
                Write-Host "    To stop: docker compose -f docker\docker-compose.yml down"
                exit 0
            }
            Write-Warn "Docker Compose failed -- falling back to local mode"
        } else {
            Write-Warn "docker-compose.yml not found -- falling back to local mode"
        }
    } elseif ($DockerAvailable) {
        Write-Ok "Docker running (use -UseDocker to launch via Docker Compose)"
    }
} else {
    Write-Warn "Docker not found -- running services locally"
}

# --- 3. Node.js + npm ---------------------------------------------------------
Write-Step "Checking Node.js and npm"
if (-not (Test-Cmd "node")) { Write-Fail "Node.js not installed -- get it from https://nodejs.org" }
if (-not (Test-Cmd "npm"))  { Write-Fail "npm not found -- reinstall Node.js" }
Write-Ok "Node $(node --version)  npm v$(npm --version)"

if (-not (Test-Path "node_modules")) {
    Write-Step "Installing npm dependencies..."
    npm install
    if ($LASTEXITCODE -ne 0) { Write-Fail "npm install failed" }
    Write-Ok "npm dependencies installed"
} else {
    Write-Ok "node_modules present (skipping)"
}

# --- 4. Python ----------------------------------------------------------------
Write-Step "Checking Python 3"
$PyCmd = $null
foreach ($c in @("python", "python3", "py")) {
    if (Test-Cmd $c) {
        if ((& $c --version 2>&1) -match "Python 3") { $PyCmd = $c; break }
    }
}

if ($PyCmd) {
    Write-Ok "Python: $((& $PyCmd --version 2>&1))"
    if (Test-Path "python_services\requirements.txt") {
        $null = & $PyCmd -c "import fastapi" 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Step "Installing Python dependencies..."
            & $PyCmd -m pip install -r python_services\requirements.txt -q
            if ($LASTEXITCODE -ne 0) { Write-Warn "pip install had errors -- ML engine may fail" }
            else { Write-Ok "Python dependencies installed" }
        } else {
            Write-Ok "Python dependencies satisfied"
        }
    }
} else {
    Write-Warn "Python 3 not found -- ML engine will be skipped"
}

# --- 5. Start ML Engine -------------------------------------------------------
if ($PyCmd -and (Test-Path "python_services\ml_engine\main.py")) {
    Write-Step "Launching Python FastAPI ML engine (port 8000)"
    $pyCmd2 = $PyCmd
    Start-Process powershell `
        -ArgumentList "-NoExit", "-Command", `
          "cd '$ScriptDir'; Write-Host 'ML Engine starting...' -ForegroundColor Magenta; $pyCmd2 -m uvicorn python_services.ml_engine.main:app --host 0.0.0.0 --port 8000 --reload" `
        -WindowStyle Normal
    Write-Ok "ML Engine window opened --> http://localhost:8000"
} else {
    Write-Warn "Skipping ML engine"
}

# --- 6. Start Node dev server -------------------------------------------------
Write-Step "Launching CloudGuard AI dev server (port 3000)"
Start-Process powershell `
    -ArgumentList "-NoExit", "-Command", `
      "cd '$ScriptDir'; Write-Host 'CloudGuard starting...' -ForegroundColor Cyan; npm run dev" `
    -WindowStyle Normal
Write-Ok "Dev server window opened --> http://localhost:3000"

# --- 7. Open browser ----------------------------------------------------------
if (-not $NoBrowser) {
    Write-Step "Opening browser in 4s..."
    Start-Sleep 4
    Start-Process "http://localhost:3000"
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  CloudGuard AI is starting up!" -ForegroundColor Green
Write-Host "  Marketing site : http://localhost:3000/" -ForegroundColor Green
Write-Host "  Dashboard app  : http://localhost:3000/app" -ForegroundColor Green
Write-Host "  ML Engine API  : http://localhost:8000/docs" -ForegroundColor Green
Write-Host "  Close the opened windows to stop services." -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
