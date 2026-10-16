@echo off
title OmniBrowser - Web Server Launcher
cd /d "%~dp0"
echo ============================================================
echo   OmniBrowser Antidetect Hub - Web Interface Launcher
echo ============================================================
echo.
echo Starting backend server on http://127.0.0.1:51888 ...
start http://127.0.0.1:51888
node src/index.js
pause
