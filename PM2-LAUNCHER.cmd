@echo off
REM This is a launcher that ensures proper execution of PM2 scripts
REM Use this if double-clicking the other .cmd files closes too fast

:menu
cls
echo ================================================
echo          K-WISE PM2 SCRIPT LAUNCHER
echo ================================================
echo.
echo Select an option:
echo.
echo  1. Test PM2 Setup (check prerequisites)
echo  2. Start K-Wise (interactive)
echo  3. Start K-Wise (silent with logging)
echo  4. Stop K-Wise
echo  5. Restart K-Wise
echo  6. View PM2 Status
echo  7. View PM2 Logs
echo  8. Setup Task Scheduler (requires admin)
echo  9. Exit
echo.
set /p choice="Enter your choice (1-9): "

if "%choice%"=="1" goto test
if "%choice%"=="2" goto start
if "%choice%"=="3" goto start_silent
if "%choice%"=="4" goto stop
if "%choice%"=="5" goto restart
if "%choice%"=="6" goto status
if "%choice%"=="7" goto logs
if "%choice%"=="8" goto scheduler
if "%choice%"=="9" goto exit

echo Invalid choice. Please try again.
timeout /t 2 >nul
goto menu

:test
echo.
echo Running PM2 Setup Test...
echo.
call test-pm2-setup.cmd
pause
goto menu

:start
echo.
echo Starting K-Wise (Interactive)...
echo.
call start-pm2.cmd
pause
goto menu

:start_silent
echo.
echo Starting K-Wise (Silent with logging)...
echo.
call start-pm2-silent.cmd
echo.
echo Check logs directory for output
pause
goto menu

:stop
echo.
echo Stopping K-Wise...
echo.
call stop-pm2.cmd
pause
goto menu

:restart
echo.
echo Restarting K-Wise...
echo.
call restart-pm2.cmd
pause
goto menu

:status
echo.
echo PM2 Status:
echo.
pm2 status
echo.
pause
goto menu

:logs
echo.
echo Opening PM2 Logs (Press Ctrl+C to exit logs)...
echo.
pm2 logs
pause
goto menu

:scheduler
echo.
echo Launching Task Scheduler Setup...
echo Right-click setup-task-scheduler.ps1 and select "Run as Administrator"
echo Or use PowerShell (Admin): powershell -ExecutionPolicy Bypass -File setup-task-scheduler.ps1
echo.
pause
powershell -ExecutionPolicy Bypass -File "%~dp0setup-task-scheduler.ps1"
pause
goto menu

:exit
echo.
echo Goodbye!
timeout /t 1 >nul
exit /b 0
