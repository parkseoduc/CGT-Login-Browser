@echo off
chcp 65001 >nul
title Đẩy mã nguồn CGT-Browser-Profile lên GitLab
color 0b

echo =====================================================================
echo    OMNIBROWSER - TỰ ĐỘNG ĐẨY MÃ NGUỒN LÊN GITLAB (CGT MEDIA)
echo =====================================================================
echo.

cd /d "C:\Users\Admin\.gemini\antigravity\scratch\antidetect-manager"

echo [1/3] Đang kiểm tra trạng thái Git...
git status -s

echo.
echo [2/3] Đang cấu hình Remote GitLab...
git remote remove gitlab 2>nul
git remote add gitlab https://gitlab.com/cgtmedia-group/CGT-Browser-Profile.git

echo.
echo [3/3] Đang tiến hành đẩy mã nguồn lên nhánh main...
echo (Nếu cửa sổ GitLab hiện lên, vui lòng chọn Authorize / Sign In 1 lần duy nhất)
echo.

git push -u gitlab main

if %errorlevel% equ 0 (
    echo.
    echo =====================================================================
    echo  [THÀNH CÔNG] Đã đẩy toàn bộ dự án lên GitLab CGT Media thành công!
    echo =====================================================================
) else (
    echo.
    echo =====================================================================
    echo  [LƯU Ý] Nếu chưa đẩy được:
    echo  1. Đảm bảo bạn đã bấm nút "Create project" trên web tạo dự án "CGT-Browser-Profile".
    echo  2. Hoặc xác thực tài khoản GitLab khi cửa sổ hiện lên.
    echo =====================================================================
)

echo.
pause
