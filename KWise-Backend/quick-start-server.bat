@echo off
echo ========================================
echo K-WISE BACKEND SERVER - QUICK START
echo ========================================
echo.
echo Starting server in 3 seconds...
timeout /t 3 /nobreak >nul

echo 🚀 Starting K-Wise Backend Server...
echo.
echo If the server crashes or gets corrupted:
echo 1. Copy server-reference-backup.js to working-server.js
echo 2. Run this script again
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

node working-server.js

pause
