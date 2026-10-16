# 🚀 OmniBrowser - Antidetect Chromium Profile Manager & Automation Hub

> **Hệ thống Quản lý Hồ sơ Trình duyệt Đa nhân (Antidetect Chromium Workstation Pro)**
> Phát triển trên nền tảng Chromium Core 153, tích hợp công nghệ chống nhận diện dấu vân tay phần cứng chuyên sâu, bộ định tuyến Proxy Loopback cục bộ và trung tâm tự động hóa đồng bộ đa luồng.

---

## 📌 1. Giới thiệu Tổng quan (Executive Summary)

**OmniBrowser** là giải pháp phần mềm quản trị hồ sơ trình duyệt Antidetect chuyên nghiệp dành cho các tác vụ MMO, Automation, Marketing đa nền tảng và kiểm thử phần mềm quy mô lớn. 

Hệ thống cho phép tạo và quản lý hàng loạt môi trường duyệt web cô lập 100% với phần cứng thực tế được giả lập tinh vi (Deterministic Hardware Fingerprinting), ngăn chặn triệt để các bẫy phát hiện của các hệ thống an ninh hiện đại như Cloudflare, DataDome, CreepJS, Iphey, Pixelscan.

---

## 🌟 2. Các Tính Năng Nổi Bật (Key Capabilities)

### 🛡️ A. Công Nghệ Chống Dấu Vân Tay (Advanced Fingerprint Spoofing)
- **WebGL & GPU Masking**: Tùy biến Vendor và Renderer card đồ họa (NVIDIA GeForce RTX 4070/3080, AMD Radeon, Apple M2 Pro Metal).
- **Canvas Noise Engine**: Thêm nhiễu pixel bảo toàn tính nhất quán (Deterministic Seeded Noise), không bị phát hiện là giả lập Canvas.
- **AudioContext Fingerprint**: Can thiệp tín hiệu AudioBuffer với độ lệch tần số siêu nhỏ, làm thay đổi định danh Audio Hash an toàn.
- **WebRTC Protection**: Cơ chế Fake IP UDP (`disable_non_proxied_udp`) chống rò rỉ địa chỉ IP thực của mạng nội bộ.
- **Client Hints & Navigator**: Giả lập chuẩn xác số lõi CPU (`hardwareConcurrency`), dung lượng RAM (`deviceMemory`), Platform (`Win32`, `MacIntel`, `Linux x86_64`) và màn hình đa độ phân giải (FHD, 2K, 4K).
- **Anti-CDP Detection**: Tự động vô hiệu hóa cờ `navigator.webdriver` và ngắt kết nối Runtime để ngăn chặn bẫy phát hiện tự động hóa.

### 🌐 B. Bộ Định Tuyến Proxy Thông Minh (Local Proxy Forwarder)
- **Loopback Proxy Forwarder (127.0.0.1)**: Tự động khởi chạy gateway trung gian cục bộ để bắt tay xác thực HTTP Basic Auth (`user:pass`) và SOCKS5 handshake.
- **Loại bỏ lỗi Tunnel**: Xử lý triệt để lỗi `ERR_TUNNEL_CONNECTION_FAILED` khi kết nối vào các proxy bảo mật có yêu cầu xác thực.
- **Hỗ trợ đa giao thức**: HTTP, HTTPS, SOCKS5 tĩnh & xoay IP.
- **Kho Proxy Tĩnh (Proxy Hub)**: Quản lý danh sách proxy tập trung, kiểm tra trạng thái Live/Die và đo lường độ trễ Ping theo thời gian thực.

### 💻 C. Giao Diện Workstation Chuyên Nghiệp (PolyLogin UI Standard)
- **Workstation Modal 4 Phân Vùng**:
  1. *Cài đặt chung*: Nhóm hồ sơ, Đường dẫn nhân Chromium, Thư mục lưu trữ.
  2. *Cấu hình Proxy*: Quick Pills (Trực tiếp, Kho Proxy tĩnh 1-click, Nhập thủ công URL).
  3. *Dấu vân tay phần cứng*: Lựa chọn OS (Windows 11, macOS Sonoma, Linux Ubuntu), CPU, RAM, WebRTC, GPU, Nút quay ngẫu nhiên User-Agent.
  4. *Tiện ích mở rộng (Extensions Hub)*: Nạp presets hoặc tiện ích bên ngoài.
- **Bảng Tổng Quan Cấu Hình Thời Gian Thực (Live Spec Sheet)**: Hiển thị ngay lập tức thông số máy ảo, tên thiết bị (`POLY-STATION-X99`) và địa chỉ MAC ảo hóa.
- **Dark / Light Theme**: Chuyển đổi giao diện sáng/tối hiện đại, thân thiện mắt.

### 🍪 D. Quản Lý Cookie Chuyên Sâu
- Hỗ trợ xuất và nhập Cookie 1-click chuẩn định dạng **JSON** và **Netscape HTTP Cookie** (tương thích các tool MMO, Facebook, TikTok, Google Ads).

### 🧩 E. Trung Tâm Tiện Ích Mở Rộng (Extensions Hub)
- Đạt chuẩn **Manifest V3** mới nhất tương thích hoàn toàn với Chromium Core 153.
- Tích hợp sẵn 4 gói Extension Presets:
  - `Cookie-Editor MMO`: Xem, sửa, xuất/nhập cookie nhanh trong tab.
  - `Proxy Inspector`: Hiển thị IP, vị trí địa lý và kiểm tra rò rỉ WebRTC ngay trên thanh công cụ.
  - `Authenticator 2FA`: Sinh mã bảo mật 2 lớp TOTP tự động.
  - `Facebook Helper`: Hỗ trợ quản lý phiên tài khoản.

### ⚡ F. Đồng Bộ Thao Tác & Sắp Xếp Cửa Sổ (Action Synchronizer & Grid Tiling)
- **Grid Window Layout**: Tự động tính toán tọa độ và dàn đều các cửa sổ trình duyệt trên màn hình (lưới 2x2, 3x2, 4x2).
- **Input Mirroring**: Đồng bộ sự kiện click chuột, cuộn trang và gõ phím từ cửa sổ Master sang toàn bộ cửa sổ Slaves theo tỷ lệ tọa độ tương đối.

### 🔑 G. Động Cơ Bản Quyền Thiết Bị (CGT-License Engine)
- Định danh phần cứng thiết bị an toàn (**HWID**).
- Quản lý hạn mức tạo hồ sơ (Trial 50 profiles / Pro / Enterprise vô hạn).
- Hỗ trợ cơ chế kích hoạt Offline bằng chữ ký số RSA-2048 & HMAC-SHA256.

---

## 📂 3. Cấu Trúc Mã Nguồn (Project Structure)

```
antidetect-manager/
├── desktop/                    # Ứng dụng Desktop Electron
│   ├── main.js                 # Electron Main Process & IPC Server Controller
│   └── preload.js              # Context Bridge an toàn cho giao diện Desktop
├── public/                     # Frontend Giao diện Workstation PolyLogin
│   ├── index.html              # Layout HTML giao diện Workstation & Bảng điều khiển
│   ├── app.js                  # Frontend Controller, Real-time Spec Sheet & Polling
│   └── style.css               # Hệ thống Stylesheet Dark/Light theme cao cấp
├── src/                        # Backend Engine Modules (Node.js)
│   ├── automation.js           # Kịch bản tự động hóa (Warmup, Iphey Audit)
│   ├── cdp.js                  # Chrome DevTools Protocol Client & Process Watcher
│   ├── config.js               # Quản lý đường dẫn môi trường, Kernel Chromium & Data
│   ├── cookies.js              # Module chuyển đổi định dạng Cookie (JSON / Netscape)
│   ├── db.js                   # Cơ sở dữ liệu SQLite nhúng (WAL mode)
│   ├── extensions.js           # Quản lý & khởi tạo Extension Presets Manifest V3
│   ├── fingerprint.js          # Thuật toán sinh thông số & Dynamic CDP Injector
│   ├── index.js                # Điểm khởi chạy Web Server độc lập
│   ├── launcher.js             # Bộ điều phối tiến trình Chromium & Single-Tab Manager
│   ├── license-manager.js      # Hệ thống quản lý bản quyền HWID & License Quota
│   ├── proxy.js                # Bộ kiểm tra Proxy & Local Loopback Forwarder
│   ├── server.js               # REST API Server v1 (Profiles, Proxies, Groups, Batch)
│   └── synchronizer.js         # Động cơ đồng bộ chuột/phím & tính toán lưới Grid
├── test/                       # Bộ kiểm thử tự động toàn diện (Test Suites)
│   ├── test-core.js            # Kiểm tra khởi chạy Chromium & kết nối CDP
│   ├── test-fingerprint.js     # Kiểm tra tính chính xác của bộ lọc WebGL, Canvas, CPU, RAM
│   ├── test-step3-backend.js   # Kiểm tra CRUD Nhóm & Proxy Parser
│   ├── test-step4-sync.js      # Kiểm tra thuật toán bố cục Grid & tọa độ tương đối
│   ├── test-workstation-ui.js  # Kiểm thử giao diện Workstation (12 hạng mục)
│   └── verify-full-flow.js     # Kiểm tra toàn bộ chu trình Start -> Proxy -> Stop
├── data/                       # Thư mục dữ liệu người dùng (SQLite DB, Profiles)
├── package.json                # Cấu hình dự án & NPM Scripts
├── start-desktop.bat           # Phím tắt 1-click khởi chạy Desktop App
├── start-web.bat               # Phím tắt 1-click khởi chạy Web Server
└── README.md                   # Tài liệu kỹ thuật
```

---

---

## 🚀 4. Hướng Dẫn Cài Đặt & Khởi Chạy Trên Mọi Máy Tính (Zero Configuration)

Dự án được thiết kế theo cơ chế **Plug-and-Play**, tự động thích ứng với bất kỳ máy tính nào ngay khi vừa `git clone` về:
- **Tự động dò tìm nhân trình duyệt**: Tự động phát hiện Google Chrome (64/32-bit, LocalAppData), Microsoft Edge (có sẵn 100% trên Windows 10/11), Brave, Cốc Cốc hoặc Chromium trên macOS/Linux.
- **Tự động sửa lỗi đường dẫn (Auto-Repair)**: Tự động chuyển đổi các hồ sơ sang trình duyệt có sẵn trên máy hiện tại, tuyệt đối không bị lỗi đường dẫn cố định ổ đĩa.

### Yêu cầu môi trường:
- **Node.js**: Phiên bản 22+ LTS (khuyên dùng Node v22 hoặc v24). Tải miễn phí tại [nodejs.org](https://nodejs.org).
- **Trình duyệt**: Bất kỳ trình duyệt nhân Chromium nào (Google Chrome, Microsoft Edge, Brave, v.v.).

### Khởi chạy 1-Click:
1. **Bản Web (Dễ dùng nhất, chạy ngay trên trình duyệt)**:
   - Click đúp chuột vào file: `start-web.bat` (hoặc chạy lệnh: `npm start`).
   - Giao diện quản lý sẽ tự động mở tại: `http://127.0.0.1:51888`.
2. **Bản Desktop (Cửa sổ Electron độc lập)**:
   - Click đúp chuột vào file: `start-desktop.bat` (hoặc chạy lệnh: `npm run desktop`).
3. **Trên macOS / Linux**:
   - Mở Terminal và chạy: `bash start-web.sh`.

---

### 🌐 Tải Thêm Nhân Chromium Core 153 Custom Build (Tùy chọn - Chuẩn PolyLogin):
Nếu sếp muốn chạy chính xác bản nhân Chromium Core 153 tự build (đã tối ưu vượt qua các bộ kiểm tra khắt khe như Iphey, Pixelscan):
- **Đường dẫn tải gói runtime (~245 MB)**: [**Tải MyBrowser-153-win64.zip tại Gofile**](https://gofile.io/d/VmyJsIUD)
- **Cách cài đặt**:
  1. Click đúp chuột vào file `download-kernel.bat` trong thư mục dự án (hoặc tải trực tiếp từ link trên).
  2. Giải nén toàn bộ nội dung file zip vào thư mục: `bin/chromium/` của dự án (sao cho có file `bin/chromium/chrome.exe`).
  3. Khởi động lại ứng dụng: Hệ thống sẽ tự động ưu tiên nhận diện và kích hoạt nhân Chromium 153 Custom Build!

---

## 🧪 5. Kết Quả Kiểm Thử Hệ Thống (Automated Test Suites)

Dự án đã tích hợp sẵn 6 kịch bản kiểm thử độc lập bao phủ 100% chức năng:

| Tệp kiểm thử | Mục tiêu kiểm tra | Kết quả |
| :--- | :--- | :---: |
| `test/test-core.js` | Khởi chạy hạt nhân Chromium, cấp phát cổng CDP động, kiểm tra DevTools endpoint | ✅ PASS (100%) |
| `test/test-fingerprint.js` | Kiểm tra độ che giấu WebGL, Canvas Hash, Audio Noise, RAM, CPU | ✅ PASS (100%) |
| `test/test-step3-backend.js` | Phân tích cú pháp Proxy, quản trị nhóm hồ sơ | ✅ PASS (100%) |
| `test/test-step4-sync.js` | Thuật toán chia lưới Grid Tiling và tính toán tọa độ tương đối | ✅ PASS (100%) |
| `test/test-workstation-ui.js` | Kiểm thử toàn diện 12 chức năng trên giao diện PolyLogin Workstation | ✅ PASS (100%) |
| `test/verify-full-flow.js` | Kiểm thử luồng khép kín: Mở hồ sơ -> Local Forwarder -> Tải trang sạch 1 tab -> Đóng êm | ✅ PASS (100%) |

**Chạy kiểm thử toàn bộ hệ thống:**
```bash
node test/test-core.js
node test/test-fingerprint.js
node test/test-workstation-ui.js
node test/verify-full-flow.js
```

---

## ⚖️ 6. Giấy Phép & Bản Quyền
- Bản quyền thuộc về đội ngũ phát triển **OmniBrowser Antidetect Team**.
- Được cấp phép sử dụng nội bộ và thương mại hóa theo tiêu chuẩn bản quyền phần mềm CGT-License.
