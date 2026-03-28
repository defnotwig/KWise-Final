@echo off
REM =============================================
REM K-Wise Project Setup Script for Collaborators
REM Run this from the project root directory
REM =============================================

echo.
echo ========================================
echo    K-Wise Project Setup
echo ========================================
echo.

REM Check Node.js
echo [1/7] Checking Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo    ERROR: Node.js is not installed!
    echo    Download from: https://nodejs.org/
    echo    Install the LTS version and re-run this script.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo    Found Node.js %%i

REM Check npm
echo [2/7] Checking npm...
npm --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo    ERROR: npm is not installed!
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do echo    Found npm %%i

REM Check PostgreSQL
echo [3/7] Checking PostgreSQL...
psql --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo    WARNING: PostgreSQL CLI (psql) not found in PATH.
    echo    If PostgreSQL is installed, add its bin folder to your PATH:
    echo    Usually: C:\Program Files\PostgreSQL\17\bin
    echo.
    echo    If not installed, download from:
    echo    https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
    echo.
    echo    See COLLABORATOR_SETUP.md for full instructions.
    echo.
    set PSQL_AVAILABLE=0
) else (
    for /f "tokens=*" %%i in ('psql --version') do echo    Found %%i
    set PSQL_AVAILABLE=1
)

REM Check Ollama (optional)
echo [4/7] Checking Ollama (optional)...
ollama --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo    Ollama not found - AI features will be disabled.
    echo    To enable AI: https://ollama.com/download
    set OLLAMA_AVAILABLE=0
) else (
    echo    Found Ollama - AI features available!
    set OLLAMA_AVAILABLE=1
)

REM Set up .env files
echo [5/7] Setting up environment files...
if not exist "KWise-Backend\.env" (
    copy "KWise-Backend\.env.example" "KWise-Backend\.env" >nul
    echo    Created KWise-Backend\.env from .env.example
    echo    IMPORTANT: Edit KWise-Backend\.env and set your DB_PASSWORD
    echo    and ask team lead for GMAIL credentials.
) else (
    echo    KWise-Backend\.env already exists - skipping
)

if not exist "K-Wise\.env" (
    copy "K-Wise\.env.example" "K-Wise\.env" >nul
    echo    Created K-Wise\.env from .env.example
) else (
    echo    K-Wise\.env already exists - skipping
)

REM Install dependencies
echo [6/7] Installing dependencies...
echo    Installing backend dependencies...
cd KWise-Backend
call npm install
echo    Backend dependencies installed.

echo    Installing frontend dependencies...
cd ..\K-Wise
call npm install
echo    Frontend dependencies installed.

cd ..

REM Run database setup (creates DB, imports schema, seeds all product data)
echo [7/7] Running database setup...
if "%PSQL_AVAILABLE%"=="1" (
    cd KWise-Backend
    echo    This will create the KWiseDB database, import the schema,
    echo    and seed all product catalog data (PC parts, users, settings, etc.)
    node scripts/setup/setup-database.js
    cd ..
    echo    Database setup complete.
) else (
    echo    SKIPPED: PostgreSQL CLI (psql) not available.
    echo    Install PostgreSQL and add psql to your PATH, then run:
    echo      cd KWise-Backend ^&^& node scripts/setup/setup-database.js
    echo.
    echo    This will create the database, schema, AND seed all product data.
    echo    You do NOT need a database dump from the team lead.
)

echo.
echo ========================================
echo    Setup Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Make sure PostgreSQL is running with the KWiseDB database
echo   2. Edit KWise-Backend\.env if needed (DB password, Gmail credentials)
echo   3. Start the backend:
if "%OLLAMA_AVAILABLE%"=="1" (
    echo      cd KWise-Backend ^&^& npm run dev
) else (
    echo      cd KWise-Backend ^&^& npm run dev:no-ollama
)
echo   4. Start the frontend (separate terminal):
echo      cd K-Wise ^&^& npm start
echo.
echo   Backend: http://localhost:5000/api/health
echo   Frontend: http://localhost:3000
echo.
echo See COLLABORATOR_SETUP.md for troubleshooting.
echo.
pause
