@echo off
title OmniBrowser Antidetect Hub - Web Server
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 goto :no_node

start http://127.0.0.1:51888
node src/index.js
if errorlevel 1 goto :error_exit
exit /b 0

:no_node
echo ============================================================
echo [ERROR] Node.js is not installed!
echo Please download and install Node.js LTS from https://nodejs.org
echo ============================================================
echo.
pause
exit /b 1

:error_exit
echo.
echo [Info] Web server stopped.
pause
exit /b 1
