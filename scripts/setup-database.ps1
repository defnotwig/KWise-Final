# Database Setup Script for K-Wise VM
# This script will create the database and import the backup

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "  K-WISE DATABASE SETUP" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

$pgPath = "C:\Program Files\PostgreSQL\18\bin"
$backupFile = "c:\Users\PCWISE\Documents\KWise Final\KWise-Final\KWiseDB_full_backup_2025-12-10.sql"

# Check if backup file exists
if (-not (Test-Path $backupFile)) {
    Write-Host "❌ Backup file not found: $backupFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Backup file found: $backupFile" -ForegroundColor Green
$backupSizeMB = [math]::Round((Get-Item $backupFile).Length / 1MB, 2)
Write-Host "   Size: $backupSizeMB MB`n" -ForegroundColor Gray

# Prompt for PostgreSQL password
Write-Host "Enter PostgreSQL password for user 'postgres': " -ForegroundColor Yellow -NoNewline
$securePassword = Read-Host -AsSecureString
$env:PGPASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))

# Test connection
Write-Host "`nTesting PostgreSQL connection..." -ForegroundColor Cyan
try {
    & "$pgPath\psql.exe" -U postgres -h localhost -c "SELECT version();" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Connection failed"
    }
    Write-Host "✅ Connected successfully!`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to connect to PostgreSQL" -ForegroundColor Red
    Write-Host "   Please check the password and try again.`n" -ForegroundColor Yellow
    Remove-Item Env:\PGPASSWORD
    exit 1
}

# Check if database exists
Write-Host "Checking if KWiseDB exists..." -ForegroundColor Cyan
$dbExists = & "$pgPath\psql.exe" -U postgres -h localhost -lqt 2>&1 | Select-String "KWiseDB"

if ($dbExists) {
    Write-Host "⚠️  Database KWiseDB already exists" -ForegroundColor Yellow
    Write-Host "   Do you want to drop and recreate it? (y/N): " -ForegroundColor Yellow -NoNewline
    $recreate = Read-Host
    
    if ($recreate -eq "y" -or $recreate -eq "Y") {
        Write-Host "`nDropping existing database..." -ForegroundColor White
        & "$pgPath\psql.exe" -U postgres -h localhost -c "DROP DATABASE IF EXISTS `"KWiseDB`";" | Out-Null
        Write-Host "Creating new database..." -ForegroundColor White
        & "$pgPath\psql.exe" -U postgres -h localhost -c "CREATE DATABASE `"KWiseDB`";" | Out-Null
        Write-Host "✅ Database created`n" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️  Using existing database`n" -ForegroundColor Yellow
    }
} else {
    Write-Host "Creating KWiseDB database..." -ForegroundColor White
    & "$pgPath\psql.exe" -U postgres -h localhost -c "CREATE DATABASE `"KWiseDB`";" | Out-Null
    Write-Host "✅ Database created`n" -ForegroundColor Green
}

# Create extensions
Write-Host "Creating PostgreSQL extensions..." -ForegroundColor Cyan
& "$pgPath\psql.exe" -U postgres -d KWiseDB -h localhost -c "CREATE EXTENSION IF NOT EXISTS `"uuid-ossp`";" | Out-Null
& "$pgPath\psql.exe" -U postgres -d KWiseDB -h localhost -c "CREATE EXTENSION IF NOT EXISTS `"pg_trgm`";" | Out-Null
& "$pgPath\psql.exe" -U postgres -d KWiseDB -h localhost -c "CREATE EXTENSION IF NOT EXISTS `"btree_gin`";" | Out-Null
Write-Host "✅ Extensions created`n" -ForegroundColor Green

# Import database
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  IMPORTING DATABASE (this may take 5-10 minutes)" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

$startTime = Get-Date
Write-Host "Started at: $($startTime.ToString('HH:mm:ss'))" -ForegroundColor Gray
Write-Host "Please wait...`n" -ForegroundColor Yellow

& "$pgPath\psql.exe" -U postgres -d KWiseDB -h localhost -f $backupFile 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalMinutes
    
    Write-Host "✅ Database imported successfully!" -ForegroundColor Green
    Write-Host "   Duration: $([math]::Round($duration, 2)) minutes`n" -ForegroundColor Gray
    
    # Verify import
    Write-Host "Verifying import..." -ForegroundColor Cyan
    $tableCount = & "$pgPath\psql.exe" -U postgres -d KWiseDB -h localhost -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
    $productCount = & "$pgPath\psql.exe" -U postgres -d KWiseDB -h localhost -t -c "SELECT COUNT(*) FROM pc_parts;" 2>&1
    
    Write-Host "✅ Found $($tableCount.Trim()) tables" -ForegroundColor Green
    if ($productCount -match '\d+') {
        Write-Host "✅ Found $($productCount.Trim()) products`n" -ForegroundColor Green
    }
} else {
    Write-Host "❌ Database import failed!" -ForegroundColor Red
    Write-Host "   Check the error messages above`n" -ForegroundColor Yellow
}

# Update .env file with the correct password
$envFile = "c:\Users\PCWISE\Documents\KWise Final\KWise-Final\KWise-Backend\.env"
if (Test-Path $envFile) {
    Write-Host "Updating backend .env file with database password..." -ForegroundColor Cyan
    $envContent = Get-Content $envFile -Raw
    $envContent = $envContent -replace 'DB_PASSWORD=.*', "DB_PASSWORD=$env:PGPASSWORD"
    Set-Content $envFile -Value $envContent
    Write-Host "✅ .env file updated`n" -ForegroundColor Green
}

Remove-Item Env:\PGPASSWORD

Write-Host "================================================" -ForegroundColor Green
Write-Host "  DATABASE SETUP COMPLETE!" -ForegroundColor Green
Write-Host "================================================`n" -ForegroundColor Green

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Install Ollama AI: winget install Ollama.Ollama" -ForegroundColor White
Write-Host "  2. Pull models: ollama pull deepseek-r1:1.5b" -ForegroundColor White
Write-Host "  3. Start backend: npm run dev" -ForegroundColor White
Write-Host "  4. Build frontend: npm run build`n" -ForegroundColor White
