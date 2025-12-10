@echo off
echo Starting K-Wise Backend Server (consolidated server.js)...
start /B node server.js
echo Server started in background
echo Testing health endpoint in 5 seconds...
timeout /t 5 /nobreak > nul
curl -s http://localhost:5000/api/health
echo.
echo Server should be running on http://localhost:5000
pause
