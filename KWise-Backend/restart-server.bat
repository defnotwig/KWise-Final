@echo off
echo ========================================
echo K-Wise Backend Server Restart Script
echo ========================================
echo.

echo [1/3] Attempting to stop existing Node.js processes...
taskkill /IM node.exe /F 2>nul
if %ERRORLEVEL% == 0 (
    echo    SUCCESS: Node.js processes terminated
) else (
    echo    WARNING: No Node.js processes found or access denied
    echo    You may need to manually stop processes in Task Manager
)
timeout /t 2 /nobreak >nul

echo.
echo [2/3] Waiting for ports to be released...
timeout /t 3 /nobreak >nul

echo.
echo [3/3] Starting K-Wise Backend Server...
echo    Port: 5000
echo    Environment: development
echo.
node server.js

pause
