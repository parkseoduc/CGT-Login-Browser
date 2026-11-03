@echo off
setlocal
echo ==========================================
echo   OmniBrowser - Windows Installer Builder
echo ==========================================

cd /d "%~dp0"

echo [1/3] Preparing clean database snapshot...
copy /y "data\antidetect.db" "installer\clean_antidetect.db" >nul

echo [2/3] Compiling OmniBrowser-Setup-v1.0.0.exe via Inno Setup...
if exist "%LocalAppData%\Programs\Inno Setup 6\ISCC.exe" (
    "%LocalAppData%\Programs\Inno Setup 6\ISCC.exe" "installer\installer.iss"
) else (
    ISCC.exe "installer\installer.iss"
)

echo [3/3] Cleaning temporary build assets...
if exist "installer\clean_antidetect.db" del /f /q "installer\clean_antidetect.db"

echo.
echo ==========================================
echo [SUCCESS] Windows Installer created at:
echo   releases\OmniBrowser-Setup-v1.0.0.exe
echo ==========================================
pause
