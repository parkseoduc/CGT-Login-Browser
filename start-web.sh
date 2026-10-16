#!/usr/bin/env bash
# OmniBrowser - Web Server Launcher for macOS / Linux
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "============================================================"
echo "  🚀 OmniBrowser Antidetect Hub - Web Interface Launcher"
echo "============================================================"
echo ""

if ! command -v node &> /dev/null; then
    echo "[LỖI] Chưa cài đặt Node.js trên máy!"
    echo "Vui lòng cài đặt Node.js v22+ từ https://nodejs.org"
    exit 1
fi

echo "[1/2] Đang kiểm tra nhân trình duyệt Chromium trên máy tính..."
node -e "const c = require('./src/config'); const k = c.getDefaultKernelPath(); if (!k) { console.warn('⚠️ Chưa phát hiện Chrome/Chromium. Vui lòng cài Google Chrome!'); } else { console.log('  -> Đã tìm thấy trình duyệt khả dụng:', k); }"
echo ""
echo "[2/2] Khởi chạy máy chủ tại http://127.0.0.1:51888 ..."

# Mở trình duyệt mặc định trên macOS hoặc Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "http://127.0.0.1:51888" &
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open "http://127.0.0.1:51888" &>/dev/null &
fi

node src/index.js
