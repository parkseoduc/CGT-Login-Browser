@echo off
title OmniBrowser - 1-Click Auto Updater
cd /d "%~dp0"

echo ============================================================
echo   OMNIBROWSER ANTIDETECT - DONG BO CAP NHAT 1-CLICK
echo ============================================================
echo.
echo [1/3] Dang tat cac tien trinh cu dang chay de giai phong bo nho...
taskkill /F /IM node.exe >nul 2>&1

echo [2/3] Dang tai ban cap nhat moi nhat tu GitHub...
curl.exe -L -# -o update_tmp.zip "https://github.com/parkseoduc/CGT-Login-Browser/archive/refs/heads/main.zip"

if not exist update_tmp.zip (
    echo [Loi] Khong the tai ban cap nhat. Vui long kiem tra ket noi mang.
    pause
    exit /b 1
)

echo [3/3] Dang giai nen va dong bo file ma nguon moi...
tar.exe -xf update_tmp.zip
xcopy /E /Y "CGT-Login-Browser-main\*" "." >nul
rd /s /q "CGT-Login-Browser-main" >nul 2>&1
del update_tmp.zip >nul 2>&1

:: Tu dong cap quyen Sandbox cho bin\chromium
if exist "bin\chromium" (
    icacls "bin\chromium" /grant "*S-1-15-2-1:(OI)(CI)(RX)" /grant "Users:(OI)(CI)(RX)" /T /Q >nul 2>&1
)

echo.
echo ============================================================
echo   [THANH CONG] DA CAP NHAT BAN MOI NHAT THANH CONG!
echo ============================================================
echo.
echo He thong da san sang. Ban co the chay lai start-desktop.bat ngay bay gio.
echo.
pause
