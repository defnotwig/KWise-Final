@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "UV_LINK_MODE=copy"

set "CODEX_LB_URL=http://127.0.0.1:2455"
set "REPO_DIR="
set "CODEX_EXE="
set "OPEN_CODEX=1"

if /I "%~1"=="--no-open" set "OPEN_CODEX=0"

call :resolve_repo "%~dp0"
if not defined REPO_DIR call :resolve_repo "%USERPROFILE%\Downloads\K-Wise Final 2\codex-lb"
if not defined REPO_DIR call :resolve_repo "%USERPROFILE%\OneDrive\Documents\Documents\Codex\2026-05-28\soju06-codex-lb-https-github-com"
if not defined REPO_DIR call :resolve_repo "%USERPROFILE%\Documents\Codex\2026-05-28\soju06-codex-lb-https-github-com"
if not defined REPO_DIR call :resolve_repo "%USERPROFILE%\Documents\Codex\2026-06-02\soju06-codex-lb-https-github-com"

if not defined REPO_DIR (
  echo Could not find the Codex-LB repo.
  echo Checked common locations under Documents, OneDrive, and Downloads.
  pause
  exit /b 1
)

call :resolve_codex

cd /d "%REPO_DIR%" || (
  echo Could not open Codex-LB repo: "%REPO_DIR%"
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { $r = Invoke-WebRequest -UseBasicParsing '%CODEX_LB_URL%/health' -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } } catch { exit 1 }"

if errorlevel 1 (
  echo Starting Codex-LB on %CODEX_LB_URL% ...
  start "Codex-LB Server" /min cmd /k "cd /d ""%REPO_DIR%"" && uv run python -m app.cli --host 127.0.0.1 --port 2455"
) else (
  echo Codex-LB is already running.
)

echo Waiting for Codex-LB health check...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$deadline = (Get-Date).AddSeconds(45); do { try { $r = Invoke-WebRequest -UseBasicParsing '%CODEX_LB_URL%/health' -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; Start-Sleep -Seconds 1 } while ((Get-Date) -lt $deadline); exit 1"

if errorlevel 1 (
  echo Codex-LB did not become healthy at %CODEX_LB_URL%/health.
  echo Check the Codex-LB Server window for startup errors.
  pause
  exit /b 1
)

echo Codex-LB is running from: %REPO_DIR%

if "%OPEN_CODEX%"=="0" (
  echo Skipping Codex launch because --no-open was provided.
  endlocal
  exit /b 0
)

echo Opening Codex...
if defined CODEX_EXE (
  start "" "%CODEX_EXE%" app
) else (
  start "" codex app
)

endlocal
exit /b 0

:resolve_repo
set "CANDIDATE=%~1"
if not defined CANDIDATE exit /b 0
if exist "%CANDIDATE%\app\cli.py" if exist "%CANDIDATE%\pyproject.toml" set "REPO_DIR=%CANDIDATE%"
exit /b 0

:resolve_codex
for /f "delims=" %%I in ('dir /b /s /a:-d "%LOCALAPPDATA%\OpenAI\Codex\bin\*\codex.exe" 2^>nul') do (
  set "CODEX_EXE=%%~fI"
)
if not defined CODEX_EXE if exist "%LOCALAPPDATA%\Programs\Codex\Codex.exe" set "CODEX_EXE=%LOCALAPPDATA%\Programs\Codex\Codex.exe"
exit /b 0
