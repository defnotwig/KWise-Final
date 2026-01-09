@echo off
REM K-Wise PM2 Test Script
REM This script tests if everything is ready for Task Scheduler setup

echo ====================================
echo K-Wise PM2 Setup Test
echo ====================================
echo.

cd /d "%~dp0"

echo [1/5] Checking PM2 installation...
where pm2 >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [FAIL] PM2 is not installed
    echo Install with: npm install -g pm2
    goto :failed
) else (
    echo [OK] PM2 is installed
    pm2 --version
)
echo.

echo [2/5] Checking Node.js installation...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [FAIL] Node.js is not installed
    goto :failed
) else (
    echo [OK] Node.js is installed
    node --version
)
echo.

echo [3/5] Checking ecosystem.config.js...
if not exist "ecosystem.config.js" (
    echo [FAIL] ecosystem.config.js not found
    goto :failed
) else (
    echo [OK] ecosystem.config.js found
)
echo.

echo [4/5] Checking backend directory...
if not exist "KWise-Backend\server.js" (
    echo [FAIL] Backend server.js not found
    goto :failed
) else (
    echo [OK] Backend found
)
echo.

echo [5/5] Checking frontend build...
if not exist "K-Wise\build" (
    echo [WARNING] Frontend build folder not found
    echo You may need to run: cd K-Wise ^&^& npm run build
) else (
    echo [OK] Frontend build found
)
echo.

echo ====================================
echo Test Summary: PASSED
echo ====================================
echo.
echo Ready for Task Scheduler setup!
echo.
echo Next steps:
echo 1. Right-click setup-task-scheduler.ps1
echo 2. Select "Run with PowerShell as Administrator"
echo 3. Follow the prompts
echo.
echo Or test manually first:
echo   start-pm2.cmd     (Interactive test)
echo   start-pm2-silent.cmd (Silent test with logging)
echo.
pause
exit /b 0

:failed
echo.
echo ====================================
echo Test Summary: FAILED
echo ====================================
echo.
echo Please fix the issues above before proceeding.
echo.
pause
exit /b 1
