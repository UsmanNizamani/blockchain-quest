@echo off
cd /d "%~dp0"
title Blockchain Quest
color 0A

echo.
echo ===============================================
echo  BLOCKCHAIN QUEST ^| Launching...
echo ===============================================
echo.

:: 1. Check Node.js
where node >nul 2>&1
if %errorlevel% equ 0 goto :node_ok

color 0C
echo [ERROR] Node.js not found.
echo.
echo Blockchain Quest needs Node.js (one-time setup, ~30 seconds):
echo  1. Download from https://nodejs.org
echo  2. Install with defaults
echo  3. Close this window and run this file again
echo.
choice /C YN /M "Open the Node.js download page now"
if not errorlevel 2 start "" "https://nodejs.org/en/download"
pause
exit /b 1

:node_ok

:: 2. Free port 3000
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000 "') do (
    taskkill /PID %%a /F >nul 2>&1
)
ping 127.0.0.1 -n 2 >nul

:: 3. Clean previous log and start server in background (minimized)
if exist .server.log del /f /q .server.log >nul 2>&1
echo ^> Starting server at http://localhost:3000 ...
start "Blockchain Quest Server" /MIN cmd /c "node server.js > .server.log 2>&1"

:: 4. Poll until the server responds (max 10 seconds)
echo ^> Waiting for server to be ready...
setlocal enabledelayedexpansion
set READY=0
for /l %%i in (1,1,20) do (
    if !READY!==0 (
        ping 127.0.0.1 -n 2 >nul
        powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri 'http://127.0.0.1:3000' -UseBasicParsing -TimeoutSec 1) | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
        if !errorlevel!==0 set READY=1
    )
)

if !READY!==1 (
    echo ^> Server ready. Opening browser...
    start "" "http://localhost:3000"
    echo.
    echo ===============================================
    echo  Game is live at http://localhost:3000
    echo  Server is running in a minimized window.
    echo  To stop: close the "Blockchain Quest Server" window
    echo  or run: taskkill /IM node.exe /F
    echo ===============================================
    echo.
    pause
) else (
    color 0C
    echo.
    echo [ERROR] Server did not start within 10 seconds.
    if exist .server.log (
        echo.
        echo ---------------- Server Output Log ----------------
        type .server.log
        echo ---------------------------------------------------
    )
    echo.
    echo To diagnose and run manually, open Command Prompt and execute:
    echo   cd /d "%~dp0" ^&^& node server.js
    echo.
    pause
    exit /b 1
)
endlocal