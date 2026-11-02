@echo off
setlocal
cd /d "%~dp0"

echo ================================================================
echo Starting Bengaluru OTP Integrated System (Backend + Frontend)
echo ================================================================

echo Starting Backend on http://localhost:8080 ...
start "OTP-Backend-8080" cmd /c "bengaluru\run-bengaluru.cmd"

echo Starting Frontend on http://localhost:5173 ...
cd client
start "OTP-Frontend-5173" cmd /c "npx vite --host 0.0.0.0 --port 5173"

echo.
echo Both servers are launching in background windows.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8080
echo ================================================================

