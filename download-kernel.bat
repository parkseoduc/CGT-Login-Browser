@echo off
chcp 65001 >nul
title OmniBrowser - Tải Nhân Chromium Core 153 (Custom Build)
cd /d "%~dp0"

echo ============================================================
echo   🚀 Tải Nhân Chromium Core 153 Custom Build (Antidetect)
echo ============================================================
echo.
echo Thư mục cài đặt đích: %~dp0bin\chromium\chrome.exe
echo Đường dẫn tải trực tiếp: https://gofile.io/d/VmyJsIUD
echo.

if not exist "%~dp0bin\chromium" (
    mkdir "%~dp0bin\chromium"
)

echo [1/2] Đang mở trang tải gói MyBrowser-153-win64.zip...
start https://gofile.io/d/VmyJsIUD

echo.
echo ============================================================
echo   HƯỚNG DẪN CÀI ĐẶT NHANH (Chỉ mất 30 giây):
echo ============================================================
echo 1. Tải file MyBrowser-153-win64.zip từ trang web vừa mở.
echo 2. Giải nén toàn bộ các file bên trong file zip vào thư mục:
echo    %~dp0bin\chromium\
echo.
echo 3. Sau khi giải nén, file chrome.exe sẽ nằm tại:
echo    %~dp0bin\chromium\chrome.exe
echo.
echo 4. Chạy lại start-web.bat hoặc start-desktop.bat:
echo    Hệ thống sẽ TỰ ĐỘNG nhận diện nhân "Portable Chromium 153"
echo    và kích hoạt toàn bộ cơ chế bypass Iphey của bạn!
echo ============================================================
echo.
pause
