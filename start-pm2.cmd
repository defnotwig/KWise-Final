@echo off
REM K-Wise PM2 Startup Script
REM This script starts the K-Wise application using PM2
REM Can be used with Windows Task Scheduler

echo ====================================
echo K-Wise PM2 Startup Script
echo ====================================
echo.

REM Change to the project directory
cd /d "%~dp0"

REM Check if PM2 is installed
where pm2 >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: PM2 is not installed or not in PATH
    echo Please install PM2 globally: npm install -g pm2
    pause
    exit /b 1
)

REM Check if ecosystem.config.js exists
if not exist "ecosystem.config.js" (
    echo ERROR: ecosystem.config.js not found
    echo Please ensure you are in the correct directory
    pause
    exit /b 1
)

echo Starting K-Wise application with PM2...
echo.

REM Start the application using PM2
pm2 start ecosystem.config.js

if %ERRORLEVEL% equ 0 (
    echo.
    echo ====================================
    echo K-Wise started successfully!
    echo ====================================
    echo.
    echo To view status: pm2 status
    echo To view logs:   pm2 logs
    echo To stop:        pm2 stop all
    echo To restart:     pm2 restart all
    echo.
) else (
    echo.
    echo ERROR: Failed to start K-Wise application
    echo Check the logs for more details: pm2 logs
    pause
    exit /b 1
)

REM Save the PM2 process list
pm2 save

echo.
echo PM2 startup configuration saved.
echo.
pause
