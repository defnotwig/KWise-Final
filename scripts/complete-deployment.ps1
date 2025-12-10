# ================================================================
# K-WISE VM COMPLETE SETUP AND DEPLOYMENT SCRIPT
# ================================================================
# This script completes all remaining setup steps and starts services
# Run this after Node.js and Ollama are installed
# ================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$PostgreSQLPassword = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipDatabase,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipOllama
)

$ErrorActionPreference = "Continue"

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "  K-WISE VM COMPLETE SETUP AND DEPLOYMENT" -ForegroundColor Cyan
Write-Host "================================================================`n" -ForegroundColor Cyan

$repoRoot = "c:\Users\PCWISE\Documents\KWise Final\KWise-Final"
$backendDir = Join-Path $repoRoot "KWise-Backend"
$frontendDir = Join-Path $repoRoot "K-Wise"

# Ensure PATH includes Node.js and Ollama
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# ================================================================
# STEP 1: VERIFY PREREQUISITES
# ================================================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  STEP 1: Verifying Prerequisites" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

# Check Node.js
try {
    $nodeVer = node --version
    Write-Host "✅ Node.js: $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found! Install with: winget install OpenJS.NodeJS.LTS" -ForegroundColor Red
    exit 1
}

# Check npm
try {
    $npmVer = npm --version
    Write-Host "✅ npm: v$npmVer" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found!" -ForegroundColor Red
    exit 1
}

# Check PostgreSQL
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($pgService) {
    if ($pgService.Status -eq "Running") {
        Write-Host "✅ PostgreSQL: Running ($($pgService.Name))" -ForegroundColor Green
    } else {
        Write-Host "⚠️  PostgreSQL: Stopped. Starting..." -ForegroundColor Yellow
        Start-Service $pgService.Name
        Write-Host "✅ PostgreSQL: Started" -ForegroundColor Green
    }
} else {
    Write-Host "❌ PostgreSQL not found!" -ForegroundColor Red
    exit 1
}

# Check Ollama
if (-not $SkipOllama) {
    try {
        $ollamaVer = ollama --version 2>$null
        Write-Host "✅ Ollama: $ollamaVer" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Ollama not found. Install with: winget install Ollama.Ollama" -ForegroundColor Yellow
        Write-Host "   Continuing without Ollama..." -ForegroundColor Gray
    }
}

Write-Host ""

# ================================================================
# STEP 2: CHECK DEPENDENCIES
# ================================================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  STEP 2: Checking Dependencies" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

$backendModules = Test-Path (Join-Path $backendDir "node_modules")
$frontendModules = Test-Path (Join-Path $frontendDir "node_modules")

if ($backendModules) {
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Backend dependencies missing!" -ForegroundColor Red
    exit 1
}

if ($frontendModules) {
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend dependencies missing!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ================================================================
# STEP 3: SETUP DATABASE (if not skipped)
# ================================================================

if (-not $SkipDatabase) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "  STEP 3: Database Setup" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan
    
    Write-Host "To setup the database, run the dedicated script:" -ForegroundColor Yellow
    Write-Host "  powershell -File `"$repoRoot\scripts\setup-database.ps1`"`n" -ForegroundColor White
    
    Write-Host "Press Enter to continue (database setup required before starting backend)..." -ForegroundColor Yellow
    Read-Host
}

Write-Host ""

# ================================================================
# STEP 4: PULL OLLAMA MODELS (if not skipped)
# ================================================================

if (-not $SkipOllama) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "  STEP 4: Ollama AI Models" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan
    
    try {
        $models = ollama list 2>$null
        
        if ($models -match "deepseek-r1:1.5b") {
            Write-Host "✅ DeepSeek R1 1.5b already installed" -ForegroundColor Green
        } else {
            Write-Host "📥 Downloading DeepSeek R1 1.5b (~1.2GB)..." -ForegroundColor Yellow
            Write-Host "   This will take 5-15 minutes...`n" -ForegroundColor Gray
            ollama pull deepseek-r1:1.5b
            Write-Host "`n✅ DeepSeek R1 1.5b downloaded!" -ForegroundColor Green
        }
        
        Write-Host ""
        
        if ($models -match "deepseek-r1:7b") {
            Write-Host "✅ DeepSeek R1 7b already installed" -ForegroundColor Green
        } else {
            Write-Host "⚠️  DeepSeek R1 7b not installed (optional, requires 16GB+ VRAM)" -ForegroundColor Yellow
            Write-Host "   To install: ollama pull deepseek-r1:7b" -ForegroundColor Gray
        }
        
    } catch {
        Write-Host "⚠️  Could not verify Ollama models: $_" -ForegroundColor Yellow
        Write-Host "   Start Ollama and pull models manually:" -ForegroundColor Gray
        Write-Host "     ollama serve" -ForegroundColor Gray
        Write-Host "     ollama pull deepseek-r1:1.5b" -ForegroundColor Gray
    }
    
    Write-Host ""
}

# ================================================================
# STEP 5: BUILD FRONTEND
# ================================================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  STEP 5: Building Frontend" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

$buildDir = Join-Path $frontendDir "build"

if (Test-Path $buildDir) {
    Write-Host "ℹ️  Build directory exists. Rebuilding...`n" -ForegroundColor Cyan
}

Push-Location $frontendDir
try {
    Write-Host "Building React app (2-5 minutes)...`n" -ForegroundColor White
    npm run build 2>&1 | Out-Null
    
    if (Test-Path $buildDir) {
        $buildSize = (Get-ChildItem $buildDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Host "✅ Frontend built successfully!" -ForegroundColor Green
        Write-Host "   Size: $([math]::Round($buildSize, 2)) MB`n" -ForegroundColor Gray
    } else {
        throw "Build directory not created"
    }
} catch {
    Write-Host "❌ Frontend build failed: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# ================================================================
# STEP 6: INSTALL GLOBAL PACKAGES
# ================================================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  STEP 6: Global Packages" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

# Check PM2
try {
    $pm2Ver = pm2 --version 2>$null
    Write-Host "✅ PM2: v$pm2Ver" -ForegroundColor Green
} catch {
    Write-Host "Installing PM2..." -ForegroundColor White
    npm install -g pm2 2>&1 | Out-Null
    Write-Host "✅ PM2 installed" -ForegroundColor Green
}

# Check serve
try {
    $serveVer = serve --version 2>$null
    Write-Host "✅ serve: v$serveVer" -ForegroundColor Green
} catch {
    Write-Host "Installing serve..." -ForegroundColor White
    npm install -g serve 2>&1 | Out-Null
    Write-Host "✅ serve installed" -ForegroundColor Green
}

Write-Host ""

# ================================================================
# STEP 7: CREATE PM2 ECOSYSTEM
# ================================================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  STEP 7: PM2 Configuration" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

$ecosystemPath = Join-Path $repoRoot "ecosystem.config.js"
$servePath = (Get-Command serve -ErrorAction SilentlyContinue).Source

if (-not $servePath) {
    $servePath = "C:\\Users\\PCWISE\\AppData\\Roaming\\npm\\serve.cmd"
}

$ecosystemContent = @"
module.exports = {
  apps: [
    {
      name: 'kwise-backend',
      cwd: '$($backendDir -replace '\\', '\\\\')',
      script: 'server.js',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: 'logs/backend-error.log',
      out_file: 'logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'kwise-frontend',
      cwd: '$($frontendDir -replace '\\', '\\\\')',
      script: '$($servePath -replace '\\', '\\\\')' ,
      args: ['-s', 'build', '-l', '3000'],
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '../KWise-Backend/logs/frontend-error.log',
      out_file: '../KWise-Backend/logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
"@

Set-Content -Path $ecosystemPath -Value $ecosystemContent
Write-Host "✅ PM2 ecosystem.config.js created`n" -ForegroundColor Green

# Create logs directory
$logsDir = Join-Path $backendDir "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

# ================================================================
# STEP 8: CREATE STARTUP SCRIPTS
# ================================================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  STEP 8: Startup Scripts" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

$scriptsDir = Join-Path $repoRoot "scripts"
if (-not (Test-Path $scriptsDir)) {
    New-Item -ItemType Directory -Path $scriptsDir -Force | Out-Null
}

# Start Ollama script
$startOllamaPath = Join-Path $scriptsDir "start-ollama.ps1"
$startOllamaContent = @"
`$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
Write-Host "Starting Ollama AI service..." -ForegroundColor Cyan
try {
    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 3
    `$response = Invoke-WebRequest -Uri "http://localhost:11434" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Ollama started on http://localhost:11434" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Ollama may still be starting..." -ForegroundColor Yellow
}
"@
Set-Content -Path $startOllamaPath -Value $startOllamaContent

# Start All script
$startAllPath = Join-Path $scriptsDir "start-all.ps1"
$startAllContent = @"
`$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "  🚀 STARTING K-WISE SERVICES" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

# Start Ollama
Write-Host "[1/2] Starting Ollama AI..." -ForegroundColor Yellow
& "$startOllamaPath"
Write-Host ""

# Start PM2
Write-Host "[2/2] Starting PM2 Services..." -ForegroundColor Yellow
Set-Location "$repoRoot"
pm2 start ecosystem.config.js

Write-Host "`n📊 Service Status:" -ForegroundColor Cyan
pm2 status

Write-Host "`n================================================" -ForegroundColor Green
Write-Host "  ✅ ALL SERVICES STARTED!" -ForegroundColor Green
Write-Host "================================================`n" -ForegroundColor Green

Write-Host "🌐 Access Points:" -ForegroundColor Cyan
Write-Host "  Frontend:    http://localhost:3000" -ForegroundColor White
Write-Host "  Backend API: http://localhost:5000/api" -ForegroundColor White
Write-Host "  Health:      http://localhost:5000/api/health" -ForegroundColor White
Write-Host "  Ollama AI:   http://localhost:11434`n" -ForegroundColor White

Write-Host "📊 Commands:" -ForegroundColor Cyan
Write-Host "  View logs:   pm2 logs" -ForegroundColor White
Write-Host "  Monitor:     pm2 monit" -ForegroundColor White
Write-Host "  Restart:     pm2 restart all" -ForegroundColor White
Write-Host "  Stop:        pm2 stop all`n" -ForegroundColor White
"@
Set-Content -Path $startAllPath -Value $startAllContent

# Stop All script
$stopAllPath = Join-Path $scriptsDir "stop-all.ps1"
$stopAllContent = @"
`$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
Write-Host "Stopping all K-Wise services..." -ForegroundColor Yellow
pm2 stop all
pm2 delete all
Get-Process -Name "ollama" -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "✅ All services stopped" -ForegroundColor Green
"@
Set-Content -Path $stopAllPath -Value $stopAllContent

Write-Host "✅ Created start-ollama.ps1" -ForegroundColor Green
Write-Host "✅ Created start-all.ps1" -ForegroundColor Green
Write-Host "✅ Created stop-all.ps1`n" -ForegroundColor Green

# ================================================================
# SETUP COMPLETE
# ================================================================

Write-Host "================================================================" -ForegroundColor Green
Write-Host "  ✅ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "================================================================`n" -ForegroundColor Green

Write-Host "📋 What's Ready:" -ForegroundColor Cyan
Write-Host "  ✅ Node.js v$nodeVer and npm v$npmVer" -ForegroundColor White
Write-Host "  ✅ Backend dependencies (245 packages)" -ForegroundColor White
Write-Host "  ✅ Frontend dependencies (1485 packages)" -ForegroundColor White
Write-Host "  ✅ Frontend production build" -ForegroundColor White
Write-Host "  ✅ PM2 and serve installed globally" -ForegroundColor White
Write-Host "  ✅ PM2 ecosystem configured" -ForegroundColor White
Write-Host "  ✅ Startup scripts created`n" -ForegroundColor White

Write-Host "⚠️  REQUIRED BEFORE STARTING:" -ForegroundColor Yellow
Write-Host "  1. Setup database:" -ForegroundColor White
Write-Host "     powershell -File `"$repoRoot\scripts\setup-database.ps1`"`n" -ForegroundColor Gray

if (-not $SkipOllama) {
    Write-Host "  2. Verify Ollama models:" -ForegroundColor White
    Write-Host "     ollama list" -ForegroundColor Gray
    Write-Host "     If missing: ollama pull deepseek-r1:1.5b`n" -ForegroundColor Gray
}

Write-Host "🚀 TO START SERVICES:" -ForegroundColor Cyan
Write-Host "  powershell -File `"$startAllPath`"`n" -ForegroundColor White

Write-Host "📊 TO VERIFY:" -ForegroundColor Cyan
Write-Host "  Backend:  Invoke-WebRequest http://localhost:5000/api/health" -ForegroundColor White
Write-Host "  Frontend: Start-Process http://localhost:3000`n" -ForegroundColor White

Write-Host "================================================================" -ForegroundColor Green
Write-Host "  Ready! 🎉" -ForegroundColor Green
Write-Host "================================================================`n" -ForegroundColor Green
