# K-Wise Backend Stop Script
# This script stops all Node processes related to K-Wise backend

Write-Host "🛑 K-Wise Backend Stop Script" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan

# Stop all Node processes
Write-Host "`nStopping all Node processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-Host "   Found $($nodeProcesses.Count) Node process(es)" -ForegroundColor Yellow
    
    $stopped = 0
    $failed = 0
    
    foreach ($process in $nodeProcesses) {
        try {
            Stop-Process -Id $process.Id -Force -ErrorAction Stop
            Write-Host "   ✅ Stopped process ID: $($process.Id)" -ForegroundColor Green
            $stopped++
        } catch {
            Write-Host "   ⚠️  Could not stop process ID: $($process.Id) - $($_.Exception.Message)" -ForegroundColor Red
            $failed++
        }
    }
    
    Write-Host "`n   Summary: $stopped stopped, $failed failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
    
    if ($failed -gt 0) {
        Write-Host "`n   ⚠️  Some processes could not be stopped." -ForegroundColor Yellow
        Write-Host "      These may require administrator privileges to stop." -ForegroundColor Gray
        Write-Host "      Try running this script as Administrator." -ForegroundColor Gray
    }
} else {
    Write-Host "   ✅ No Node processes found" -ForegroundColor Green
}

# Check ports
Write-Host "`nChecking ports..." -ForegroundColor Yellow
$port5000 = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }

if ($port5000) {
    Write-Host "   ⚠️  Port 5000 is still in use" -ForegroundColor Red
} else {
    Write-Host "   ✅ Port 5000 is free" -ForegroundColor Green
}

if ($port3000) {
    Write-Host "   ⚠️  Port 3000 is still in use" -ForegroundColor Red
} else {
    Write-Host "   ✅ Port 3000 is free" -ForegroundColor Green
}

Write-Host "`n✅ Stop script completed!" -ForegroundColor Green

