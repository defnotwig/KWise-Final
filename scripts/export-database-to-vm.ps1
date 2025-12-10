# ========================================
# K-WISE DATABASE EXPORT SCRIPT
# ========================================
# Purpose: Export KWiseDB from local machine for VM import
# Date: December 10, 2025
# ========================================

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  K-WISE DATABASE EXPORT UTILITY" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$DB_NAME = "KWiseDB"
$DB_USER = "postgres"
$DB_HOST = "localhost"
$DB_PORT = "5432"
$BACKUP_DIR = "C:\Temp\KWise-Backups"
$DATE = Get-Date -Format "yyyy-MM-dd_HHmmss"

# Prompt for password
Write-Host "Enter PostgreSQL password: " -ForegroundColor Yellow -NoNewline
$DB_PASSWORD = Read-Host -AsSecureString
$env:PGPASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD))

# Create backup directory
Write-Host ""
Write-Host "Creating backup directory..." -ForegroundColor Green
if (-Not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
}

# File paths
$SCHEMA_FILE = Join-Path $BACKUP_DIR "KWiseDB_schema_$DATE.sql"
$DATA_FILE = Join-Path $BACKUP_DIR "KWiseDB_data_$DATE.sql"
$FULL_FILE = Join-Path $BACKUP_DIR "KWiseDB_full_$DATE.sql"
$ZIP_FILE = Join-Path $BACKUP_DIR "KWiseDB_export_$DATE.zip"

# Export Schema Only
Write-Host ""
Write-Host "Exporting database schema..." -ForegroundColor Green
try {
    pg_dump -U $DB_USER -d $DB_NAME -h $DB_HOST -p $DB_PORT --schema-only --no-owner --no-privileges -f $SCHEMA_FILE
    Write-Host "✅ Schema exported successfully!" -ForegroundColor Green
    Write-Host "   File: $SCHEMA_FILE" -ForegroundColor Gray
} catch {
    Write-Host "❌ Schema export failed: $_" -ForegroundColor Red
    exit 1
}

# Export Data Only
Write-Host ""
Write-Host "Exporting database data..." -ForegroundColor Green
try {
    pg_dump -U $DB_USER -d $DB_NAME -h $DB_HOST -p $DB_PORT --data-only --no-owner --no-privileges -f $DATA_FILE
    Write-Host "✅ Data exported successfully!" -ForegroundColor Green
    Write-Host "   File: $DATA_FILE" -ForegroundColor Gray
} catch {
    Write-Host "❌ Data export failed: $_" -ForegroundColor Red
    exit 1
}

# Export Full Database
Write-Host ""
Write-Host "Exporting complete database..." -ForegroundColor Green
try {
    pg_dump -U $DB_USER -d $DB_NAME -h $DB_HOST -p $DB_PORT --no-owner --no-privileges -f $FULL_FILE
    Write-Host "✅ Full database exported successfully!" -ForegroundColor Green
    Write-Host "   File: $FULL_FILE" -ForegroundColor Gray
} catch {
    Write-Host "❌ Full database export failed: $_" -ForegroundColor Red
    exit 1
}

# Get file sizes
Write-Host ""
Write-Host "Backup files created:" -ForegroundColor Cyan
Get-ChildItem $BACKUP_DIR -Filter "KWiseDB_*_$DATE.sql" | ForEach-Object {
    $sizeMB = [math]::Round($_.Length / 1MB, 2)
    Write-Host "  • $($_.Name) - $sizeMB MB" -ForegroundColor White
}

# Compress backups
Write-Host ""
Write-Host "Compressing backup files..." -ForegroundColor Green
try {
    $filesToZip = @($SCHEMA_FILE, $DATA_FILE, $FULL_FILE)
    Compress-Archive -Path $filesToZip -DestinationPath $ZIP_FILE -Force
    
    $zipSizeMB = [math]::Round((Get-Item $ZIP_FILE).Length / 1MB, 2)
    Write-Host "✅ Backup compressed successfully!" -ForegroundColor Green
    Write-Host "   File: $ZIP_FILE" -ForegroundColor Gray
    Write-Host "   Size: $zipSizeMB MB" -ForegroundColor Gray
} catch {
    Write-Host "❌ Compression failed: $_" -ForegroundColor Red
}

# Generate import script
Write-Host ""
Write-Host "Generating import script for VM..." -ForegroundColor Green

$IMPORT_SCRIPT = Join-Path $BACKUP_DIR "import_to_vm.ps1"
$importScriptContent = @"
# ========================================
# K-WISE DATABASE IMPORT SCRIPT (VM)
# ========================================
# Generated: $DATE
# Run this script on your VM
# ========================================

Write-Host "K-WISE DATABASE IMPORT UTILITY" -ForegroundColor Cyan
Write-Host ""

# Configuration
`$DB_NAME = "KWiseDB"
`$DB_USER = "postgres"
`$DB_HOST = "localhost"
`$DB_PORT = "5432"
`$BACKUP_DIR = "C:\Temp\KWise-Backups"

# Prompt for password
Write-Host "Enter PostgreSQL password: " -ForegroundColor Yellow -NoNewline
`$DB_PASSWORD = Read-Host -AsSecureString
`$env:PGPASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR(`$DB_PASSWORD))

# Extract archive
Write-Host "Extracting backup files..." -ForegroundColor Green
Expand-Archive -Path "`$BACKUP_DIR\KWiseDB_export_$DATE.zip" -DestinationPath `$BACKUP_DIR -Force

# Create database
Write-Host "Creating database..." -ForegroundColor Green
psql -U `$DB_USER -h `$DB_HOST -c "DROP DATABASE IF EXISTS \`"`$DB_NAME\`";"
psql -U `$DB_USER -h `$DB_HOST -c "CREATE DATABASE \`"`$DB_NAME\`";"

# Create extensions
Write-Host "Creating extensions..." -ForegroundColor Green
psql -U `$DB_USER -d `$DB_NAME -h `$DB_HOST -c "CREATE EXTENSION IF NOT EXISTS \`"uuid-ossp\`";"
psql -U `$DB_USER -d `$DB_NAME -h `$DB_HOST -c "CREATE EXTENSION IF NOT EXISTS \`"pg_trgm\`";"
psql -U `$DB_USER -d `$DB_NAME -h `$DB_HOST -c "CREATE EXTENSION IF NOT EXISTS \`"btree_gin\`";"

# Import full database
Write-Host "Importing database..." -ForegroundColor Green
`$FULL_FILE = Join-Path `$BACKUP_DIR "KWiseDB_full_$DATE.sql"
psql -U `$DB_USER -d `$DB_NAME -h `$DB_HOST -f `$FULL_FILE

# Verify import
Write-Host ""
Write-Host "Verifying import..." -ForegroundColor Green
psql -U `$DB_USER -d `$DB_NAME -h `$DB_HOST -c "\dt"

Write-Host ""
Write-Host "✅ Database import complete!" -ForegroundColor Green
Write-Host "   Database: `$DB_NAME" -ForegroundColor Gray
Write-Host ""
Write-Host "Test the database:" -ForegroundColor Cyan
Write-Host "   psql -U `$DB_USER -d `$DB_NAME" -ForegroundColor White
"@

Set-Content -Path $IMPORT_SCRIPT -Value $importScriptContent
Write-Host "✅ Import script created!" -ForegroundColor Green
Write-Host "   File: $IMPORT_SCRIPT" -ForegroundColor Gray

# Summary
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  EXPORT COMPLETE!" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📦 Backup Package: $ZIP_FILE" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Copy '$ZIP_FILE' to your VM" -ForegroundColor White
Write-Host "  2. Also copy '$IMPORT_SCRIPT' to your VM" -ForegroundColor White
Write-Host "  3. Run the import script on VM:" -ForegroundColor White
Write-Host "     powershell -ExecutionPolicy Bypass -File import_to_vm.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "Or use GitHub Release:" -ForegroundColor Yellow
Write-Host "  gh release create v1.0.0-database \" -ForegroundColor White
Write-Host "    --title 'Database Backup - $DATE' \" -ForegroundColor White
Write-Host "    --notes 'Database export for VM deployment' \" -ForegroundColor White
Write-Host "    '$ZIP_FILE'" -ForegroundColor White
Write-Host ""

# Cleanup password from environment
Remove-Item Env:\PGPASSWORD

# Open backup directory
Write-Host "Opening backup directory..." -ForegroundColor Green
Start-Process explorer.exe -ArgumentList $BACKUP_DIR
