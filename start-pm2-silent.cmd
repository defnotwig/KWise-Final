@echo off
REM K-Wise PM2 Silent Startup Script
REM This script is optimized for Windows Task Scheduler
REM It runs without user interaction and logs all output

setlocal enabledelayedexpansion

REM Set the script directory
set "SCRIPT_DIR=%~dp0"
set "LOG_DIR=%SCRIPT_DIR%logs"
set "LOG_FILE=%LOG_DIR%\pm2-startup-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%.log"

REM Create logs directory if it doesn't exist
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

REM Redirect all output to log file
(
    echo ====================================
    echo K-Wise PM2 Silent Startup Script
    echo ====================================
    echo Started at: %date% %time%
    echo Script Directory: %SCRIPT_DIR%
    echo.

    REM Change to the project directory
    cd /d "%SCRIPT_DIR%"

    REM Check if PM2 is installed
    where pm2 >nul 2>nul
    if !ERRORLEVEL! neq 0 (
        echo ERROR: PM2 is not installed or not in PATH
        echo Please install PM2 globally: npm install -g pm2
        exit /b 1
    )
    echo [OK] PM2 found

    REM Check if ecosystem.config.js exists
    if not exist "ecosystem.config.js" (
        echo ERROR: ecosystem.config.js not found in %SCRIPT_DIR%
        exit /b 1
    )
    echo [OK] ecosystem.config.js found

    REM Check if processes are already running
    pm2 list 2>nul | findstr /C:"kwise-backend" >nul
    if !ERRORLEVEL! equ 0 (
        echo [INFO] K-Wise processes already running, restarting...
        pm2 restart ecosystem.config.js
    ) else (
        echo [INFO] Starting K-Wise processes...
        pm2 start ecosystem.config.js
    )

    if !ERRORLEVEL! equ 0 (
        echo.
        echo ====================================
        echo K-Wise started successfully!
        echo ====================================
        echo.
        
        REM Save the PM2 process list
        pm2 save
        echo [OK] PM2 configuration saved
        
        REM Display status
        echo.
        echo Current PM2 Status:
        pm2 status
        echo.
        echo Completed at: %date% %time%
        exit /b 0
    ) else (
        echo.
        echo ERROR: Failed to start K-Wise application
        echo Check PM2 logs for details
        echo.
        echo Completed at: %date% %time%
        exit /b 1
    )
) >> "%LOG_FILE%" 2>&1

endlocal
