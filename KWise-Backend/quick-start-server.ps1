# ========================================
# K-WISE BACKEND SERVER - QUICK START
# ========================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "K-WISE BACKEND SERVER - QUICK START" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Starting server in 3 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "🚀 Starting K-Wise Backend Server..." -ForegroundColor Green
Write-Host ""

Write-Host "If the server crashes or gets corrupted:" -ForegroundColor Yellow
Write-Host "1. Copy server-reference-backup.js to working-server.js" -ForegroundColor White
Write-Host "2. Run this script again" -ForegroundColor White
Write-Host ""

Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    node working-server.js
} catch {
    Write-Host "❌ Server failed to start. Check the error above." -ForegroundColor Red
    Write-Host "💡 Try copying server-reference-backup.js to working-server.js" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
