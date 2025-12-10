# K-WISE DATABASE SETUP - SIMPLE VERSION
# No unicode characters, pure ASCII

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  K-WISE DATABASE SETUP" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$repoRoot = "c:\Users\PCWISE\Documents\KWise Final\KWise-Final"
$backupFile = Join-Path $repoRoot "KWiseDB_full_backup_2025-12-10.sql"
$envFile = Join-Path $repoRoot "KWise-Backend\.env"

# Add PostgreSQL to PATH
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"

# Check backup file
if (-not (Test-Path $backupFile)) {
    Write-Host "ERROR: Backup file not found" -ForegroundColor Red
    exit 1
}

$backupSizeMB = [math]::Round((Get-Item $backupFile).Length / 1MB, 2)
Write-Host "Backup file: $backupSizeMB MB" -ForegroundColor Green
Write-Host ""

# ASK FOR PASSWORD RESET
Write-Host "Do you want to reset the PostgreSQL password?" -ForegroundColor Yellow
Write-Host "  1 = Yes, reset password (recommended if unknown)" -ForegroundColor White
Write-Host "  2 = No, I know the password" -ForegroundColor White
Write-Host ""
$resetChoice = Read-Host "Enter choice (1 or 2)"

if ($resetChoice -eq "1") {
    Write-Host ""
    Write-Host "PASSWORD RESET MODE" -ForegroundColor Yellow
    Write-Host "This will temporarily modify pg_hba.conf" -ForegroundColor Gray
    Write-Host ""
    
    $pgDataPath = "C:\Program Files\PostgreSQL\18\data"
    $hbaPath = Join-Path $pgDataPath "pg_hba.conf"
    $hbaBackup = $hbaPath + ".backup." + (Get-Date -Format 'yyyyMMddHHmmss')
    
    # Backup
    Copy-Item $hbaPath $hbaBackup -Force
    Write-Host "Created backup: $(Split-Path $hbaBackup -Leaf)" -ForegroundColor Gray
    
    # Change to trust
    $hbaContent = Get-Content $hbaPath
    $hbaContent = $hbaContent -replace 'scram-sha-256', 'trust'
    Set-Content -Path $hbaPath -Value $hbaContent
    Write-Host "Modified pg_hba.conf to trust mode" -ForegroundColor Gray
    
    # Reload
    Write-Host "Reloading PostgreSQL..." -ForegroundColor Gray
    Restart-Service -Name "postgresql-x64-18" -Force
    Start-Sleep -Seconds 5
    
    # Set password
    Write-Host ""
    $newPassword = Read-Host "Enter NEW PostgreSQL password" -AsSecureString
    $newPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($newPassword)
    )
    
    $resetSQL = "ALTER USER postgres WITH PASSWORD '$newPasswordPlain';"
    Write-Host "Resetting password..." -ForegroundColor Gray
    echo $resetSQL | psql -U postgres -h localhost 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Password reset successful!" -ForegroundColor Green
    } else {
        Write-Host "Password reset failed!" -ForegroundColor Red
        Copy-Item $hbaBackup $hbaPath -Force
        Restart-Service -Name "postgresql-x64-18" -Force
        exit 1
    }
    
    # Restore hba
    Write-Host "Restoring pg_hba.conf..." -ForegroundColor Gray
    Copy-Item $hbaBackup $hbaPath -Force
    Restart-Service -Name "postgresql-x64-18" -Force
    Start-Sleep -Seconds 5
    
    $passwordPlain = $newPasswordPlain
    Write-Host "Password has been reset!" -ForegroundColor Green
    Write-Host ""
    
} else {
    Write-Host ""
    $password = Read-Host "Enter PostgreSQL password for user 'postgres'" -AsSecureString
    $passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
    )
}

# TEST CONNECTION
Write-Host ""
Write-Host "Testing connection..." -ForegroundColor Cyan
$env:PGPASSWORD = $passwordPlain
$testResult = psql -U postgres -h localhost -c "SELECT version();" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Connection successful!" -ForegroundColor Green
} else {
    Write-Host "Connection failed!" -ForegroundColor Red
    Write-Host $testResult -ForegroundColor Red
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    exit 1
}

Write-Host ""

# CHECK EXISTING DATABASE
Write-Host "Checking for existing database..." -ForegroundColor Cyan
$dbExists = psql -U postgres -h localhost -lqt 2>&1 | Select-String "KWiseDB"

if ($dbExists) {
    Write-Host "Database 'KWiseDB' exists" -ForegroundColor Yellow
    $overwrite = Read-Host "Drop and recreate? (yes/no)"
    
    if ($overwrite -eq "yes") {
        Write-Host "Dropping database..." -ForegroundColor Gray
        psql -U postgres -h localhost -c "DROP DATABASE IF EXISTS KWiseDB;" 2>&1 | Out-Null
        Write-Host "Database dropped" -ForegroundColor Green
    } else {
        Write-Host "Keeping existing database" -ForegroundColor Gray
        $skipImport = $true
    }
}

# CREATE DATABASE
if (-not $skipImport) {
    Write-Host ""
    Write-Host "Creating database 'KWiseDB'..." -ForegroundColor Cyan
    psql -U postgres -h localhost -c "CREATE DATABASE KWiseDB;" 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database created!" -ForegroundColor Green
    } else {
        Write-Host "Failed to create database" -ForegroundColor Red
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
        exit 1
    }
}

# INSTALL EXTENSIONS
Write-Host ""
Write-Host "Installing extensions..." -ForegroundColor Cyan
$extensions = @("uuid-ossp", "pg_trgm", "btree_gin")

foreach ($ext in $extensions) {
    psql -U postgres -h localhost -d KWiseDB -c "CREATE EXTENSION IF NOT EXISTS `"$ext`";" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  - $ext" -ForegroundColor Green
    }
}

# IMPORT BACKUP
if (-not $skipImport) {
    Write-Host ""
    Write-Host "Importing backup..." -ForegroundColor Cyan
    Write-Host "This will take 5-10 minutes. Please wait..." -ForegroundColor Yellow
    Write-Host ""
    
    $startTime = Get-Date
    $logFile = Join-Path $env:TEMP "kwisedb_import.log"
    
    psql -U postgres -h localhost -d KWiseDB -f $backupFile > $logFile 2>&1
    
    $endTime = Get-Date
    $duration = $endTime - $startTime
    
    Write-Host ""
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Import completed!" -ForegroundColor Green
    } else {
        Write-Host "Import completed with warnings" -ForegroundColor Yellow
    }
    Write-Host "Duration: $($duration.Minutes)m $($duration.Seconds)s" -ForegroundColor Gray
}

# VERIFY
Write-Host ""
Write-Host "Verifying database..." -ForegroundColor Cyan
$tableCount = psql -U postgres -h localhost -d KWiseDB -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>&1
$tableCount = $tableCount.Trim()
Write-Host "Tables: $tableCount" -ForegroundColor White

$productCount = psql -U postgres -h localhost -d KWiseDB -t -c "SELECT COUNT(*) FROM pc_parts;" 2>&1
if ($LASTEXITCODE -eq 0) {
    $productCount = $productCount.Trim()
    Write-Host "Total Products: $productCount" -ForegroundColor White
}

# UPDATE .ENV
Write-Host ""
Write-Host "Updating .env file..." -ForegroundColor Cyan
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
    $envContent = $envContent -replace 'DB_PASSWORD=.*', "DB_PASSWORD=$passwordPlain"
    Set-Content -Path $envFile -Value $envContent
    Write-Host ".env file updated!" -ForegroundColor Green
}

Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

# DONE
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  DATABASE SETUP COMPLETE!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Database: KWiseDB" -ForegroundColor White
Write-Host "Tables: $tableCount" -ForegroundColor White
Write-Host "Products: $productCount" -ForegroundColor White
Write-Host ""
Write-Host "Next: Start services with start-all.ps1" -ForegroundColor Cyan
Write-Host ""
