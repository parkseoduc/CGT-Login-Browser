@echo off
title OmniBrowser Antidetect Hub - Desktop Launcher
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 goto :no_node

node desktop/launcher.js
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
echo [Info] Process stopped.
pause
exit /b 1
