# ================================================================
# POSTGRESQL DATABASE SETUP WITH PASSWORD RESET OPTION
# ================================================================

$ErrorActionPreference = "Continue"

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "  K-WISE DATABASE SETUP - INTERACTIVE" -ForegroundColor Cyan
Write-Host "================================================================`n" -ForegroundColor Cyan

$repoRoot = "c:\Users\PCWISE\Documents\KWise Final\KWise-Final"
$backupFile = Join-Path $repoRoot "KWise-Backend\KWiseDB_full_backup_2025-12-10.sql"
$envFile = Join-Path $repoRoot "KWise-Backend\.env"

# Add PostgreSQL to PATH
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"

# Check if backup file exists
if (-not (Test-Path $backupFile)) {
    Write-Host "❌ Backup file not found: $backupFile" -ForegroundColor Red
    exit 1
}

$backupSizeMB = [math]::Round((Get-Item $backupFile).Length / 1MB, 2)
Write-Host "✅ Found backup file: $backupSizeMB MB`n" -ForegroundColor Green

# ================================================================
# STEP 1: PASSWORD CONFIGURATION
# ================================================================

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  STEP 1: PostgreSQL Password" -ForegroundColor Cyan
Write-Host "===============================================`n" -ForegroundColor Cyan

Write-Host "Options:" -ForegroundColor Yellow
Write-Host "  1. Enter existing PostgreSQL password" -ForegroundColor White
Write-Host "  2. Reset PostgreSQL password (requires pg_hba.conf modification)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Select option (1 or 2)"

if ($choice -eq "2") {
    Write-Host "`n⚠️  PASSWORD RESET MODE" -ForegroundColor Yellow
    Write-Host "This will temporarily allow passwordless connection to reset the password.`n" -ForegroundColor Gray
    
    # Backup pg_hba.conf
    $pgDataPath = "C:\Program Files\PostgreSQL\18\data"
    $hbaPath = Join-Path $pgDataPath "pg_hba.conf"
    $hbaBackup = Join-Path $pgDataPath "pg_hba.conf.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    
    Write-Host "Creating backup: $hbaBackup" -ForegroundColor Gray
    Copy-Item $hbaPath $hbaBackup -Force
    
    # Temporarily change authentication to trust
    Write-Host "Modifying pg_hba.conf to allow trust authentication..." -ForegroundColor Gray
    $hbaContent = Get-Content $hbaPath
    $hbaContent = $hbaContent -replace 'scram-sha-256', 'trust'
    Set-Content -Path $hbaPath -Value $hbaContent
    
    # Reload PostgreSQL configuration
    Write-Host "Reloading PostgreSQL configuration..." -ForegroundColor Gray
    $pgCtl = "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe"
    if (Test-Path $pgCtl) {
        & $pgCtl reload -D $pgDataPath 2>&1 | Out-Null
    } else {
        Restart-Service -Name "postgresql-x64-18" -Force
    }
    
    Start-Sleep -Seconds 3
    
    # Set new password
    $newPassword = Read-Host "Enter new PostgreSQL password" -AsSecureString
    $newPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($newPassword)
    )
    
    Write-Host "Setting new password..." -ForegroundColor Gray
    $resetSQL = "ALTER USER postgres WITH PASSWORD '$newPasswordPlain';"
    $resetSQL | psql -U postgres -h localhost 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Password reset successful!" -ForegroundColor Green
    } else {
        Write-Host "❌ Password reset failed!" -ForegroundColor Red
        # Restore pg_hba.conf
        Copy-Item $hbaBackup $hbaPath -Force
        $pgCtl = "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe"
        if (Test-Path $pgCtl) {
            & $pgCtl reload -D $pgDataPath 2>&1 | Out-Null
        } else {
            Restart-Service -Name "postgresql-x64-18" -Force
        }
        exit 1
    }
    
    # Restore pg_hba.conf
    Write-Host "Restoring pg_hba.conf..." -ForegroundColor Gray
    Copy-Item $hbaBackup $hbaPath -Force
    
    # Reload PostgreSQL configuration
    if (Test-Path $pgCtl) {
        & $pgCtl reload -D $pgDataPath 2>&1 | Out-Null
    } else {
        Restart-Service -Name "postgresql-x64-18" -Force
    }
    
    Start-Sleep -Seconds 3
    
    $password = $newPassword
    $passwordPlain = $newPasswordPlain
    
} else {
    Write-Host "`nEnter PostgreSQL password for user 'postgres':" -ForegroundColor Yellow
    $password = Read-Host -AsSecureString
    $passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
    )
}

# ================================================================
# STEP 2: TEST CONNECTION
# ================================================================

Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "  STEP 2: Testing Connection" -ForegroundColor Cyan
Write-Host "===============================================`n" -ForegroundColor Cyan

$env:PGPASSWORD = $passwordPlain
$testResult = psql -U postgres -h localhost -c "SELECT version();" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Connection successful!" -ForegroundColor Green
    $pgVersion = $testResult | Select-String "PostgreSQL" | Select-Object -First 1
    Write-Host "   $pgVersion`n" -ForegroundColor Gray
} else {
    Write-Host "❌ Connection failed!" -ForegroundColor Red
    Write-Host "Error: $testResult`n" -ForegroundColor Red
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    exit 1
}

# ================================================================
# STEP 3: CREATE DATABASE
# ================================================================

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  STEP 3: Creating Database" -ForegroundColor Cyan
Write-Host "===============================================`n" -ForegroundColor Cyan

# Check if database exists
$dbExists = psql -U postgres -h localhost -lqt 2>&1 | Select-String "KWiseDB"

if ($dbExists) {
    Write-Host "⚠️  Database 'KWiseDB' already exists" -ForegroundColor Yellow
    $overwrite = Read-Host "Drop and recreate? (yes/no)"
    
    if ($overwrite -eq "yes") {
        Write-Host "Dropping existing database..." -ForegroundColor Gray
        psql -U postgres -h localhost -c "DROP DATABASE IF EXISTS KWiseDB;" 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database dropped" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to drop database" -ForegroundColor Red
            Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
            exit 1
        }
    } else {
        Write-Host "Keeping existing database`n" -ForegroundColor Gray
        $skipImport = $true
    }
}

if (-not $skipImport) {
    Write-Host "Creating database 'KWiseDB'..." -ForegroundColor White
    psql -U postgres -h localhost -c "CREATE DATABASE KWiseDB;" 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database created successfully!`n" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create database" -ForegroundColor Red
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
        exit 1
    }
}

# ================================================================
# STEP 4: INSTALL EXTENSIONS
# ================================================================

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  STEP 4: Installing Extensions" -ForegroundColor Cyan
Write-Host "===============================================`n" -ForegroundColor Cyan

$extensions = @("uuid-ossp", "pg_trgm", "btree_gin")

foreach ($ext in $extensions) {
    Write-Host "Installing extension: $ext" -ForegroundColor Gray
    psql -U postgres -h localhost -d KWiseDB -c "CREATE EXTENSION IF NOT EXISTS `"$ext`";" 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ $ext" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  $ext (may already exist or not available)" -ForegroundColor Yellow
    }
}

Write-Host ""

# ================================================================
# STEP 5: IMPORT BACKUP
# ================================================================

if (-not $skipImport) {
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host "  STEP 5: Importing Backup" -ForegroundColor Cyan
    Write-Host "  Size: $backupSizeMB MB" -ForegroundColor Cyan
    Write-Host "===============================================`n" -ForegroundColor Cyan
    
    Write-Host "This may take 5-10 minutes. Please wait...`n" -ForegroundColor Yellow
    
    $startTime = Get-Date
    
    # Import with progress (redirect to file for faster processing)
    $logFile = Join-Path $env:TEMP "kwisedb_import.log"
    psql -U postgres -h localhost -d KWiseDB -f $backupFile > $logFile 2>&1
    
    $endTime = Get-Date
    $duration = $endTime - $startTime
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Import completed successfully!" -ForegroundColor Green
        Write-Host "   Duration: $($duration.Minutes)m $($duration.Seconds)s`n" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Import completed with warnings" -ForegroundColor Yellow
        Write-Host "   Duration: $($duration.Minutes)m $($duration.Seconds)s" -ForegroundColor Gray
        Write-Host "   Check log: $logFile`n" -ForegroundColor Gray
    }
}

# ================================================================
# STEP 6: VERIFY IMPORT
# ================================================================

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  STEP 6: Verifying Database" -ForegroundColor Cyan
Write-Host "===============================================`n" -ForegroundColor Cyan

# Count tables
$tableCount = psql -U postgres -h localhost -d KWiseDB -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>&1
$tableCount = $tableCount.Trim()

Write-Host "Tables: $tableCount" -ForegroundColor White

# Count products (if table exists)
$productCount = psql -U postgres -h localhost -d KWiseDB -t -c "SELECT COUNT(*) FROM pc_parts WHERE category = 'CPU';" 2>&1
if ($LASTEXITCODE -eq 0) {
    $productCount = $productCount.Trim()
    Write-Host "CPUs: $productCount" -ForegroundColor White
}

$productCount = psql -U postgres -h localhost -d KWiseDB -t -c "SELECT COUNT(*) FROM pc_parts;" 2>&1
if ($LASTEXITCODE -eq 0) {
    $productCount = $productCount.Trim()
    Write-Host "Total Products: $productCount" -ForegroundColor White
}

Write-Host ""

# ================================================================
# STEP 7: UPDATE .ENV FILE
# ================================================================

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  STEP 7: Updating .env File" -ForegroundColor Cyan
Write-Host "===============================================`n" -ForegroundColor Cyan

if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
    $envContent = $envContent -replace 'DB_PASSWORD=.*', "DB_PASSWORD=$passwordPlain"
    Set-Content -Path $envFile -Value $envContent
    Write-Host "✅ .env file updated with database password`n" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env file not found at $envFile`n" -ForegroundColor Yellow
}

# Clean up
Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

# ================================================================
# SETUP COMPLETE
# ================================================================

Write-Host "================================================================" -ForegroundColor Green
Write-Host "  ✅ DATABASE SETUP COMPLETE!" -ForegroundColor Green
Write-Host "================================================================`n" -ForegroundColor Green

Write-Host "Database: KWiseDB" -ForegroundColor White
Write-Host "Tables: $tableCount" -ForegroundColor White
Write-Host "Status: Ready for backend connection`n" -ForegroundColor White

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start services: powershell -File `"$repoRoot\scripts\start-all.ps1`"" -ForegroundColor White
Write-Host "  2. Test backend: http://localhost:5000/api/health" -ForegroundColor White
Write-Host "  3. Access app: http://localhost:3000`n" -ForegroundColor White
