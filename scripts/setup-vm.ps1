# ========================================
# K-WISE VM AUTOMATED SETUP SCRIPT
# ========================================
# Purpose: Automate VM setup process
# Run this ON THE VM after cloning repository
# Date: December 10, 2025
# ========================================

param(
    [Parameter(Mandatory=$false)]
    [string]$PostgreSQLPassword,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipNodeInstall,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipOllama,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipDatabaseImport
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  K-WISE VM AUTOMATED SETUP" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory (repository root)
$REPO_ROOT = Split-Path -Parent $PSScriptRoot
$BACKEND_DIR = Join-Path $REPO_ROOT "KWise-Backend"
$FRONTEND_DIR = Join-Path $REPO_ROOT "K-Wise"

Write-Host "Repository Root: $REPO_ROOT" -ForegroundColor Gray
Write-Host ""

# ========================================
# STEP 1: VERIFY PREREQUISITES
# ========================================

Write-Host "[STEP 1/10] Verifying prerequisites..." -ForegroundColor Yellow
Write-Host ""

# Check Node.js
Write-Host "  Checking Node.js..." -ForegroundColor White
try {
    $nodeVersion = node --version
    Write-Host "    ✅ Node.js installed: $nodeVersion" -ForegroundColor Green
    
    if ([version]($nodeVersion -replace 'v', '') -lt [version]"18.0.0") {
        Write-Host "    ⚠️  Node.js version should be 18+, you have $nodeVersion" -ForegroundColor Yellow
        Write-Host "    Recommended: winget install OpenJS.NodeJS.LTS" -ForegroundColor Gray
    }
} catch {
    Write-Host "    ❌ Node.js not found!" -ForegroundColor Red
    
    if (-not $SkipNodeInstall) {
        Write-Host "    Installing Node.js LTS..." -ForegroundColor Yellow
        winget install OpenJS.NodeJS.LTS
        Write-Host "    ✅ Node.js installed. Please restart PowerShell and run this script again." -ForegroundColor Green
        exit 0
    } else {
        Write-Host "    Skipping Node.js installation as requested." -ForegroundColor Gray
    }
}

# Check npm
Write-Host "  Checking npm..." -ForegroundColor White
try {
    $npmVersion = npm --version
    Write-Host "    ✅ npm installed: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "    ❌ npm not found!" -ForegroundColor Red
    exit 1
}

# Check PostgreSQL
Write-Host "  Checking PostgreSQL..." -ForegroundColor White
try {
    $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if ($pgService) {
        Write-Host "    ✅ PostgreSQL service found: $($pgService.Name)" -ForegroundColor Green
        
        if ($pgService.Status -ne "Running") {
            Write-Host "    Starting PostgreSQL service..." -ForegroundColor Yellow
            Start-Service $pgService.Name
            Write-Host "    ✅ PostgreSQL service started" -ForegroundColor Green
        }
    } else {
        Write-Host "    ❌ PostgreSQL service not found!" -ForegroundColor Red
        Write-Host "    Please install PostgreSQL 15+ first" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "    ⚠️  Could not verify PostgreSQL service: $_" -ForegroundColor Yellow
}

# Check Git
Write-Host "  Checking Git..." -ForegroundColor White
try {
    $gitVersion = git --version
    Write-Host "    ✅ Git installed: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "    ⚠️  Git not found (not critical for VM setup)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Prerequisites check complete!" -ForegroundColor Green
Write-Host ""

# ========================================
# STEP 2: INSTALL BACKEND DEPENDENCIES
# ========================================

Write-Host "[STEP 2/10] Installing backend dependencies..." -ForegroundColor Yellow
Write-Host ""

if (Test-Path (Join-Path $BACKEND_DIR "node_modules")) {
    Write-Host "  ℹ️  Backend node_modules already exists. Skipping..." -ForegroundColor Cyan
} else {
    Write-Host "  Installing packages (this may take 5-10 minutes)..." -ForegroundColor White
    
    Push-Location $BACKEND_DIR
    try {
        npm install
        Write-Host ""
        Write-Host "  ✅ Backend dependencies installed!" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Failed to install backend dependencies: $_" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
}

Write-Host ""

# ========================================
# STEP 3: INSTALL FRONTEND DEPENDENCIES
# ========================================

Write-Host "[STEP 3/10] Installing frontend dependencies..." -ForegroundColor Yellow
Write-Host ""

if (Test-Path (Join-Path $FRONTEND_DIR "node_modules")) {
    Write-Host "  ℹ️  Frontend node_modules already exists. Skipping..." -ForegroundColor Cyan
} else {
    Write-Host "  Installing packages (this may take 3-5 minutes)..." -ForegroundColor White
    
    Push-Location $FRONTEND_DIR
    try {
        npm install
        Write-Host ""
        Write-Host "  ✅ Frontend dependencies installed!" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Failed to install frontend dependencies: $_" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
}

Write-Host ""

# ========================================
# STEP 4: INSTALL GLOBAL PACKAGES
# ========================================

Write-Host "[STEP 4/10] Installing global packages..." -ForegroundColor Yellow
Write-Host ""

# Check if PM2 is installed
try {
    $pm2Version = pm2 --version
    Write-Host "  ✅ PM2 already installed: v$pm2Version" -ForegroundColor Green
} catch {
    Write-Host "  Installing PM2..." -ForegroundColor White
    npm install -g pm2
    Write-Host "  ✅ PM2 installed!" -ForegroundColor Green
}

# Check if serve is installed
try {
    $serveVersion = serve --version
    Write-Host "  ✅ serve already installed: v$serveVersion" -ForegroundColor Green
} catch {
    Write-Host "  Installing serve..." -ForegroundColor White
    npm install -g serve
    Write-Host "  ✅ serve installed!" -ForegroundColor Green
}

Write-Host ""

# ========================================
# STEP 5: CREATE DATABASE
# ========================================

if (-not $SkipDatabaseImport) {
    Write-Host "[STEP 5/10] Setting up PostgreSQL database..." -ForegroundColor Yellow
    Write-Host ""
    
    if (-not $PostgreSQLPassword) {
        Write-Host "  Enter PostgreSQL password for user 'postgres': " -ForegroundColor Cyan -NoNewline
        $securePassword = Read-Host -AsSecureString
        $PostgreSQLPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))
    }
    
    $env:PGPASSWORD = $PostgreSQLPassword
    
    Write-Host "  Creating KWiseDB database..." -ForegroundColor White
    
    # Check if database exists
    $dbExists = psql -U postgres -h localhost -lqt | Select-String -Pattern "KWiseDB"
    
    if ($dbExists) {
        Write-Host "  ℹ️  Database KWiseDB already exists" -ForegroundColor Cyan
        
        Write-Host "  Do you want to recreate it? (y/N): " -ForegroundColor Yellow -NoNewline
        $recreate = Read-Host
        
        if ($recreate -eq "y" -or $recreate -eq "Y") {
            Write-Host "  Dropping existing database..." -ForegroundColor White
            psql -U postgres -h localhost -c "DROP DATABASE IF EXISTS `"KWiseDB`";"
            Write-Host "  Creating new database..." -ForegroundColor White
            psql -U postgres -h localhost -c "CREATE DATABASE `"KWiseDB`";"
        }
    } else {
        psql -U postgres -h localhost -c "CREATE DATABASE `"KWiseDB`";"
        Write-Host "  ✅ Database created!" -ForegroundColor Green
    }
    
    Write-Host "  Creating extensions..." -ForegroundColor White
    psql -U postgres -d KWiseDB -h localhost -c "CREATE EXTENSION IF NOT EXISTS `"uuid-ossp`";"
    psql -U postgres -d KWiseDB -h localhost -c "CREATE EXTENSION IF NOT EXISTS `"pg_trgm`";"
    psql -U postgres -d KWiseDB -h localhost -c "CREATE EXTENSION IF NOT EXISTS `"btree_gin`";"
    Write-Host "  ✅ Extensions created!" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "  ⚠️  DATABASE IMPORT REQUIRED" -ForegroundColor Yellow
    Write-Host "  You need to import your database backup now." -ForegroundColor White
    Write-Host ""
    Write-Host "  Option 1 - If you have the backup file locally:" -ForegroundColor Cyan
    Write-Host "    psql -U postgres -d KWiseDB -h localhost -f `"path\to\KWiseDB_export.sql`"" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Option 2 - Download from GitHub release:" -ForegroundColor Cyan
    Write-Host "    gh release download v1.0.0-database --pattern `"KWiseDB_export.zip`"" -ForegroundColor Gray
    Write-Host "    Expand-Archive KWiseDB_export.zip" -ForegroundColor Gray
    Write-Host "    psql -U postgres -d KWiseDB -h localhost -f `"KWiseDB_full_*.sql`"" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "  Press Enter to continue after importing database..." -ForegroundColor Yellow
    Read-Host
    
    Remove-Item Env:\PGPASSWORD
} else {
    Write-Host "[STEP 5/10] Skipping database setup as requested..." -ForegroundColor Gray
    Write-Host ""
}

# ========================================
# STEP 6: INSTALL OLLAMA
# ========================================

if (-not $SkipOllama) {
    Write-Host "[STEP 6/10] Installing Ollama AI service..." -ForegroundColor Yellow
    Write-Host ""
    
    # Check if Ollama is installed
    try {
        $ollamaVersion = ollama --version
        Write-Host "  ✅ Ollama already installed: $ollamaVersion" -ForegroundColor Green
    } catch {
        Write-Host "  Installing Ollama via winget..." -ForegroundColor White
        winget install Ollama.Ollama
        Write-Host "  ✅ Ollama installed!" -ForegroundColor Green
        Write-Host "  ℹ️  You may need to restart PowerShell" -ForegroundColor Cyan
    }
    
    Write-Host ""
} else {
    Write-Host "[STEP 6/10] Skipping Ollama installation as requested..." -ForegroundColor Gray
    Write-Host ""
}

# ========================================
# STEP 7: PULL OLLAMA MODEL
# ========================================

if (-not $SkipOllama) {
    Write-Host "[STEP 7/10] Downloading DeepSeek R1-7b model..." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        $models = ollama list
        
        if ($models -match "deepseek-r1:7b") {
            Write-Host "  ✅ Model deepseek-r1:7b already installed" -ForegroundColor Green
        } else {
            Write-Host "  Downloading model (this will take 10-30 minutes for ~4.7GB)..." -ForegroundColor White
            Write-Host "  Please be patient..." -ForegroundColor Yellow
            ollama pull deepseek-r1:7b
            Write-Host ""
            Write-Host "  ✅ Model downloaded successfully!" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ⚠️  Could not pull model: $_" -ForegroundColor Yellow
        Write-Host "  You can manually run: ollama pull deepseek-r1:7b" -ForegroundColor Gray
    }
    
    Write-Host ""
} else {
    Write-Host "[STEP 7/10] Skipping Ollama model download as requested..." -ForegroundColor Gray
    Write-Host ""
}

# ========================================
# STEP 8: CONFIGURE ENVIRONMENT VARIABLES
# ========================================

Write-Host "[STEP 8/10] Configuring environment variables..." -ForegroundColor Yellow
Write-Host ""

# Backend .env
$backendEnvPath = Join-Path $BACKEND_DIR ".env"
$backendEnvExamplePath = Join-Path $BACKEND_DIR ".env.example"

if (-not (Test-Path $backendEnvPath)) {
    if (Test-Path $backendEnvExamplePath) {
        Write-Host "  Creating backend .env from .env.example..." -ForegroundColor White
        Copy-Item $backendEnvExamplePath $backendEnvPath
        Write-Host "  ✅ Backend .env created!" -ForegroundColor Green
        Write-Host "  ⚠️  IMPORTANT: Edit $backendEnvPath and update:" -ForegroundColor Yellow
        Write-Host "     - DB_PASSWORD" -ForegroundColor Gray
        Write-Host "     - JWT_SECRET (generate with: [Convert]::ToBase64String((New-Object byte[] 32)))" -ForegroundColor Gray
        Write-Host "     - GMAIL_USER and GMAIL_APP_PASSWORD (if using email)" -ForegroundColor Gray
    } else {
        Write-Host "  ⚠️  .env.example not found in backend!" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ℹ️  Backend .env already exists" -ForegroundColor Cyan
}

# Frontend .env
$frontendEnvPath = Join-Path $FRONTEND_DIR ".env"
$frontendEnvExamplePath = Join-Path $FRONTEND_DIR ".env.example"

if (-not (Test-Path $frontendEnvPath)) {
    if (Test-Path $frontendEnvExamplePath) {
        Write-Host "  Creating frontend .env from .env.example..." -ForegroundColor White
        Copy-Item $frontendEnvExamplePath $frontendEnvPath
        Write-Host "  ✅ Frontend .env created!" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  .env.example not found in frontend!" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ℹ️  Frontend .env already exists" -ForegroundColor Cyan
}

Write-Host ""

# ========================================
# STEP 9: BUILD FRONTEND
# ========================================

Write-Host "[STEP 9/10] Building frontend for production..." -ForegroundColor Yellow
Write-Host ""

$frontendBuildDir = Join-Path $FRONTEND_DIR "build"

if (Test-Path $frontendBuildDir) {
    Write-Host "  ℹ️  Frontend build directory already exists. Rebuilding..." -ForegroundColor Cyan
}

Write-Host "  Building React app (this may take 2-5 minutes)..." -ForegroundColor White

Push-Location $FRONTEND_DIR
try {
    npm run build
    Write-Host ""
    Write-Host "  ✅ Frontend built successfully!" -ForegroundColor Green
    
    # Get build size
    $buildSize = (Get-ChildItem $frontendBuildDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  Build size: $([math]::Round($buildSize, 2)) MB" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Frontend build failed: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

Write-Host ""

# ========================================
# STEP 10: CREATE STARTUP SCRIPTS
# ========================================

Write-Host "[STEP 10/10] Creating startup scripts..." -ForegroundColor Yellow
Write-Host ""

$scriptsDir = Join-Path $REPO_ROOT "scripts"
if (-not (Test-Path $scriptsDir)) {
    New-Item -ItemType Directory -Path $scriptsDir -Force | Out-Null
}

# Start Ollama script
$startOllamaScript = Join-Path $scriptsDir "start-ollama.ps1"
$startOllamaContent = @"
Write-Host "Starting Ollama service..." -ForegroundColor Cyan
Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
Start-Sleep -Seconds 3
Write-Host "✅ Ollama service started on http://localhost:11434" -ForegroundColor Green
"@
Set-Content -Path $startOllamaScript -Value $startOllamaContent
Write-Host "  ✅ Created $startOllamaScript" -ForegroundColor Green

# Start All Services script
$startAllScript = Join-Path $scriptsDir "start-all-services.ps1"
$startAllContent = @"
# Start all K-Wise services

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  STARTING K-WISE SERVICES" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Start Ollama
Write-Host "[1/3] Starting Ollama..." -ForegroundColor Yellow
& "$scriptsDir\start-ollama.ps1"

# Start PM2 services
Write-Host ""
Write-Host "[2/3] Starting PM2 services..." -ForegroundColor Yellow
Set-Location "$REPO_ROOT"
pm2 start ecosystem.config.js

# Show status
Write-Host ""
Write-Host "[3/3] Service Status:" -ForegroundColor Yellow
pm2 status

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  ALL SERVICES STARTED!" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access points:" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:  http://localhost:5000" -ForegroundColor White
Write-Host "  Ollama:   http://localhost:11434" -ForegroundColor White
Write-Host ""
Write-Host "Monitor services:" -ForegroundColor Green
Write-Host "  pm2 logs" -ForegroundColor White
Write-Host "  pm2 monit" -ForegroundColor White
Write-Host ""
"@
Set-Content -Path $startAllScript -Value $startAllContent
Write-Host "  ✅ Created $startAllScript" -ForegroundColor Green

Write-Host ""

# ========================================
# SETUP COMPLETE
# ========================================

Write-Host "================================================" -ForegroundColor Green
Write-Host "  ✅ VM SETUP COMPLETE!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "  ✅ Backend dependencies installed" -ForegroundColor White
Write-Host "  ✅ Frontend dependencies installed" -ForegroundColor White
Write-Host "  ✅ Global packages installed (PM2, serve)" -ForegroundColor White
if (-not $SkipDatabaseImport) {
    Write-Host "  ✅ Database created (KWiseDB)" -ForegroundColor White
}
if (-not $SkipOllama) {
    Write-Host "  ✅ Ollama installed" -ForegroundColor White
    Write-Host "  ✅ DeepSeek R1-7b model downloaded" -ForegroundColor White
}
Write-Host "  ✅ Environment files created" -ForegroundColor White
Write-Host "  ✅ Frontend built for production" -ForegroundColor White
Write-Host "  ✅ Startup scripts created" -ForegroundColor White
Write-Host ""

Write-Host "⚠️  BEFORE STARTING SERVICES:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Edit backend .env file:" -ForegroundColor White
Write-Host "     notepad `"$backendEnvPath`"" -ForegroundColor Gray
Write-Host "     Update: DB_PASSWORD, JWT_SECRET, GMAIL credentials" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Verify database imported:" -ForegroundColor White
Write-Host "     psql -U postgres -d KWiseDB -c `"\dt`"" -ForegroundColor Gray
Write-Host ""

Write-Host "🚀 TO START ALL SERVICES:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  powershell -ExecutionPolicy Bypass -File `"$startAllScript`"" -ForegroundColor White
Write-Host ""
Write-Host "  OR manually:" -ForegroundColor Gray
Write-Host "    1. Start Ollama:    powershell -File `"$startOllamaScript`"" -ForegroundColor Gray
Write-Host "    2. Start services:  pm2 start ecosystem.config.js" -ForegroundColor Gray
Write-Host ""

Write-Host "📊 VERIFY DEPLOYMENT:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Backend health:  Invoke-WebRequest http://localhost:5000/api/health" -ForegroundColor White
Write-Host "  Frontend:        Start http://localhost:3000" -ForegroundColor White
Write-Host "  PM2 status:      pm2 status" -ForegroundColor White
Write-Host "  View logs:       pm2 logs" -ForegroundColor White
Write-Host ""

Write-Host "📚 For more help, see: ⚡_VM_QUICK_SETUP_GUIDE.md" -ForegroundColor Gray
Write-Host ""
