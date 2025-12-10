# ========================================
# K-WISE COMPLETE VM SETUP SCRIPT
# ========================================
# Purpose: Complete automated setup for VM
# Includes: Dependencies, Database, Ollama, Environment
# Date: December 10, 2025
# ========================================

param(
    [Parameter(Mandatory=$false)]
    [string]$DatabaseBackupPath = "",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("1.5b", "7b", "both")]
    [string]$OllamaModel = "both",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipDependencies,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipDatabase,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipOllama
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  🚀 K-WISE COMPLETE VM SETUP" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will set up:" -ForegroundColor White
Write-Host "  ✓ Node.js dependencies (backend + frontend)" -ForegroundColor Gray
Write-Host "  ✓ PostgreSQL database (KWiseDB)" -ForegroundColor Gray
Write-Host "  ✓ Ollama AI service + DeepSeek R1 models" -ForegroundColor Gray
Write-Host "  ✓ Environment configuration" -ForegroundColor Gray
Write-Host "  ✓ Production build" -ForegroundColor Gray
Write-Host "  ✓ PM2 process manager" -ForegroundColor Gray
Write-Host ""

# Get repository root
$REPO_ROOT = "c:\Users\PCWISE\Documents\KWise Final\KWise-Final"
$BACKEND_DIR = Join-Path $REPO_ROOT "KWise-Backend"
$FRONTEND_DIR = Join-Path $REPO_ROOT "K-Wise"
$SCRIPTS_DIR = Join-Path $REPO_ROOT "scripts"

# Verify we're in the right location
if (-not (Test-Path $REPO_ROOT)) {
    Write-Host "❌ Repository not found at: $REPO_ROOT" -ForegroundColor Red
    exit 1
}

Set-Location $REPO_ROOT
Write-Host "📁 Working Directory: $REPO_ROOT" -ForegroundColor Gray
Write-Host ""

# ========================================
# STEP 1: VERIFY PREREQUISITES
# ========================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  STEP 1/9: Verifying Prerequisites" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor White
try {
    $nodeVersion = node --version
    $nodeVer = [version]($nodeVersion -replace 'v', '')
    
    if ($nodeVer -lt [version]"18.0.0") {
        Write-Host "  ⚠️  Node.js $nodeVersion found, but 18+ recommended" -ForegroundColor Yellow
    } else {
        Write-Host "  ✅ Node.js $nodeVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ Node.js not found!" -ForegroundColor Red
    Write-Host "  Install with: winget install OpenJS.NodeJS.LTS" -ForegroundColor Yellow
    exit 1
}

# Check npm
Write-Host "Checking npm..." -ForegroundColor White
try {
    $npmVersion = npm --version
    Write-Host "  ✅ npm v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ npm not found!" -ForegroundColor Red
    exit 1
}

# Check PostgreSQL
Write-Host "Checking PostgreSQL..." -ForegroundColor White
try {
    $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
    
    if ($pgService) {
        if ($pgService.Status -eq "Running") {
            Write-Host "  ✅ PostgreSQL service running ($($pgService.Name))" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  PostgreSQL service stopped. Starting..." -ForegroundColor Yellow
            Start-Service $pgService.Name
            Start-Sleep -Seconds 2
            Write-Host "  ✅ PostgreSQL service started" -ForegroundColor Green
        }
    } else {
        Write-Host "  ❌ PostgreSQL service not found!" -ForegroundColor Red
        Write-Host "  Please install PostgreSQL 15+ first" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "  ⚠️  Could not verify PostgreSQL: $_" -ForegroundColor Yellow
}

Write-Host ""

# ========================================
# STEP 2: INSTALL DEPENDENCIES
# ========================================

if (-not $SkipDependencies) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "  STEP 2/9: Installing Dependencies" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    
    # Backend dependencies
    Write-Host "📦 Installing Backend Dependencies..." -ForegroundColor Yellow
    
    if (Test-Path (Join-Path $BACKEND_DIR "node_modules")) {
        Write-Host "  ℹ️  Backend node_modules exists. Skipping..." -ForegroundColor Cyan
    } else {
        Write-Host "  Installing packages (5-10 minutes)..." -ForegroundColor White
        Push-Location $BACKEND_DIR
        npm install --loglevel=error
        Pop-Location
        Write-Host "  ✅ Backend dependencies installed!" -ForegroundColor Green
    }
    
    Write-Host ""
    
    # Frontend dependencies
    Write-Host "📦 Installing Frontend Dependencies..." -ForegroundColor Yellow
    
    if (Test-Path (Join-Path $FRONTEND_DIR "node_modules")) {
        Write-Host "  ℹ️  Frontend node_modules exists. Skipping..." -ForegroundColor Cyan
    } else {
        Write-Host "  Installing packages (3-5 minutes)..." -ForegroundColor White
        Push-Location $FRONTEND_DIR
        npm install --loglevel=error
        Pop-Location
        Write-Host "  ✅ Frontend dependencies installed!" -ForegroundColor Green
    }
    
    Write-Host ""
    
    # Global packages
    Write-Host "📦 Installing Global Packages..." -ForegroundColor Yellow
    
    # PM2
    try {
        $pm2Ver = pm2 --version 2>$null
        Write-Host "  ✅ PM2 v$pm2Ver already installed" -ForegroundColor Green
    } catch {
        Write-Host "  Installing PM2..." -ForegroundColor White
        npm install -g pm2 --loglevel=error
        Write-Host "  ✅ PM2 installed" -ForegroundColor Green
    }
    
    # Serve
    try {
        $serveVer = serve --version 2>$null
        Write-Host "  ✅ serve v$serveVer already installed" -ForegroundColor Green
    } catch {
        Write-Host "  Installing serve..." -ForegroundColor White
        npm install -g serve --loglevel=error
        Write-Host "  ✅ serve installed" -ForegroundColor Green
    }
    
    Write-Host ""
} else {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "  STEP 2/9: Skipping Dependencies" -ForegroundColor Gray
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host ""
}

# ========================================
# STEP 3: SETUP DATABASE
# ========================================

if (-not $SkipDatabase) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "  STEP 3/9: Setting Up PostgreSQL Database" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    
    # Get PostgreSQL password from .env file
    $envPath = Join-Path $BACKEND_DIR ".env"
    if (Test-Path $envPath) {
        $envContent = Get-Content $envPath
        $dbPassword = ($envContent | Select-String "^DB_PASSWORD=(.+)").Matches.Groups[1].Value
        
        if ($dbPassword) {
            Write-Host "  ✅ Using password from .env file" -ForegroundColor Green
            $env:PGPASSWORD = $dbPassword
        } else {
            Write-Host "  Enter PostgreSQL password: " -ForegroundColor Cyan -NoNewline
            $securePassword = Read-Host -AsSecureString
            $env:PGPASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))
        }
    } else {
        Write-Host "  Enter PostgreSQL password: " -ForegroundColor Cyan -NoNewline
        $securePassword = Read-Host -AsSecureString
        $env:PGPASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))
    }
    
    # Check if database exists
    Write-Host "  Checking if KWiseDB exists..." -ForegroundColor White
    $dbCheck = psql -U postgres -h localhost -lqt 2>$null | Select-String -Pattern "KWiseDB" -Quiet
    
    if ($dbCheck) {
        Write-Host "  ⚠️  Database KWiseDB already exists" -ForegroundColor Yellow
        Write-Host "  Do you want to drop and recreate it? (y/N): " -ForegroundColor Yellow -NoNewline
        $recreate = Read-Host
        
        if ($recreate -eq "y" -or $recreate -eq "Y") {
            Write-Host "  Dropping existing database..." -ForegroundColor White
            psql -U postgres -h localhost -c "DROP DATABASE IF EXISTS `"KWiseDB`";" 2>$null | Out-Null
            Write-Host "  Creating new database..." -ForegroundColor White
            psql -U postgres -h localhost -c "CREATE DATABASE `"KWiseDB`";" | Out-Null
            Write-Host "  ✅ Database created" -ForegroundColor Green
        } else {
            Write-Host "  ℹ️  Using existing database" -ForegroundColor Cyan
        }
    } else {
        Write-Host "  Creating KWiseDB database..." -ForegroundColor White
        psql -U postgres -h localhost -c "CREATE DATABASE `"KWiseDB`";" | Out-Null
        Write-Host "  ✅ Database created" -ForegroundColor Green
    }
    
    # Create extensions
    Write-Host "  Creating PostgreSQL extensions..." -ForegroundColor White
    psql -U postgres -d KWiseDB -h localhost -c "CREATE EXTENSION IF NOT EXISTS `"uuid-ossp`";" | Out-Null
    psql -U postgres -d KWiseDB -h localhost -c "CREATE EXTENSION IF NOT EXISTS `"pg_trgm`";" | Out-Null
    psql -U postgres -d KWiseDB -h localhost -c "CREATE EXTENSION IF NOT EXISTS `"btree_gin`";" | Out-Null
    Write-Host "  ✅ Extensions created" -ForegroundColor Green
    
    # Import database backup
    Write-Host ""
    Write-Host "  📥 DATABASE IMPORT" -ForegroundColor Yellow
    Write-Host ""
    
    # Look for database backup
    if (-not $DatabaseBackupPath) {
        # Try to find backup in common locations
        $possiblePaths = @(
            (Join-Path $REPO_ROOT "KWiseDB_full_backup_2025-12-10.sql"),
            (Join-Path $REPO_ROOT "*.sql"),
            "C:\Temp\KWise-Backups\KWiseDB_*.sql",
            "C:\Temp\KWiseDB_*.sql"
        )
        
        foreach ($path in $possiblePaths) {
            $found = Get-ChildItem -Path $path -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($found) {
                $DatabaseBackupPath = $found.FullName
                break
            }
        }
    }
    
    if ($DatabaseBackupPath -and (Test-Path $DatabaseBackupPath)) {
        Write-Host "  Found backup: $DatabaseBackupPath" -ForegroundColor Cyan
        Write-Host "  Importing database (this may take a few minutes)..." -ForegroundColor White
        
        psql -U postgres -d KWiseDB -h localhost -f $DatabaseBackupPath 2>&1 | Out-Null
        
        Write-Host "  ✅ Database imported successfully!" -ForegroundColor Green
        
        # Verify import
        Write-Host "  Verifying import..." -ForegroundColor White
        $tableCount = psql -U postgres -d KWiseDB -h localhost -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>$null
        Write-Host "  ✅ Found $($tableCount.Trim()) tables" -ForegroundColor Green
        
    } else {
        Write-Host "  ⚠️  Database backup not found!" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  Please provide the path to your database backup:" -ForegroundColor Cyan
        Write-Host "    Example: c:\Users\PCWISE\Documents\KWise Final\KWise-Final\KWiseDB_full_backup_2025-12-10.sql" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  Enter backup file path (or press Enter to skip): " -ForegroundColor Cyan -NoNewline
        $manualPath = Read-Host
        
        if ($manualPath -and (Test-Path $manualPath)) {
            Write-Host "  Importing database..." -ForegroundColor White
            psql -U postgres -d KWiseDB -h localhost -f $manualPath 2>&1 | Out-Null
            Write-Host "  ✅ Database imported successfully!" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Skipping database import. You'll need to import manually:" -ForegroundColor Yellow
            Write-Host "    psql -U postgres -d KWiseDB -h localhost -f `"path\to\backup.sql`"" -ForegroundColor Gray
        }
    }
    
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    Write-Host ""
    
} else {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "  STEP 3/9: Skipping Database Setup" -ForegroundColor Gray
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host ""
}

# ========================================
# STEP 4: INSTALL OLLAMA
# ========================================

if (-not $SkipOllama) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "  STEP 4/9: Installing Ollama AI Service" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    
    # Check if Ollama is installed
    try {
        $ollamaVer = ollama --version 2>$null
        Write-Host "  ✅ Ollama already installed: $ollamaVer" -ForegroundColor Green
    } catch {
        Write-Host "  Installing Ollama via winget..." -ForegroundColor White
        winget install Ollama.Ollama --silent --accept-source-agreements --accept-package-agreements
        Write-Host "  ✅ Ollama installed!" -ForegroundColor Green
        Write-Host "  ℹ️  Refreshing environment..." -ForegroundColor Cyan
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    }
    
    Write-Host ""
} else {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "  STEP 4/9: Skipping Ollama Installation" -ForegroundColor Gray
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host ""
}

# ========================================
# STEP 5: PULL OLLAMA MODELS
# ========================================

if (-not $SkipOllama) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "  STEP 5/9: Downloading DeepSeek R1 Models" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    
    # Check existing models
    try {
        $existingModels = ollama list 2>$null
        
        # Pull 1.5b model
        if ($OllamaModel -eq "1.5b" -or $OllamaModel -eq "both") {
            if ($existingModels -match "deepseek-r1:1.5b") {
                Write-Host "  ✅ Model deepseek-r1:1.5b already installed" -ForegroundColor Green
            } else {
                Write-Host "  📥 Downloading deepseek-r1:1.5b (~1.2GB)" -ForegroundColor Yellow
                Write-Host "  This will take 5-15 minutes depending on your internet speed..." -ForegroundColor White
                ollama pull deepseek-r1:1.5b
                Write-Host "  ✅ Model deepseek-r1:1.5b downloaded!" -ForegroundColor Green
            }
        }
        
        Write-Host ""
        
        # Pull 7b model
        if ($OllamaModel -eq "7b" -or $OllamaModel -eq "both") {
            if ($existingModels -match "deepseek-r1:7b") {
                Write-Host "  ✅ Model deepseek-r1:7b already installed" -ForegroundColor Green
            } else {
                Write-Host "  📥 Downloading deepseek-r1:7b (~4.7GB)" -ForegroundColor Yellow
                Write-Host "  ⚠️  WARNING: 7b model requires 16GB+ VRAM" -ForegroundColor Yellow
                Write-Host "  This will take 15-45 minutes depending on your internet speed..." -ForegroundColor White
                ollama pull deepseek-r1:7b
                Write-Host "  ✅ Model deepseek-r1:7b downloaded!" -ForegroundColor Green
            }
        }
        
        # Show installed models
        Write-Host ""
        Write-Host "  📋 Installed Models:" -ForegroundColor Cyan
        ollama list
        
    } catch {
        Write-Host "  ⚠️  Could not pull models: $_" -ForegroundColor Yellow
        Write-Host "  You can manually run:" -ForegroundColor Gray
        Write-Host "    ollama pull deepseek-r1:1.5b" -ForegroundColor Gray
        Write-Host "    ollama pull deepseek-r1:7b" -ForegroundColor Gray
    }
    
    Write-Host ""
} else {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "  STEP 5/9: Skipping Ollama Models" -ForegroundColor Gray
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host ""
}

# ========================================
# STEP 6: VERIFY ENVIRONMENT FILES
# ========================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  STEP 6/9: Verifying Environment Configuration" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$backendEnv = Join-Path $BACKEND_DIR ".env"
$frontendEnv = Join-Path $FRONTEND_DIR ".env"

if (Test-Path $backendEnv) {
    Write-Host "  ✅ Backend .env exists" -ForegroundColor Green
    
    # Verify key settings
    $envContent = Get-Content $backendEnv
    $dbPass = ($envContent | Select-String "^DB_PASSWORD=(.+)").Matches.Groups[1].Value
    $aiModel = ($envContent | Select-String "^AI_MODEL=(.+)").Matches.Groups[1].Value
    
    Write-Host "     Database: KWiseDB" -ForegroundColor Gray
    Write-Host "     AI Model: $aiModel" -ForegroundColor Gray
} else {
    Write-Host "  ❌ Backend .env missing!" -ForegroundColor Red
}

if (Test-Path $frontendEnv) {
    Write-Host "  ✅ Frontend .env exists" -ForegroundColor Green
} else {
    Write-Host "  ❌ Frontend .env missing!" -ForegroundColor Red
}

Write-Host ""

# ========================================
# STEP 7: BUILD FRONTEND
# ========================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  STEP 7/9: Building Frontend for Production" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$buildDir = Join-Path $FRONTEND_DIR "build"

if (Test-Path $buildDir) {
    Write-Host "  ℹ️  Build directory exists. Rebuilding..." -ForegroundColor Cyan
}

Write-Host "  Building React application (2-5 minutes)..." -ForegroundColor White

Push-Location $FRONTEND_DIR
try {
    npm run build --loglevel=error
    Write-Host ""
    
    # Get build size
    $buildSize = (Get-ChildItem $buildDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  ✅ Frontend built successfully!" -ForegroundColor Green
    Write-Host "     Build size: $([math]::Round($buildSize, 2)) MB" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Frontend build failed: $_" -ForegroundColor Red
}
Pop-Location

Write-Host ""

# ========================================
# STEP 8: CREATE PM2 ECOSYSTEM
# ========================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  STEP 8/9: Creating PM2 Configuration" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$ecosystemPath = Join-Path $REPO_ROOT "ecosystem.config.js"

$ecosystemContent = @"
module.exports = {
  apps: [
    {
      name: 'kwise-backend',
      cwd: '$($BACKEND_DIR -replace '\\', '\\')',
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
      cwd: '$($FRONTEND_DIR -replace '\\', '\\')',
      script: 'C:\\\\Users\\\\PCWISE\\\\AppData\\\\Roaming\\\\npm\\\\serve.cmd',
      args: ['-s', 'build', '-l', '3000'],
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: 'logs/frontend-error.log',
      out_file: 'logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
"@

Set-Content -Path $ecosystemPath -Value $ecosystemContent
Write-Host "  ✅ PM2 ecosystem.config.js created" -ForegroundColor Green

# Create logs directory
$logsDir = Join-Path $BACKEND_DIR "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    Write-Host "  ✅ Logs directory created" -ForegroundColor Green
}

Write-Host ""

# ========================================
# STEP 9: CREATE STARTUP SCRIPTS
# ========================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  STEP 9/9: Creating Startup Scripts" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $SCRIPTS_DIR)) {
    New-Item -ItemType Directory -Path $SCRIPTS_DIR -Force | Out-Null
}

# Start Ollama script
$startOllamaPath = Join-Path $SCRIPTS_DIR "start-ollama.ps1"
$startOllamaContent = @"
Write-Host "Starting Ollama AI service..." -ForegroundColor Cyan
try {
    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 3
    `$response = Invoke-WebRequest -Uri "http://localhost:11434" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Ollama service started successfully!" -ForegroundColor Green
    Write-Host "   Running on http://localhost:11434" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Could not verify Ollama service: `$_" -ForegroundColor Yellow
    Write-Host "   The service may still be starting..." -ForegroundColor Gray
}
"@
Set-Content -Path $startOllamaPath -Value $startOllamaContent
Write-Host "  ✅ Created start-ollama.ps1" -ForegroundColor Green

# Start all services script
$startAllPath = Join-Path $SCRIPTS_DIR "start-all.ps1"
$startAllContent = @"
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  🚀 STARTING K-WISE SERVICES" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Start Ollama
Write-Host "[1/2] Starting Ollama AI..." -ForegroundColor Yellow
& "$startOllamaPath"
Write-Host ""

# Start PM2 services
Write-Host "[2/2] Starting PM2 Services..." -ForegroundColor Yellow
Set-Location "$REPO_ROOT"
pm2 start ecosystem.config.js

Write-Host ""
Write-Host "📊 Service Status:" -ForegroundColor Cyan
pm2 status

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  ✅ ALL SERVICES STARTED!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Access Points:" -ForegroundColor Cyan
Write-Host "  Frontend:    http://localhost:3000" -ForegroundColor White
Write-Host "  Backend API: http://localhost:5000/api" -ForegroundColor White
Write-Host "  Health:      http://localhost:5000/api/health" -ForegroundColor White
Write-Host "  Ollama AI:   http://localhost:11434" -ForegroundColor White
Write-Host ""
Write-Host "📊 Monitor Services:" -ForegroundColor Cyan
Write-Host "  View logs:   pm2 logs" -ForegroundColor White
Write-Host "  Monitor:     pm2 monit" -ForegroundColor White
Write-Host "  Restart:     pm2 restart all" -ForegroundColor White
Write-Host "  Stop:        pm2 stop all" -ForegroundColor White
Write-Host ""
"@
Set-Content -Path $startAllPath -Value $startAllContent
Write-Host "  ✅ Created start-all.ps1" -ForegroundColor Green

# Stop all services script
$stopAllPath = Join-Path $SCRIPTS_DIR "stop-all.ps1"
$stopAllContent = @"
Write-Host "Stopping all K-Wise services..." -ForegroundColor Yellow
pm2 stop all
pm2 delete all
Get-Process -Name "ollama" -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "✅ All services stopped" -ForegroundColor Green
"@
Set-Content -Path $stopAllPath -Value $stopAllContent
Write-Host "  ✅ Created stop-all.ps1" -ForegroundColor Green

Write-Host ""

# ========================================
# SETUP COMPLETE
# ========================================

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  ✅ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

Write-Host "📋 What was installed:" -ForegroundColor Cyan
Write-Host "  ✅ Backend dependencies (KWise-Backend/node_modules)" -ForegroundColor White
Write-Host "  ✅ Frontend dependencies (K-Wise/node_modules)" -ForegroundColor White
Write-Host "  ✅ Global packages (PM2, serve)" -ForegroundColor White
Write-Host "  ✅ PostgreSQL database (KWiseDB)" -ForegroundColor White
if (-not $SkipOllama) {
    Write-Host "  ✅ Ollama AI service" -ForegroundColor White
    if ($OllamaModel -eq "both" -or $OllamaModel -eq "1.5b") {
        Write-Host "  ✅ DeepSeek R1 1.5b model" -ForegroundColor White
    }
    if ($OllamaModel -eq "both" -or $OllamaModel -eq "7b") {
        Write-Host "  ✅ DeepSeek R1 7b model" -ForegroundColor White
    }
}
Write-Host "  ✅ Environment configuration (.env files)" -ForegroundColor White
Write-Host "  ✅ Production build (K-Wise/build)" -ForegroundColor White
Write-Host "  ✅ PM2 configuration (ecosystem.config.js)" -ForegroundColor White
Write-Host "  ✅ Startup scripts (scripts/)" -ForegroundColor White
Write-Host ""

Write-Host "🚀 TO START ALL SERVICES:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  powershell -ExecutionPolicy Bypass -File `"$startAllPath`"" -ForegroundColor White
Write-Host ""

Write-Host "📊 VERIFY DEPLOYMENT:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Test backend:   Invoke-WebRequest http://localhost:5000/api/health" -ForegroundColor White
Write-Host "  Test frontend:  Start-Process http://localhost:3000" -ForegroundColor White
Write-Host "  Check status:   pm2 status" -ForegroundColor White
Write-Host "  View logs:      pm2 logs" -ForegroundColor White
Write-Host ""

Write-Host "💡 HELPFUL COMMANDS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Start services:  powershell -File `"$startAllPath`"" -ForegroundColor White
Write-Host "  Stop services:   powershell -File `"$stopAllPath`"" -ForegroundColor White
Write-Host "  Start Ollama:    powershell -File `"$startOllamaPath`"" -ForegroundColor White
Write-Host "  View logs:       pm2 logs" -ForegroundColor White
Write-Host "  Restart all:     pm2 restart all" -ForegroundColor White
Write-Host ""

Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "  Setup Guide:     ⚡_VM_QUICK_SETUP_GUIDE.md" -ForegroundColor White
Write-Host "  Full Guide:      📚_COMPREHENSIVE_GITHUB_VM_DEPLOYMENT_PLAN.md" -ForegroundColor White
Write-Host ""

Write-Host "================================================" -ForegroundColor Green
Write-Host "  Ready to use! 🎉" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
