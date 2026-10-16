@echo off
chcp 65001 >nul
title OmniBrowser - Web Server Launcher
cd /d "%~dp0"
echo ============================================================
echo   🚀 OmniBrowser Antidetect Hub - Web Interface Launcher
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

echo [1/2] Đang kiểm tra nhân trình duyệt Chromium trên máy tính...
node -e "const c = require('./src/config'); const k = c.getDefaultKernelPath(); if (!k) { console.warn('⚠️ Chưa phát hiện Chrome/Edge. Vui lòng cài Google Chrome hoặc Microsoft Edge!'); } else { console.log('  -> Đã tìm thấy trình duyệt khả dụng:', k); }"
echo.
echo [2/2] Khởi chạy máy chủ tại http://127.0.0.1:51888 ...
start http://127.0.0.1:51888
node src/index.js
pause
