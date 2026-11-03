@echo off
title OmniBrowser - Dong Goi Ban App Phat Hanh (Release Packager)
cd /d "%~dp0"

echo ================================================================================
echo   OMNIBROWSER ANTIDETECT WORKSTATION - DONG GOI UNG DUNG PORTABLE (WINDOWS)
echo ================================================================================
echo.

:: 1. Kiem tra va bien dich OmniBrowser.exe
echo [1/4] Bien dich OmniBrowser.exe voi icon chinh hang va giao dien khong hien CMD...
if not exist "app.ico" (
    echo [Loi] Khong tim thay app.ico!
    pause
    exit /b 1
)

"C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo /target:winexe /win32icon:app.ico /r:System.Windows.Forms.dll /r:System.Drawing.dll /out:OmniBrowser.exe "src\app-launcher.cs"
if errorlevel 1 (
    echo [Loi] Khong the bien dich OmniBrowser.exe!
    pause
    exit /b 1
)
echo [Thanh Cong] Da bien dich xong OmniBrowser.exe (GUI Launcher)!
echo.

:: 2. Dam bao runtime bin\node\node.exe
echo [2/4] Kiem tra Node.js Portable Runtime...
if not exist "bin\node\node.exe" (
    if exist "C:\Program Files\nodejs\node.exe" (
        copy /y "C:\Program Files\nodejs\node.exe" "bin\node\node.exe" >nul
        echo [Thanh Cong] Da sao chep node.exe vao bin\node\node.exe!
    ) else (
        echo [Luu Y] May khach chua co node.exe san, bo cai se tu dong tai khi chay start-desktop.bat.
    )
) else (
    echo [OK] Runtime bin\node\node.exe da san sang!
)
echo.

:: 3. Tao thu muc releases
echo [3/4] Chuan bi goi phat hanh thu muc releases...
if not exist "releases" mkdir "releases"

echo [Dang Dong Goi] Dang tao file zip: releases\OmniBrowser-v1.0.0-Portable-x64.zip ...
powershell -NoProfile -ExecutionPolicy Bypass -Command @"
`$sourceDir = Get-Location
`$zipPath = Join-Path `$sourceDir 'releases\OmniBrowser-v1.0.0-Portable-x64.zip'
if (Test-Path `$zipPath) { Remove-Item `$zipPath -Force }

`$tempDir = Join-Path `$sourceDir 'releases\temp_package'
if (Test-Path `$tempDir) { Remove-Item `$tempDir -Recurse -Force }
New-Item -ItemType Directory -Path `$tempDir | Out-Null

Write-Host 'Dang copy cac file can thiet vao thu muc dong goi...'
Copy-Item 'OmniBrowser.exe' `$tempDir
Copy-Item 'start-desktop.bat' `$tempDir
Copy-Item 'start-web.bat' `$tempDir
Copy-Item 'download-kernel.bat' `$tempDir
Copy-Item 'HUONG-DAN-SU-DUNG.txt' `$tempDir
Copy-Item 'app.ico' `$tempDir
Copy-Item 'package.json' `$tempDir
Copy-Item 'package-lock.json' `$tempDir -ErrorAction SilentlyContinue

Copy-Item 'public' `$tempDir -Recurse
Copy-Item 'src' `$tempDir -Recurse
Copy-Item 'desktop' `$tempDir -Recurse

# Data structure (excluding individual profile caches)
New-Item -ItemType Directory -Path (Join-Path `$tempDir 'data') | Out-Null
New-Item -ItemType Directory -Path (Join-Path `$tempDir 'data\profiles') | Out-Null
Copy-Item 'data\extensions' (Join-Path `$tempDir 'data') -Recurse
if (Test-Path 'data\antidetect.db') {
    Copy-Item 'data\antidetect.db' (Join-Path `$tempDir 'data\antidetect.db')
}

# Bin folder (node + chromium)
New-Item -ItemType Directory -Path (Join-Path `$tempDir 'bin') | Out-Null
if (Test-Path 'bin\node') { Copy-Item 'bin\node' (Join-Path `$tempDir 'bin') -Recurse }
if (Test-Path 'bin\chromium') { Copy-Item 'bin\chromium' (Join-Path `$tempDir 'bin') -Recurse }

Write-Host 'Dang nen file zip (qua trinh nay co the mat 1-2 phut tuy toc do o dia)...'
[System.IO.Compression.ZipFile]::CreateFromDirectory(`$tempDir, `$zipPath, [System.IO.Compression.CompressionLevel]::Optimal, `$false)

Remove-Item `$tempDir -Recurse -Force
Write-Host 'Tao file zip thanh cong!'
"@

echo.
echo ================================================================================
echo   HOAN TAT DONG GOI BAN APP!
echo   File nen Portable da san sang tai:
echo   👉 releases\OmniBrowser-v1.0.0-Portable-x64.zip
echo ================================================================================
echo.
pause
