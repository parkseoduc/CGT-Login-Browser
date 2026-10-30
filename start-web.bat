@echo off
title OmniBrowser Antidetect Hub - Web Server
cd /d "%~dp0"

:: 1. Kiem tra xem co dang chay truc tiep trong file nen WinRAR / 7-Zip khong
echo %CD% | findstr /i /c:"\AppData\Local\Temp" >nul
if not errorlevel 1 goto :in_temp
goto :find_node

:in_temp
echo ============================================================
echo  CANH BAO: BAN DANG CHAY TRUC TIEP TRONG WINRAR HOAC ZIP!
echo ============================================================
echo.
echo Vui long GIAI NEN toan bo thu muc ra Desktop hoac o dia truoc khi dung.
echo  - Buoc 1: Trong WinRAR, bam nut Extract To de giai nen.
echo  - Buoc 2: Chon thu muc luu vi du nhu Desktop hoac Downloads.
echo  - Buoc 3: Mo thu muc da giai nen va chay lai start-web.bat!
echo ============================================================
pause
exit /b 1

:find_node
:: 2. Tim kiem Node.js runtime (Uu tien bin\node\node.exe -> Node he thong)
set "NODE_EXE="
if exist "bin\node\node.exe" set "NODE_EXE=bin\node\node.exe"
if defined NODE_EXE goto :run_server

where node >nul 2>&1
if not errorlevel 1 (
    set "NODE_EXE=node"
    goto :run_server
)

:download_node
:: 3. Neu may trang chua co Node.js -> Tu dong tai Node Portable 1-Click
echo ============================================================
echo   OMNIBROWSER ANTIDETECT WORKSTATION - CAI DAT TU DONG
echo ============================================================
echo.
echo [Thong Bao] Phat hien may tinh moi chua co san Node.js Runtime.
echo [Dang Xu Ly] He thong dang tu dong tai Node.js Portable sieu nhe
echo               truc tiep ve thu muc bin\node\node.exe ...
echo.

if not exist "bin\node" mkdir "bin\node"

curl.exe -V >nul 2>&1
if not errorlevel 1 goto :download_curl
goto :download_ps

:download_curl
curl.exe -L -# -o "bin\node\node.exe" "https://nodejs.org/dist/v22.11.0/win-x64/node.exe"
goto :check_download_result

:download_ps
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://nodejs.org/dist/v22.11.0/win-x64/node.exe', 'bin\node\node.exe')"
goto :check_download_result

:check_download_result
if exist "bin\node\node.exe" (
    echo.
    echo [Thanh Cong] Da thiet lap Node.js Portable thanh cong!
    set "NODE_EXE=bin\node\node.exe"
    goto :run_server
) else (
    echo.
    echo [Loi] Khong the tu dong tai Node.js.
    echo Vui long kiem tra ket noi Internet hoac tai Node.js tu: https://nodejs.org
    pause
    exit /b 1
)

:run_server
echo ============================================================
echo  OMNIBROWSER ANTIDETECT WORKSTATION - RUNNING
echo  Dia chi: http://127.0.0.1:51888
echo ============================================================
echo.
start http://127.0.0.1:51888
"%NODE_EXE%" src/index.js
echo.
echo [OmniBrowser] May chu da dung. Nhan phim bat ky de khoi dong lai, hoac dong cua so nay.
pause
goto :run_server
