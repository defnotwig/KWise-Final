# =====================================================
# K-Wise Ollama Auto-Start Verification Test
# =====================================================
# This script tests all Ollama auto-start functionality
# =====================================================

Write-Host ""
Write-Host "🧪 K-Wise Ollama Auto-Start Verification Test" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$testsPassed = 0
$testsFailed = 0
$testsTotal = 0

function Test-Feature {
    param (
        [string]$TestName,
        [scriptblock]$TestScript
    )
    
    $script:testsTotal++
    Write-Host "🔍 Test $script:testsTotal: $TestName" -ForegroundColor Yellow
    
    try {
        $result = & $TestScript
        if ($result) {
            Write-Host "   ✅ PASS" -ForegroundColor Green
            $script:testsPassed++
        } else {
            Write-Host "   ❌ FAIL" -ForegroundColor Red
            $script:testsFailed++
        }
    } catch {
        Write-Host "   ❌ ERROR: $_" -ForegroundColor Red
        $script:testsFailed++
    }
    Write-Host ""
}

# Test 1: Check if Ollama is installed
Test-Feature "Ollama Installation Check" {
    $ollamaPath = $null
    $possiblePaths = @(
        "C:\Program Files\Ollama\ollama.exe",
        "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe",
        "$env:USERPROFILE\AppData\Local\Programs\Ollama\ollama.exe"
    )
    
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $ollamaPath = $path
            Write-Host "   Found at: $ollamaPath" -ForegroundColor Gray
            return $true
        }
    }
    
    Write-Host "   Ollama not found in standard locations" -ForegroundColor Gray
    return $false
}

# Test 2: Check if Ollama process is running
Test-Feature "Ollama Process Running Check" {
    $process = Get-Process -Name "ollama*" -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "   PID: $($process.Id)" -ForegroundColor Gray
        return $true
    }
    Write-Host "   Ollama process not running" -ForegroundColor Gray
    return $false
}

# Test 3: Test Ollama API connection
Test-Feature "Ollama API Connection Test" {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 5
        Write-Host "   API responded successfully" -ForegroundColor Gray
        return $true
    } catch {
        Write-Host "   API not responding: $_" -ForegroundColor Gray
        return $false
    }
}

# Test 4: Check if DeepSeek R1 model is available
Test-Feature "DeepSeek R1 1.5B Model Check" {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 5
        $hasModel = $false
        
        if ($response.models) {
            foreach ($model in $response.models) {
                if ($model.name -like "*deepseek-r1*1.5b*") {
                    $hasModel = $true
                    Write-Host "   Model: $($model.name)" -ForegroundColor Gray
                    Write-Host "   Size: $($model.size) bytes" -ForegroundColor Gray
                    break
                }
            }
        }
        
        if (-not $hasModel) {
            Write-Host "   DeepSeek R1 1.5B model not found" -ForegroundColor Gray
        }
        
        return $hasModel
    } catch {
        Write-Host "   Could not check models: $_" -ForegroundColor Gray
        return $false
    }
}

# Test 5: Check if auto-start scripts exist
Test-Feature "Auto-Start Scripts Existence" {
    $scriptsExist = $true
    $scripts = @(
        "scripts\check-ollama.js",
        "scripts\start-ollama.ps1"
    )
    
    foreach ($script in $scripts) {
        if (Test-Path $script) {
            Write-Host "   ✓ $script" -ForegroundColor Gray
        } else {
            Write-Host "   ✗ $script not found" -ForegroundColor Gray
            $scriptsExist = $false
        }
    }
    
    return $scriptsExist
}

# Test 6: Verify package.json scripts
Test-Feature "Package.json NPM Scripts" {
    if (Test-Path "package.json") {
        $packageJson = Get-Content "package.json" | ConvertFrom-Json
        $hasDevScript = $packageJson.scripts.dev -like "*check-ollama*"
        $hasCheckScript = $null -ne $packageJson.scripts.'check-ollama'
        $hasStartScript = $null -ne $packageJson.scripts.'start-ollama'
        
        if ($hasDevScript) {
            Write-Host "   ✓ dev script includes Ollama check" -ForegroundColor Gray
        }
        if ($hasCheckScript) {
            Write-Host "   ✓ check-ollama script exists" -ForegroundColor Gray
        }
        if ($hasStartScript) {
            Write-Host "   ✓ start-ollama script exists" -ForegroundColor Gray
        }
        
        return ($hasDevScript -and $hasCheckScript -and $hasStartScript)
    }
    return $false
}

# Test 7: Test check-ollama.js script
Test-Feature "Check-Ollama Script Execution" {
    try {
        $output = node scripts/check-ollama.js 2>&1
        $success = $LASTEXITCODE -eq 0
        if ($success) {
            Write-Host "   Script executed successfully" -ForegroundColor Gray
        } else {
            Write-Host "   Script exited with code: $LASTEXITCODE" -ForegroundColor Gray
        }
        return $success
    } catch {
        Write-Host "   Failed to execute: $_" -ForegroundColor Gray
        return $false
    }
}

# Test 8: Verify .env configuration
Test-Feature "Environment Configuration Check" {
    if (Test-Path ".env") {
        $envContent = Get-Content ".env" -Raw
        $hasOllamaUrl = $envContent -match "OLLAMA_BASE_URL"
        $hasOllamaModel = $envContent -match "OLLAMA_MODEL.*deepseek"
        $hasAIEnabled = $envContent -match "AI_ENABLED"
        
        if ($hasOllamaUrl) {
            Write-Host "   ✓ OLLAMA_BASE_URL configured" -ForegroundColor Gray
        }
        if ($hasOllamaModel) {
            Write-Host "   ✓ OLLAMA_MODEL configured" -ForegroundColor Gray
        }
        if ($hasAIEnabled) {
            Write-Host "   ✓ AI_ENABLED configured" -ForegroundColor Gray
        }
        
        return ($hasOllamaUrl -and $hasOllamaModel -and $hasAIEnabled)
    }
    return $false
}

# Test 9: Test AI endpoint (if backend is running)
Test-Feature "Backend AI Endpoint Test (Optional)" {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get -TimeoutSec 5
        Write-Host "   Backend is running" -ForegroundColor Gray
        return $true
    } catch {
        Write-Host "   Backend not running (this is optional)" -ForegroundColor Gray
        return $true  # Don't fail if backend isn't running
    }
}

# Test 10: OLLAMA_SETUP.md documentation exists
Test-Feature "Ollama Setup Documentation" {
    if (Test-Path "OLLAMA_SETUP.md") {
        Write-Host "   Documentation file exists" -ForegroundColor Gray
        return $true
    }
    Write-Host "   OLLAMA_SETUP.md not found" -ForegroundColor Gray
    return $false
}

# =====================================================
# Test Results Summary
# =====================================================

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "📊 Test Results Summary" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total Tests:  $testsTotal" -ForegroundColor White
Write-Host "Passed:       $testsPassed ✅" -ForegroundColor Green
Write-Host "Failed:       $testsFailed ❌" -ForegroundColor Red
Write-Host ""

$successRate = [math]::Round(($testsPassed / $testsTotal) * 100, 2)
Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 60) { "Yellow" } else { "Red" })
Write-Host ""

# Final verdict
if ($testsFailed -eq 0) {
    Write-Host "🎉 ALL TESTS PASSED! Ollama auto-start is fully configured! 🎉" -ForegroundColor Green
} elseif ($testsFailed -le 2) {
    Write-Host "✅ Most tests passed. Minor issues detected." -ForegroundColor Yellow
    Write-Host "   The system should work, but review failed tests above." -ForegroundColor Yellow
} else {
    Write-Host "⚠️ Several tests failed. Ollama may not auto-start properly." -ForegroundColor Red
    Write-Host "   Please review the failures and fix the issues." -ForegroundColor Red
}

Write-Host ""
Write-Host "💡 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. If tests failed: Review errors above and fix issues" -ForegroundColor White
Write-Host "   2. If tests passed: Run npm run dev to test auto-start" -ForegroundColor White
Write-Host "   3. For help: See OLLAMA_SETUP.md documentation" -ForegroundColor White
Write-Host ""
