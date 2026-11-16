@echo off
chcp 65001 >nul
title CGT-Login Antidetect Profile Manager - Khởi Động
cd /d "%~dp0"

:: 1. Kiểm tra xem có đang chạy trực tiếp từ WinRAR / 7-Zip không
echo %CD% | findstr /i /c:"\AppData\Local\Temp" >nul
if not errorlevel 1 goto :in_temp
goto :find_node

:in_temp
echo ============================================================
echo  ⚠️ CẢNH BÁO: BẠN ĐANG CHẠY TRỰC TIẾP TRONG FILE NÉN ZIP!
echo ============================================================
echo.
echo Vui lòng GIẢI NÉN toàn bộ thư mục ra ổ đĩa (Desktop/Ổ D/Ổ E) trước khi dùng.
echo  - Bước 1: Chuột phải vào file zip, chọn "Extract All" (Giải nén toàn bộ).
echo  - Bước 2: Mở thư mục vừa giải nén.
echo  - Bước 3: Chạy lại file Khoi_Dong_CGT_Login.bat!
echo ============================================================
pause
exit /b 1

:find_node
:: 2. Tìm kiếm Node.js runtime (Ưu tiên bin\node\node.exe -> Node hệ thống)
set "NODE_EXE="
if exist "bin\node\node.exe" set "NODE_EXE=bin\node\node.exe"
if defined NODE_EXE goto :run_app

where node >nul 2>&1
if not errorlevel 1 (
    set "NODE_EXE=node"
    goto :run_app
)

:download_node
:: 3. Tự động tải Node portable nếu máy mới chưa có
echo ============================================================
echo   CGT-LOGIN WORKSTATION - CÀI ĐẶT MÔI TRƯỜNG TỰ ĐỘNG
echo ============================================================
echo [Thông Báo] Phát hiện máy chưa có Node.js Runtime.
echo [Đang Xử Lý] Đang tải tự động Node.js Portable siêu nhẹ về bin\node\node.exe ...
if not exist "bin\node" mkdir "bin\node"

curl.exe -V >nul 2>&1
if not errorlevel 1 (
    curl.exe -L -# -o "bin\node\node.exe" "https://nodejs.org/dist/v22.11.0/win-x64/node.exe"
    goto :check_result
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://nodejs.org/dist/v22.11.0/win-x64/node.exe', 'bin\node\node.exe')"

:check_result
if exist "bin\node\node.exe" (
    echo [Thành Công] Đã thiết lập Node.js Runtime thành công!
    set "NODE_EXE=bin\node\node.exe"
    goto :run_app
) else (
    echo [Lỗi] Không thể tải Node.js. Vui lòng cài Node.js từ https://nodejs.org
    pause
    exit /b 1
)

:run_app
:: 4. Cấp quyền Low Integrity Sandbox cho bin\chromium để chống STATUS_BREAKPOINT
if exist "bin\chromium" (
    icacls "bin\chromium" /grant "*S-1-15-2-1:(OI)(CI)(RX)" /grant "Users:(OI)(CI)(RX)" /T /Q >nul 2>&1
)

echo [CGT-Login] Đang khởi chạy hệ thống CGT-Login...
"%NODE_EXE%" --experimental-sqlite desktop/launcher.js
if errorlevel 1 goto :error_exit
exit /b 0

:error_exit
echo.
echo [Thông Báo] Tiến trình đã dừng. Nhấn phím bất kỳ để thoát.
pause
exit /b 1
