@echo off
REM ========================================
REM K-Wise PostgreSQL Service Starter
REM Run this as Administrator
REM ========================================

echo.
echo ========================================
echo Starting PostgreSQL Service
echo ========================================
echo.

REM Try to start PostgreSQL 17
net start postgresql-x64-17

if %errorlevel% equ 0 (
    echo.
    echo ✅ SUCCESS: PostgreSQL started!
    echo.
    echo Testing connection...
    timeout /t 2 /nobreak >nul
    
    REM Test if port 5432 is now listening
    netstat -an | findstr ":5432"
    
    echo.
    echo ✅ PostgreSQL is now running
    echo 🎯 You can now start the K-Wise backend server
    echo.
    echo Next steps:
    echo   1. Close this window
    echo   2. In VS Code terminal, run: npm start
    echo.
    pause
) else (
    echo.
    echo ❌ FAILED: Could not start PostgreSQL
    echo.
    echo 💡 SOLUTION: Run this script as Administrator
    echo.
    echo How to run as Administrator:
    echo   1. Right-click on start-postgresql.bat
    echo   2. Select "Run as administrator"
    echo.
    echo OR use Windows Services Manager:
    echo   1. Press Win+R
    echo   2. Type: services.msc
    echo   3. Find "postgresql-x64-17"
    echo   4. Right-click → Start
    echo.
    pause
)
