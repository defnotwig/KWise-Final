@echo off
REM K-Wise PM2 Stop Script
REM This script stops the K-Wise application

echo ====================================
echo K-Wise PM2 Stop Script
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

echo Stopping K-Wise application...
echo.

REM Stop all PM2 processes
pm2 stop all

if %ERRORLEVEL% equ 0 (
    echo.
    echo ====================================
    echo K-Wise stopped successfully!
    echo ====================================
    echo.
) else (
    echo.
    echo ERROR: Failed to stop K-Wise application
    pause
    exit /b 1
)

pause
