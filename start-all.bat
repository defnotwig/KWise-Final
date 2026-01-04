@echo off
REM Safe launcher that opens separate terminals for backend and frontend
REM Double-click this file to start both services. It does not modify any files.

SET ROOT_DIR=%~dp0

REM Start backend in a new window using dev (falls back to start if dev not available)
start "KWise Backend" cmd /k "cd /d "%ROOT_DIR%KWise-Backend" && if exist package.json (npm run dev) else (echo package.json not found in KWise-Backend & pause)"

REM Small delay to let the backend window open
timeout /t 1 >nul

REM Start frontend in a new window
start "K-Wise Frontend" cmd /k "cd /d "%ROOT_DIR%K-Wise" && if exist package.json (npm start) else (echo package.json not found in K-Wise & pause)"

exit /b 0
