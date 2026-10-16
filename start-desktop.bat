@echo off
title OmniBrowser Antidetect Hub - Desktop Launcher
cd /d "%~dp0"

echo ============================================================
echo      OmniBrowser Antidetect Desktop Application
echo      Core Chromium: E:\Chromium_Workspace\src\out\Default\chrome.exe
echo      License Server: https://lic.cgtdev.space
echo ============================================================
echo.

set "ELECTRON_EXE=E:\License-CGT\windows-tool\node_modules\electron\dist\electron.exe"
set "ELECTRON_CLI=E:\License-CGT\windows-tool\node_modules\electron\cli.js"

if exist "%ELECTRON_EXE%" (
    echo [Launcher] Launching Desktop Window via Electron.exe...
    "%ELECTRON_EXE%" desktop/main.js
) else if exist "%ELECTRON_CLI%" (
    echo [Launcher] Launching Desktop Window via Electron CLI...
    node "%ELECTRON_CLI%" desktop/main.js
) else (
    echo [Launcher] Electron not found! Starting local server and opening browser...
    start http://127.0.0.1:51888
    node src/index.js
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [Thong bao] Tien trinh da dung lai voi ma loi: %ERRORLEVEL%
    pause
)
