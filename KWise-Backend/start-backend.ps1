# K-Wise Backend Startup Script
# This script ensures a clean start by stopping any existing Node processes
# and starting the backend server properly

Write-Host "🔄 K-Wise Backend Startup Script" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan

# Step 1: Stop any existing Node processes
Write-Host "`n🛑 Stopping existing Node processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-Host "   Found $($nodeProcesses.Count) Node process(es)" -ForegroundColor Yellow
    
    foreach ($process in $nodeProcesses) {
        try {
            Stop-Process -Id $process.Id -Force -ErrorAction Stop
            Write-Host "   ✅ Stopped process ID: $($process.Id)" -ForegroundColor Green
        } catch {
            Write-Host "   ⚠️  Could not stop process ID: $($process.Id) - $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "      (This process may require administrator privileges)" -ForegroundColor Gray
        }
    }
    
    # Wait for processes to fully terminate
    Start-Sleep -Seconds 2
} else {
    Write-Host "   ✅ No Node processes found" -ForegroundColor Green
}

# Step 2: Check if ports are available
Write-Host "`n🔍 Checking port availability..." -ForegroundColor Yellow

$port5000InUse = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
$port3000InUse = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }

if ($port5000InUse) {
    Write-Host "   ⚠️  Port 5000 is still in use!" -ForegroundColor Red
    Write-Host "      You may need to manually stop the process using this port" -ForegroundColor Gray
} else {
    Write-Host "   ✅ Port 5000 is available" -ForegroundColor Green
}

if ($port3000InUse) {
    Write-Host "   ⚠️  Port 3000 is still in use!" -ForegroundColor Red
    Write-Host "      You may need to manually stop the process using this port" -ForegroundColor Gray
} else {
    Write-Host "   ✅ Port 3000 is available" -ForegroundColor Green
}

# Step 3: Navigate to backend directory
Write-Host "`n📂 Changing to backend directory..." -ForegroundColor Yellow
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath
Write-Host "   Current directory: $(Get-Location)" -ForegroundColor Green

# Step 4: Check if .env file exists
Write-Host "`n🔐 Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "   ✅ .env file found" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  .env file not found!" -ForegroundColor Red
    Write-Host "      Please create a .env file with required configuration" -ForegroundColor Gray
}

# Step 5: Check if node_modules exists
Write-Host "`n📦 Checking dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   ✅ node_modules found" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  node_modules not found!" -ForegroundColor Red
    Write-Host "      Run: npm install" -ForegroundColor Gray
    $install = Read-Host "      Would you like to install dependencies now? (Y/N)"
    if ($install -eq "Y" -or $install -eq "y") {
        Write-Host "      Installing dependencies..." -ForegroundColor Yellow
        npm install
    }
}

# Step 6: Start the backend server
Write-Host "`n🚀 Starting K-Wise Backend Server..." -ForegroundColor Cyan
Write-Host "   Using: server.js" -ForegroundColor Gray
Write-Host "   Port: 5000" -ForegroundColor Gray
Write-Host "`n" -ForegroundColor Gray

try {
    # Start server in the current PowerShell window
    node server.js
} catch {
    Write-Host "`n❌ Error starting server: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nPress any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

