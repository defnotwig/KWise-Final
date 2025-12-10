Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    K-Wise Database Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "🚀 Starting comprehensive database setup..." -ForegroundColor Green
Write-Host ""

Write-Host "📋 Step 1: Creating database schema..." -ForegroundColor Yellow
try {
    node setup-database.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Database setup completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎯 Your K-Wise system now has a comprehensive PC parts database!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📖 Next steps:" -ForegroundColor Cyan
        Write-Host "    1. Start the backend server: node working-server.js" -ForegroundColor White
        Write-Host "    2. Test the admin interface" -ForegroundColor White
        Write-Host "    3. Add component images as needed" -ForegroundColor White
        Write-Host ""
        Write-Host "📚 For detailed information, see DATABASE_SETUP_README.md" -ForegroundColor Cyan
        Write-Host ""
    } else {
        throw "Setup script failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Host ""
    Write-Host "❌ Database setup failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔍 Please check:" -ForegroundColor Yellow
    Write-Host "    1. PostgreSQL is running" -ForegroundColor White
    Write-Host "    2. Database connection is correct" -ForegroundColor White
    Write-Host "    3. All dependencies are installed" -ForegroundColor White
    Write-Host ""
    Write-Host "📖 See DATABASE_SETUP_README.md for troubleshooting" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
