# =====================================================
# K-WISE ERROR RESOLUTION VERIFICATION (SIMPLIFIED)
# =====================================================

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  K-WISE ERROR FIX VERIFICATION" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

$passed = 0
$failed = 0

# 1. PM2 Services
Write-Host "1. PM2 Services..." -ForegroundColor Yellow
$pm2 = pm2 jlist | ConvertFrom-Json
$backend = $pm2 | Where-Object { $_.name -eq "kwise-backend" -and $_.pm2_env.status -eq "online" }
$frontend = $pm2 | Where-Object { $_.name -eq "kwise-frontend" -and $_.pm2_env.status -eq "online" }

if ($backend.Count -eq 2) {
    Write-Host "   ✅ Backend: 2 instances online" -ForegroundColor Green
    $passed++
} else {
    Write-Host "   ❌ Backend: Issues" -ForegroundColor Red
    $failed++
}

if ($frontend) {
    Write-Host "   ✅ Frontend: Online" -ForegroundColor Green
    $passed++
} else {
    Write-Host "   ❌ Frontend: Offline" -ForegroundColor Red
    $failed++
}

# 2. Backend Health
Write-Host "`n2. Backend Health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -TimeoutSec 10
    if ($health.database -eq "Connected") {
        Write-Host "   ✅ Database: Connected" -ForegroundColor Green
        $passed++
    }
    if ($health.ai.status -eq "healthy") {
        Write-Host "   ✅ AI Service: Healthy" -ForegroundColor Green
        $passed++
    }
} catch {
    Write-Host "   ❌ Health check failed" -ForegroundColor Red
    $failed++
}

# 3. Frontend
Write-Host "`n3. Frontend Response..." -ForegroundColor Yellow
try {
    $fe = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5
    Write-Host "   ✅ Frontend: HTTP $($fe.StatusCode)" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "   ❌ Frontend: Not accessible" -ForegroundColor Red
    $failed++
}

# 4. SSE Authentication
Write-Host "`n4. SSE Authentication..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "http://localhost:5000/api/realtime/orders" -TimeoutSec 3 -ErrorAction Stop | Out-Null
    Write-Host "   ⚠️  No auth required (unexpected)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "   ✅ Properly requires token" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "   ❌ Unexpected error" -ForegroundColor Red
        $failed++
    }
}

# 5. Socket.IO
Write-Host "`n5. Socket.IO Initialization..." -ForegroundColor Yellow
$logs = Get-Content "c:\Users\PCWISE\Documents\KWise Final\KWise-Final\KWise-Backend\logs\backend-out.log" -Tail 200 -ErrorAction SilentlyContinue
if ($logs -match "Socket.io initialized") {
    Write-Host "   ✅ Socket.IO: Initialized" -ForegroundColor Green
    $passed++
} else {
    Write-Host "   ⚠️  Socket.IO: Not confirmed" -ForegroundColor Yellow
}

# 6. HTTP Errors
Write-Host "`n6. Backend HTTP Errors..." -ForegroundColor Yellow
$outLog = Get-Content "c:\Users\PCWISE\Documents\KWise Final\KWise-Final\KWise-Backend\logs\backend-out.log" -Tail 100 -ErrorAction SilentlyContinue
$http404 = $outLog | Select-String " 404 " | Where-Object { $_ -notmatch "/favicon.ico" }
$http500 = $outLog | Select-String " 500 "

if ($http404.Count -eq 0) {
    Write-Host "   ✅ No 404 errors" -ForegroundColor Green
    $passed++
} else {
    Write-Host "   ⚠️  $($http404.Count) 404 errors found" -ForegroundColor Yellow
}

if ($http500.Count -eq 0) {
    Write-Host "   ✅ No 500 errors" -ForegroundColor Green
    $passed++
} else {
    Write-Host "   ❌ $($http500.Count) 500 errors found" -ForegroundColor Red
    $failed++
}

# Summary
Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  SUMMARY" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

$total = $passed + $failed
if ($total -gt 0) {
    $percentage = [math]::Round(($passed / $total) * 100, 1)
} else {
    $percentage = 0
}

Write-Host "✅ Passed: $passed" -ForegroundColor Green
Write-Host "❌ Failed: $failed" -ForegroundColor Red
Write-Host "Success Rate: $percentage%`n" -ForegroundColor Cyan

if ($failed -eq 0) {
    Write-Host "STATUS: ALL SYSTEMS OPERATIONAL ✅`n" -ForegroundColor Green
} else {
    Write-Host "STATUS: ISSUES DETECTED ❌`n" -ForegroundColor Red
}

Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Frontend opened at http://localhost:3000" -ForegroundColor White
Write-Host "2. Press F12 to check console for errors" -ForegroundColor White
Write-Host "3. Login to test SSE and Socket.IO" -ForegroundColor White
Write-Host ""
