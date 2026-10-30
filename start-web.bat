@echo off
title OmniBrowser Antidetect Hub - Web Server
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 goto :no_node

:run_server
echo [OmniBrowser] Starting web server on http://127.0.0.1:51888 ...
node src/index.js
echo.
echo [OmniBrowser] Web server stopped. Press any key to restart, or close this window.
pause
goto :run_server

:no_node
echo ============================================================
echo [ERROR] Node.js is not installed!
echo Please download and install Node.js LTS from https://nodejs.org
echo ============================================================
echo.
pause
exit /b 1
