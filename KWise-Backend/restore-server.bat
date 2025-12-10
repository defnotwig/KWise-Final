@echo off
echo ========================================
echo K-WISE SERVER RESTORE UTILITY
echo ========================================
echo.
echo This will restore the server from backup
echo and start it automatically.
echo.
echo Press any key to continue...
pause >nul

echo.
echo 🔄 Restoring server from backup...
copy server-reference-backup.js working-server.js

if %errorlevel% equ 0 (
    echo ✅ Server restored successfully!
    echo.
    echo 🚀 Starting server...
    echo.
    node working-server.js
) else (
    echo ❌ Failed to restore server!
    echo Please check if server-reference-backup.js exists.
    pause
)
