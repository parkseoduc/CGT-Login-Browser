@echo off
chcp 65001 >nul
title OmniBrowser Antidetect Hub - Desktop Launcher
cd /d "%~dp0"

echo ============================================================
echo   🚀 OmniBrowser Antidetect - Desktop Application
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

set "LOCAL_ELECTRON=%~dp0node_modules\electron\dist\electron.exe"
set "LOCAL_ELECTRON_CLI=%~dp0node_modules\electron\cli.js"

if exist "%LOCAL_ELECTRON%" (
    echo [Launcher] Khởi chạy cửa sổ Desktop qua Electron...
    "%LOCAL_ELECTRON%" desktop/main.js
) else if exist "%LOCAL_ELECTRON_CLI%" (
    echo [Launcher] Khởi chạy cửa sổ Desktop qua Electron CLI...
    node "%LOCAL_ELECTRON_CLI%" desktop/main.js
) else (
    echo [Launcher] Đang thử khởi chạy qua npx electron...
    call npx electron desktop/main.js 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo [Launcher] Không tìm thấy Electron desktop. Tự động mở Bản Web...
        start http://127.0.0.1:51888
        node src/index.js
    )
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [Thong bao] Tien trinh da dung lai voi ma loi: %ERRORLEVEL%
    pause
)
