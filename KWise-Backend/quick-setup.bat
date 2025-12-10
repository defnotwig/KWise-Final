@echo off
echo ========================================
echo    K-Wise Database Setup Script
echo ========================================
echo.

echo 🚀 Starting comprehensive database setup...
echo.

echo 📋 Step 1: Creating database schema...
node setup-database.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Database setup completed successfully!
    echo.
    echo 🎯 Your K-Wise system now has a comprehensive PC parts database!
    echo.
    echo 📖 Next steps:
    echo    1. Start the backend server: node working-server.js
    echo    2. Test the admin interface
    echo    3. Add component images as needed
    echo.
    echo 📚 For detailed information, see DATABASE_SETUP_README.md
    echo.
) else (
    echo.
    echo ❌ Database setup failed!
    echo.
    echo 🔍 Please check:
    echo    1. PostgreSQL is running
    echo    2. Database connection is correct
    echo    3. All dependencies are installed
    echo.
    echo 📖 See DATABASE_SETUP_README.md for troubleshooting
    echo.
)

pause
