@echo off
echo ========================================
echo PostgreSQL Configuration Fix and Starter
echo ========================================
echo.

set PG_BIN=C:\Program Files\PostgreSQL\17\bin
set PG_DATA=C:\Program Files\PostgreSQL\17\data
set CONFIG_FILE=%PG_DATA%\postgresql-hyperv.conf

echo Checking PostgreSQL status...
"%PG_BIN%\pg_ctl.exe" status -D "%PG_DATA%" >nul 2>&1
if %errorlevel% equ 0 (
    echo PostgreSQL is already running!
    goto :verify
)

echo.
echo PostgreSQL is not running. Fixing configuration...
echo.

REM Fix the configuration file
if exist "%CONFIG_FILE%" (
    echo Found config file: %CONFIG_FILE%
    
    REM Create backup
    echo Creating backup...
    copy "%CONFIG_FILE%" "%CONFIG_FILE%.backup" >nul 2>&1
    
    REM Fix maintenance_work_mem and effective_io_concurrency
    powershell -Command "(Get-Content '%CONFIG_FILE%') -replace 'maintenance_work_mem\s*=\s*2097152', 'maintenance_work_mem = 1048576' -replace 'effective_io_concurrency\s*=\s*200', 'effective_io_concurrency = 0' | Set-Content '%CONFIG_FILE%'"
    
    echo Configuration fixed!
    echo.
)

echo Starting PostgreSQL server...
echo.
"%PG_BIN%\pg_ctl.exe" start -D "%PG_DATA%" -w -t 30

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo SUCCESS: PostgreSQL started!
    echo ========================================
    echo.
    goto :verify
) else (
    echo.
    echo ========================================
    echo ERROR: Could not start PostgreSQL
    echo ========================================
    echo.
    echo Check the log file at:
    echo %PG_DATA%\log\
    echo.
    echo Try starting via Windows Services instead:
    echo 1. Press Win+R
    echo 2. Type: services.msc
    echo 3. Find: postgresql-x64-17
    echo 4. Right-click and Start
    echo.
    pause
    exit /b 1
)

:verify
echo Verifying connection...
echo.

REM Test connection using psql
"%PG_BIN%\psql.exe" -U postgres -d KWiseDB -c "SELECT 'Connection successful!' as status;" 2>nul
if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo PostgreSQL is running and accessible!
    echo ========================================
    echo.
    echo You can now start your K-Wise server:
    echo   npm start
    echo.
) else (
    echo.
    echo Database connection test...
    echo Note: You may need to enter the postgres password
    echo Password from .env: humbleludwig13
    echo.
)

pause
