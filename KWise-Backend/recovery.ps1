# K-Wise System Recovery Script
# This script will forcefully kill Node processes and start fresh

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "K-WISE SYSTEM RECOVERY SCRIPT" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Function to check if running as administrator
function Test-Administrator {
    $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentUser.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Check for admin rights
if (-not (Test-Administrator)) {
    Write-Host "⚠️  WARNING: Not running as Administrator" -ForegroundColor Yellow
    Write-Host "Some Node processes may be protected and cannot be killed without admin rights.`n" -ForegroundColor Yellow
    Write-Host "To run as Administrator:" -ForegroundColor Yellow
    Write-Host "  1. Right-click PowerShell" -ForegroundColor Yellow
    Write-Host "  2. Select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host "  3. Run this script again`n" -ForegroundColor Yellow
    
    $response = Read-Host "Continue anyway? (y/N)"
    if ($response -ne 'y' -and $response -ne 'Y') {
        Write-Host "`nExiting..." -ForegroundColor Red
        exit 1
    }
}

Write-Host "[1/5] Searching for Node.js processes..." -ForegroundColor Cyan
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-Host "Found $($nodeProcesses.Count) Node.js process(es):" -ForegroundColor Yellow
    foreach ($proc in $nodeProcesses) {
        Write-Host "  - PID: $($proc.Id) | Memory: $([math]::Round($proc.WorkingSet64 / 1MB, 2)) MB" -ForegroundColor Yellow
    }
    
    Write-Host "`n[2/5] Attempting to stop Node.js processes..." -ForegroundColor Cyan
    
    foreach ($proc in $nodeProcesses) {
        try {
            Stop-Process -Id $proc.Id -Force -ErrorAction Stop
            Write-Host "  ✅ Killed PID $($proc.Id)" -ForegroundColor Green
        } catch {
            Write-Host "  ❌ Failed to kill PID $($proc.Id): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Write-Host "`n[3/5] Waiting for ports to be released..." -ForegroundColor Cyan
    Start-Sleep -Seconds 3
    
    # Verify processes are gone
    $remainingProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($remainingProcesses) {
        Write-Host "⚠️  Warning: $($remainingProcesses.Count) Node.js process(es) still running:" -ForegroundColor Yellow
        foreach ($proc in $remainingProcesses) {
            Write-Host "  - PID: $($proc.Id)" -ForegroundColor Yellow
        }
        Write-Host "`nYou may need to:" -ForegroundColor Yellow
        Write-Host "  1. Open Task Manager (Ctrl+Shift+Esc)" -ForegroundColor Yellow
        Write-Host "  2. Go to Details tab" -ForegroundColor Yellow
        Write-Host "  3. Manually end Node.js processes`n" -ForegroundColor Yellow
        
        $response = Read-Host "Continue starting server anyway? (y/N)"
        if ($response -ne 'y' -and $response -ne 'Y') {
            Write-Host "`nExiting..." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "✅ All Node.js processes terminated successfully" -ForegroundColor Green
    }
} else {
    Write-Host "✅ No Node.js processes running" -ForegroundColor Green
    Write-Host "`n[2/5] Skipping process termination..." -ForegroundColor Cyan
    Write-Host "[3/5] Skipping port release wait..." -ForegroundColor Cyan
}

# Check if port 5000 is in use
Write-Host "`n[4/5] Checking port 5000 availability..." -ForegroundColor Cyan
$portInUse = netstat -ano | Select-String ":5000" | Select-String "LISTENING"

if ($portInUse) {
    Write-Host "⚠️  Port 5000 is still in use:" -ForegroundColor Yellow
    Write-Host "$portInUse" -ForegroundColor Yellow
    
    # Extract PID from netstat output
    $pidMatch = $portInUse -match "\s+(\d+)$"
    if ($pidMatch) {
        $pid = $matches[1]
        Write-Host "`nAttempting to kill process using port 5000 (PID: $pid)..." -ForegroundColor Yellow
        try {
            Stop-Process -Id $pid -Force -ErrorAction Stop
            Write-Host "✅ Killed process $pid" -ForegroundColor Green
            Start-Sleep -Seconds 2
        } catch {
            Write-Host "❌ Failed to kill process $pid" -ForegroundColor Red
        }
    }
} else {
    Write-Host "✅ Port 5000 is available" -ForegroundColor Green
}

# Start the backend server
Write-Host "`n[5/5] Starting K-Wise Backend Server..." -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if server.js exists
if (Test-Path ".\server.js") {
    Write-Host "🚀 Starting server... (Press Ctrl+C to stop)`n" -ForegroundColor Green
    node server.js
} else {
    Write-Host "❌ Error: server.js not found in current directory" -ForegroundColor Red
    Write-Host "Make sure you're running this script from the KWise-Backend folder`n" -ForegroundColor Red
    exit 1
}
