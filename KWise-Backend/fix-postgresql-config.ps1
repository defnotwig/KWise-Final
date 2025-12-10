# ========================================
# PostgreSQL Configuration Fix & Start Script
# Automatically finds and fixes PostgreSQL issues
# ========================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PostgreSQL Configuration Fix & Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Find PostgreSQL installation
$pgPaths = @(
    "C:\Program Files\PostgreSQL\17",
    "C:\Program Files\PostgreSQL\16",
    "C:\Program Files\PostgreSQL\15"
)

$pgPath = $null
foreach ($path in $pgPaths) {
    if (Test-Path $path) {
        $pgPath = $path
        Write-Host "✅ Found PostgreSQL at: $pgPath" -ForegroundColor Green
        break
    }
}

if (-not $pgPath) {
    Write-Host "❌ PostgreSQL not found in standard locations" -ForegroundColor Red
    exit 1
}

$dataDir = Join-Path $pgPath "data"
$binDir = Join-Path $pgPath "bin"

# Check for configuration files
$configFiles = @(
    (Join-Path $dataDir "postgresql.conf"),
    (Join-Path $dataDir "postgresql-hyperv.conf"),
    (Join-Path $dataDir "postgresql.auto.conf")
)

Write-Host ""
Write-Host "🔍 Checking configuration files..." -ForegroundColor Yellow

foreach ($configFile in $configFiles) {
    if (Test-Path $configFile) {
        Write-Host "  Found: $configFile" -ForegroundColor Gray
        
        try {
            # Read the file
            $content = Get-Content $configFile -Raw
            $changed = $false
            
            # Fix shared_buffers if set too high
            if ($content -match "shared_buffers\s*=\s*2GB") {
                $content = $content -replace "shared_buffers\s*=\s*2GB", "shared_buffers = 256MB"
                Write-Host "    ✓ Fixed shared_buffers (2GB → 256MB)" -ForegroundColor Green
                $changed = $true
            }
            
            # Fix maintenance_work_mem
            if ($content -match "maintenance_work_mem\s*=\s*2097152") {
                $content = $content -replace "maintenance_work_mem\s*=\s*2097152", "maintenance_work_mem = 524288"
                Write-Host "    ✓ Fixed maintenance_work_mem (2GB → 512MB)" -ForegroundColor Green
                $changed = $true
            }
            
            # Fix effective_io_concurrency (must be 0 on Windows)
            if ($content -match "effective_io_concurrency\s*=\s*[1-9]\d*") {
                $content = $content -replace "effective_io_concurrency\s*=\s*\d+", "effective_io_concurrency = 0"
                Write-Host "    ✓ Fixed effective_io_concurrency (set to 0 for Windows)" -ForegroundColor Green
                $changed = $true
            }
            
            # Save changes if any
            if ($changed) {
                # Backup original
                $backupFile = "$configFile.backup"
                if (-not (Test-Path $backupFile)) {
                    Copy-Item $configFile $backupFile -Force
                    Write-Host "    ✓ Backup created" -ForegroundColor Green
                }
                
                # Write fixed content
                Set-Content -Path $configFile -Value $content -Force -ErrorAction SilentlyContinue
                if ($?) {
                    Write-Host "    ✓ Configuration updated" -ForegroundColor Green
                } else {
                    Write-Host "    ⚠️  Need admin rights to update config" -ForegroundColor Yellow
                }
            }
            
        } catch {
            Write-Host "    ⚠️  Could not process file (admin required)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting PostgreSQL Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Try to start using Windows Service first (most reliable)
$serviceName = "postgresql-x64-17"
$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

if ($service) {
    Write-Host "🔄 Attempting to start service: $serviceName" -ForegroundColor Yellow
    
    try {
        Start-Service -Name $serviceName -ErrorAction Stop
        Start-Sleep -Seconds 3
        
        $service = Get-Service -Name $serviceName
        if ($service.Status -eq "Running") {
            Write-Host "✅ Service started successfully!" -ForegroundColor Green
            Write-Host ""
            
            # Check port
            Write-Host "🔍 Checking port 5432..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
            $listening = netstat -an | Select-String ":5432"
            
            if ($listening) {
                Write-Host "✅ PostgreSQL is listening on port 5432" -ForegroundColor Green
                Write-Host ""
                Write-Host "========================================" -ForegroundColor Green
                Write-Host "SUCCESS! PostgreSQL is now running!" -ForegroundColor Green
                Write-Host "========================================" -ForegroundColor Green
                Write-Host ""
                Write-Host "🎯 Next steps:" -ForegroundColor Cyan
                Write-Host "   1. Go to VS Code terminal" -ForegroundColor White
                Write-Host "   2. Run: node diagnose-database-connection.js" -ForegroundColor White
                Write-Host "   3. Then: npm start" -ForegroundColor White
            } else {
                Write-Host "⚠️  Service running but port not ready yet, waiting..." -ForegroundColor Yellow
                Start-Sleep -Seconds 5
                $listening = netstat -an | Select-String ":5432"
                if ($listening) {
                    Write-Host "✅ PostgreSQL is now listening!" -ForegroundColor Green
                }
            }
        } else {
            Write-Host "⚠️  Service status: $($service.Status)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  Could not start service: $_" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "💡 Need Administrator rights. Try:" -ForegroundColor Yellow
        Write-Host "   1. Right-click PowerShell → Run as Administrator" -ForegroundColor White
        Write-Host "   2. Run this script again" -ForegroundColor White
        Write-Host ""
        Write-Host "   OR" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   1. Press Win+R" -ForegroundColor White
        Write-Host "   2. Type: services.msc" -ForegroundColor White
        Write-Host "   3. Find: $serviceName" -ForegroundColor White
        Write-Host "   4. Right-click → Start" -ForegroundColor White
        
        # Show log location
        $logDir = Join-Path $dataDir "log"
        if (Test-Path $logDir) {
            Write-Host ""
            Write-Host "📋 Check logs at:" -ForegroundColor Yellow
            Write-Host "   $logDir" -ForegroundColor Gray
            
            $latestLog = Get-ChildItem $logDir -Filter "*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
            if ($latestLog) {
                Write-Host ""
                Write-Host "Latest log file:" -ForegroundColor Yellow
                Write-Host "   $($latestLog.FullName)" -ForegroundColor Gray
                Write-Host ""
                Write-Host "Last 10 lines:" -ForegroundColor Yellow
                Get-Content $latestLog.FullName -Tail 10 | ForEach-Object {
                    Write-Host "   $_" -ForegroundColor Gray
                }
            }
        }
    }
} else {
    Write-Host "⚠️  Service not found, trying pg_ctl..." -ForegroundColor Yellow
    
    # Try pg_ctl as fallback
    $pgCtl = Join-Path $binDir "pg_ctl.exe"
    if (Test-Path $pgCtl) {
        try {
            & $pgCtl start -D $dataDir -w
            Write-Host "✅ PostgreSQL started using pg_ctl" -ForegroundColor Green
        } catch {
            Write-Host "❌ Failed to start using pg_ctl" -ForegroundColor Red
            Write-Host $_.Exception.Message
        }
    }
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
