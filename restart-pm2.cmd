@echo off
REM K-Wise PM2 Restart Script
REM This script restarts the K-Wise application

echo ====================================
echo K-Wise PM2 Restart Script
echo ====================================
echo.

REM Change to the project directory
cd /d "%~dp0"

REM Check if PM2 is installed
where pm2 >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: PM2 is not installed or not in PATH
    pause
    exit /b 1
)

echo Restarting K-Wise application...
echo.

REM Restart all PM2 processes
pm2 restart all

if %ERRORLEVEL% equ 0 (
    echo.
    echo ====================================
    echo K-Wise restarted successfully!
    echo ====================================
    echo.
    echo To view status: pm2 status
    echo To view logs:   pm2 logs
    echo.
) else (
    echo.
    echo ERROR: Failed to restart K-Wise application
    echo Check the logs: pm2 logs
    pause
    exit /b 1
)

pause
