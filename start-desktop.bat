@echo off
chcp 65001 >nul
title OmniBrowser Antidetect Hub - Desktop Launcher
cd /d "%~dp0"

echo ============================================================
echo   🚀 OmniBrowser Antidetect - Desktop Application Launcher
echo ============================================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [LỖI] Máy tính chưa cài đặt Node.js!
    echo Vui lòng tải và cài đặt Node.js v22 (LTS) tại: https://nodejs.org
    echo.
    pause
    exit /b 1
)

node desktop/launcher.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [Thông báo] Tiến trình đã dừng lại với mã: %ERRORLEVEL%
    pause
)
