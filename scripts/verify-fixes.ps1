# =====================================================
# VERIFY ALL ERROR FIXES
# =====================================================
# Purpose: Comprehensive verification of all error fixes
# Date: December 10, 2025
# =====================================================

Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     K-WISE ERROR RESOLUTION VERIFICATION                     ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$errors = @()
$warnings = @()
$passed = @()

# =====================================================
# 1. CHECK PM2 SERVICE STATUS
# =====================================================
Write-Host "1. Checking PM2 Service Status..." -ForegroundColor Yellow
try {
    $pm2Status = pm2 jlist | ConvertFrom-Json
    $backendInstances = $pm2Status | Where-Object { $_.name -eq "kwise-backend" }
    $frontendInstance = $pm2Status | Where-Object { $_.name -eq "kwise-frontend" }
    
    if ($backendInstances.Count -eq 2 -and $backendInstances[0].pm2_env.status -eq "online" -and $backendInstances[1].pm2_env.status -eq "online") {
        Write-Host "   ✅ Backend: 2 instances online" -ForegroundColor Green
        $passed += "PM2 Backend Services"
    } else {
        $errors += "Backend instances not running properly"
        Write-Host "   ❌ Backend: Issues detected" -ForegroundColor Red
    }
    
    if ($frontendInstance -and $frontendInstance.pm2_env.status -eq "online") {
        Write-Host "   ✅ Frontend: Online" -ForegroundColor Green
        $passed += "PM2 Frontend Service"
    } else {
        $errors += "Frontend not running"
        Write-Host "   ❌ Frontend: Not online" -ForegroundColor Red
    }
} catch {
    $errors += "PM2 status check failed: $($_.Exception.Message)"
    Write-Host "   ❌ PM2 Check Failed" -ForegroundColor Red
}

Write-Host ""

# =====================================================
# 2. CHECK BACKEND HEALTH
# =====================================================
Write-Host "2. Checking Backend Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -TimeoutSec 10
    
    if ($health.database -eq "Connected") {
        Write-Host "   ✅ Database: Connected" -ForegroundColor Green
        $passed += "Database Connection"
    } else {
        $errors += "Database not connected"
        Write-Host "   ❌ Database: $($health.database)" -ForegroundColor Red
    }
    
    if ($health.ai.status -eq "healthy") {
        Write-Host "   ✅ AI Service: Healthy" -ForegroundColor Green
        $passed += "AI Service"
    } else {
        $warnings += "AI service status: $($health.ai.status)"
        Write-Host "   ⚠️  AI Service: $($health.ai.status)" -ForegroundColor Yellow
    }
} catch {
    $errors += "Backend health check failed: $($_.Exception.Message)"
    Write-Host "   ❌ Health Check Failed" -ForegroundColor Red
}

Write-Host ""

# =====================================================
# 3. CHECK FRONTEND AVAILABILITY
# =====================================================
Write-Host "3. Checking Frontend Availability..." -ForegroundColor Yellow
try {
    $fe = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5
    if ($fe.StatusCode -eq 200) {
        Write-Host "   ✅ Frontend: Responding 200" -ForegroundColor Green
        $passed += "Frontend HTTP Response"
    } else {
        $warnings += "Frontend returned status $($fe.StatusCode)"
        Write-Host "   ⚠️  Frontend: Status $($fe.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    $errors += "Frontend not accessible: $($_.Exception.Message)"
    Write-Host "   ❌ Frontend: Not Accessible" -ForegroundColor Red
}

Write-Host ""

# =====================================================
# 4. CHECK SSE AUTHENTICATION (REQUIRES LOGIN)
# =====================================================
Write-Host "4. Checking SSE Endpoint Authentication..." -ForegroundColor Yellow
try {
    # Try without token - should get 401
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/realtime/orders" -TimeoutSec 3 -ErrorAction Stop
    $warnings += "SSE endpoint accessible without token (security concern)"
    Write-Host "   ⚠️  SSE Endpoint: No auth required (unexpected)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "   ✅ SSE Authentication: Properly requires token" -ForegroundColor Green
        $passed += "SSE Authentication Enforcement"
    } else {
        $errors += "SSE endpoint error: $($_.Exception.Message)"
        Write-Host "   ❌ SSE Endpoint Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# =====================================================
# 5. CHECK SOCKET.IO AVAILABILITY
# =====================================================
Write-Host "5. Checking Socket.IO Initialization..." -ForegroundColor Yellow
try {
    $logs = Get-Content "c:\Users\PCWISE\Documents\KWise Final\KWise-Final\KWise-Backend\logs\backend-out.log" -Tail 200
    $socketInitialized = $logs | Select-String "Socket.io initialized" | Select-Object -Last 1
    
    if ($socketInitialized) {
        Write-Host "   ✅ Socket.IO: Initialized" -ForegroundColor Green
        $passed += "Socket.IO Initialization"
    } else {
        $warnings += "Socket.IO initialization not found in recent logs"
        Write-Host "   ⚠️  Socket.IO: Initialization unclear" -ForegroundColor Yellow
    }
} catch {
    $warnings += "Could not verify Socket.IO: $($_.Exception.Message)"
    Write-Host "   ⚠️  Socket.IO: Verification failed" -ForegroundColor Yellow
}

Write-Host ""

# =====================================================
# 6. CHECK FOR HTTP ERRORS IN BACKEND LOGS
# =====================================================
Write-Host "6. Scanning Backend Logs for HTTP Errors..." -ForegroundColor Yellow
try {
    $errorLog = Get-Content "c:\Users\PCWISE\Documents\KWise Final\KWise-Final\KWise-Backend\logs\backend-error.log" -Tail 50 -ErrorAction SilentlyContinue
    $outLog = Get-Content "c:\Users\PCWISE\Documents\KWise Final\KWise-Final\KWise-Backend\logs\backend-out.log" -Tail 100 -ErrorAction SilentlyContinue
    
    $http404 = $outLog | Select-String " 404 " | Where-Object { $_ -notmatch "/favicon.ico" -and $_ -notmatch "/api/services" }
    $http500 = $outLog | Select-String " 500 "
    $httpErrors = $errorLog | Select-String "Error|ERROR|Failed" | Select-Object -Last 5
    
    if ($http404.Count -gt 0) {
        $warnings += "Found $($http404.Count) 404 errors in backend logs"
        Write-Host "   ⚠️  HTTP 404: $($http404.Count) instances found" -ForegroundColor Yellow
        $http404 | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
    } else {
        Write-Host "   ✅ HTTP 404: None found" -ForegroundColor Green
        $passed += "No 404 Errors"
    }
    
    if ($http500.Count -gt 0) {
        $errors += "Found $($http500.Count) 500 errors in backend logs"
        Write-Host "   ❌ HTTP 500: $($http500.Count) instances found" -ForegroundColor Red
        $http500 | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
    } else {
        Write-Host "   ✅ HTTP 500: None found" -ForegroundColor Green
        $passed += "No 500 Errors"
    }
    
    if ($httpErrors.Count -gt 0) {
        Write-Host "   ⚠️  Recent Errors: $($httpErrors.Count) found" -ForegroundColor Yellow
        $httpErrors | ForEach-Object { 
            $warnings += "Backend error: $_"
            Write-Host "      $_" -ForegroundColor Gray 
        }
    } else {
        Write-Host "   ✅ Error Log: Clean" -ForegroundColor Green
        $passed += "Clean Error Logs"
    }
} catch {
    $warnings += "Could not scan backend logs: $($_.Exception.Message)"
    Write-Host "   ⚠️  Log Scan: Failed" -ForegroundColor Yellow
}

Write-Host ""

# =====================================================
# 7. CHECK OLLAMA AI SERVICE
# =====================================================
Write-Host "7. Checking Ollama AI Service..." -ForegroundColor Yellow
try {
    $ollama = Invoke-WebRequest -Uri "http://localhost:11434" -TimeoutSec 5
    if ($ollama.StatusCode -eq 200) {
        Write-Host "   ✅ Ollama: Responding" -ForegroundColor Green
        $passed += "Ollama AI Service"
    } else {
        $warnings += "Ollama returned status $($ollama.StatusCode)"
        Write-Host "   ⚠️  Ollama: Status $($ollama.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    $warnings += "Ollama not accessible: $($_.Exception.Message)"
    Write-Host "   ⚠️  Ollama: Not Accessible" -ForegroundColor Yellow
}

Write-Host ""

# =====================================================
# SUMMARY REPORT
# =====================================================
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    VERIFICATION SUMMARY                      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "✅ PASSED CHECKS: $($passed.Count)" -ForegroundColor Green
$passed | ForEach-Object { Write-Host "   • $_" -ForegroundColor Green }
Write-Host ""

if ($warnings.Count -gt 0) {
    Write-Host "⚠️  WARNINGS: $($warnings.Count)" -ForegroundColor Yellow
    $warnings | ForEach-Object { Write-Host "   • $_" -ForegroundColor Yellow }
    Write-Host ""
}

if ($errors.Count -gt 0) {
    Write-Host "❌ ERRORS: $($errors.Count)" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "   • $_" -ForegroundColor Red }
    Write-Host ""
}

# Final Status
$totalChecks = $passed.Count + $warnings.Count + $errors.Count
$successRate = [math]::Round(($passed.Count / $totalChecks) * 100, 2)

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "OVERALL STATUS: " -NoNewline -ForegroundColor White

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "ALL SYSTEMS OPERATIONAL ✅" -ForegroundColor Green
    Write-Host "Success Rate: 100%" -ForegroundColor Green
} elseif ($errors.Count -eq 0) {
    Write-Host "OPERATIONAL WITH WARNINGS ⚠️" -ForegroundColor Yellow
    Write-Host "Success Rate: $successRate%" -ForegroundColor Yellow
} else {
    Write-Host "ISSUES DETECTED ❌" -ForegroundColor Red
    Write-Host "Success Rate: $successRate%" -ForegroundColor Red
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Open http://localhost:3000 in browser" -ForegroundColor White
Write-Host "2. Press F12 to open Developer Console" -ForegroundColor White
Write-Host "3. Check for console errors (should see minimal or no errors)" -ForegroundColor White
Write-Host "4. Login to test SSE real-time features" -ForegroundColor White
Write-Host "5. Verify Socket.IO authentication messages are clearer" -ForegroundColor White
Write-Host ""
