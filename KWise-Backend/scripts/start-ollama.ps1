# =====================================================
# Ollama Auto-Start Script for K-Wise Backend
# =====================================================
# This script automatically starts Ollama service when
# running npm run dev in KWise-Backend
# =====================================================

Write-Host "🤖 K-Wise Ollama Auto-Start Script" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Check if Ollama is installed
$ollamaPath = $null
$possiblePaths = @(
    "C:\Program Files\Ollama\ollama.exe",
    "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe",
    "$env:USERPROFILE\AppData\Local\Programs\Ollama\ollama.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $ollamaPath = $path
        break
    }
}

if (-not $ollamaPath) {
    Write-Host "❌ Ollama is NOT installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "📥 To install Ollama:" -ForegroundColor Yellow
    Write-Host "   1. Download from: https://ollama.com/download/windows" -ForegroundColor White
    Write-Host "   2. Install the application" -ForegroundColor White
    Write-Host "   3. Open PowerShell and run: ollama pull deepseek-r1:1.5b" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️ AI features will be DISABLED until Ollama is installed" -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

Write-Host "✅ Ollama found at: $ollamaPath" -ForegroundColor Green

# Check if Ollama is already running
$ollamaProcess = Get-Process -Name "ollama*" -ErrorAction SilentlyContinue

if ($ollamaProcess) {
    Write-Host "✅ Ollama is already running (PID: $($ollamaProcess.Id))" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "🚀 Starting Ollama service..." -ForegroundColor Yellow
    
    try {
        # Start Ollama in background
        Start-Process -FilePath $ollamaPath -ArgumentList "serve" -WindowStyle Hidden
        
        # Wait for service to start
        Start-Sleep -Seconds 3
        
        # Verify service started
        $ollamaProcess = Get-Process -Name "ollama*" -ErrorAction SilentlyContinue
        
        if ($ollamaProcess) {
            Write-Host "✅ Ollama service started successfully (PID: $($ollamaProcess.Id))" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Ollama may not have started properly" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Failed to start Ollama: $_" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
}

# Test Ollama connection
Write-Host "🔍 Testing Ollama connection..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 5
    
    if ($response) {
        Write-Host "✅ Ollama API is responsive" -ForegroundColor Green
        
        # Check if deepseek-r1:1.5b model is available
        $hasModel = $false
        if ($response.models) {
            foreach ($model in $response.models) {
                if ($model.name -like "*deepseek-r1*1.5b*") {
                    $hasModel = $true
                    Write-Host "✅ DeepSeek R1 1.5B model is installed" -ForegroundColor Green
                    break
                }
            }
        }
        
        if (-not $hasModel) {
            Write-Host "⚠️ DeepSeek R1 1.5B model NOT found" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "📥 To download the model, run:" -ForegroundColor Yellow
            Write-Host "   ollama pull deepseek-r1:1.5b" -ForegroundColor White
            Write-Host ""
            Write-Host "   This will download ~900MB. It may take a few minutes." -ForegroundColor Gray
            Write-Host ""
            
            # Ask user if they want to download now
            $download = Read-Host "Download DeepSeek R1 1.5B model now? (y/n)"
            if ($download -eq "y" -or $download -eq "Y") {
                Write-Host ""
                Write-Host "📥 Downloading DeepSeek R1 1.5B model..." -ForegroundColor Cyan
                Write-Host "   Please wait, this may take several minutes..." -ForegroundColor Gray
                Write-Host ""
                
                & ollama pull deepseek-r1:1.5b
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host ""
                    Write-Host "✅ Model downloaded successfully!" -ForegroundColor Green
                } else {
                    Write-Host ""
                    Write-Host "❌ Model download failed" -ForegroundColor Red
                }
            }
        }
    }
} catch {
    Write-Host "❌ Ollama API is not responding" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Try:" -ForegroundColor Yellow
    Write-Host "   1. Restart this script" -ForegroundColor White
    Write-Host "   2. Manually run: ollama serve" -ForegroundColor White
    Write-Host "   3. Check if port 11434 is available" -ForegroundColor White
}

Write-Host ""
Write-Host "🎯 Ollama startup check complete!" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
