@echo off
setlocal enabledelayedexpansion
title OmniBrowser Antidetect Hub - Web Server
cd /d "%~dp0"

:: 1. Kiem tra xem co dang chay truc tiep trong file nen WinRAR / 7-Zip khong
echo %CD% | findstr /i /c:"\AppData\Local\Temp" >nul
if not errorlevel 1 (
    echo ============================================================
    echo  CANH BAO: BAN DANG CHAY TRUC TIEP TRONG WINRAR / ZIP!
    echo ============================================================
    echo.
    echo Vui long GIAI NEN toan bo thu muc ra Desktop hoac o dia!
    echo.
    echo Cac buoc thuc hien:
    echo  1. Trong WinRAR, bam nut 'Extract To' (Giai nen toi...)
    echo  2. Chon vi tri luu (vi du: Desktop hoac Downloads)
    echo  3. Mo thu muc da giai nen va chay lai start-web.bat!
    echo.
    echo ============================================================
    pause
    exit /b 1
)

:: 2. Tim kiem Node.js runtime (Uu tien bin\node\node.exe -> Node he thong)
set "NODE_EXE="
if exist "bin\node\node.exe" (
    set "NODE_EXE=bin\node\node.exe"
) else (
    where node >nul 2>&1
    if not errorlevel 1 (
        set "NODE_EXE=node"
    )
)

:: 3. Neu may trang chua co Node.js -> Tu dong tai Node Portable 1-Click
if "%NODE_EXE%"=="" (
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
    if not errorlevel 1 (
        curl.exe -L -# -o "bin\node\node.exe" "https://nodejs.org/dist/v22.11.0/win-x64/node.exe"
    ) else (
        powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Write-Host 'Dang tai node.exe portable...'; (New-Object System.Net.WebClient).DownloadFile('https://nodejs.org/dist/v22.11.0/win-x64/node.exe', 'bin\node\node.exe')"
    )
    
    if exist "bin\node\node.exe" (
        echo.
        echo [Thanh Cong] Da thiet lap Node.js Portable thanh cong!
        set "NODE_EXE=bin\node\node.exe"
    ) else (
        echo.
        echo [Loi] Khong the tu dong tai Node.js.
        echo Vui long ket noi Internet hoac tai Node.js tu: https://nodejs.org
        pause
        exit /b 1
    )
)

:run_server
echo ============================================================
echo  OMNIBROWSER ANTIDETECT WORKSTATION - RUNNING
echo  Dia chi: http://127.0.0.1:51888
echo ============================================================
echo.
:: Tu dong mo trinh duyet mac dinh vao giao dien web
start http://127.0.0.1:51888
"%NODE_EXE%" src/index.js
echo.
echo [OmniBrowser] May chu da dung. Nhan phim bat ky de khoi dong lai, hoac dong cua so nay.
pause
goto :run_server
