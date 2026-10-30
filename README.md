# 🚀 OmniBrowser - Antidetect Chromium Profile Manager & Automation Hub

> **Hệ thống Quản lý Hồ sơ Trình duyệt Đa nhân (Antidetect Chromium Workstation Pro)**
> Phát triển trên nền tảng Chromium Core 153, tích hợp công nghệ chống nhận diện dấu vân tay phần cứng chuyên sâu, bộ định tuyến Proxy Loopback cục bộ và trung tâm tự động hóa đồng bộ đa luồng.

---

## 📌 1. Giới thiệu Tổng quan (Executive Summary)

**OmniBrowser** là giải pháp phần mềm quản trị hồ sơ trình duyệt Antidetect chuyên nghiệp dành cho các tác vụ MMO, Automation, Marketing đa nền tảng và kiểm thử phần mềm quy mô lớn. 

Hệ thống cho phép tạo và quản lý hàng loạt môi trường duyệt web cô lập 100% với phần cứng thực tế được giả lập tinh vi (Deterministic Hardware Fingerprinting), ngăn chặn triệt để các bẫy phát hiện của các hệ thống an ninh hiện đại như Cloudflare, DataDome, CreepJS, Iphey, Pixelscan.

---

## 🆕 2. Nhật Ký Cập Nhật Mới Nhất (Changelog & Release Notes)

### 🌟 Bản Cập Nhật v2.0 - Pure Clean Kernel & Multi-Window Action Synchronizer

> **Mục tiêu phiên bản:** Đưa nhân trình duyệt về chuẩn **Chromium sạch nguyên bản 100% (Pure Native Mode)**, loại bỏ triệt để các can thiệp JavaScript nhân tạo gây xung đột truyền tải đa phương tiện; đồng thời bổ sung **bộ đồng bộ hành động đa luồng (Action Synchronizer)** và **trình dàn xếp cửa sổ tự động (Auto Window Tiler)**.

---

#### 🔧 A. CÁC NỘI DUNG ĐÃ UPDATE & FIX LỖI (Updates & Bug Fixes)

1. **Khôi Phục Nhân Chromium Thuần (Pure Clean Native Mode):**
   * **Gỡ bỏ 100% mã tiêm JS qua CDP (`Page.addScriptToEvaluateOnNewDocument`):** Đã xóa bỏ toàn bộ hơn 400 dòng can thiệp monkey-patching (`Function.prototype.toString`, `window.Blob`, `Worker`, `Canvas`, `WebGL`, `WebAudio`).
   * **Fix dứt điểm lỗi YouTube dừng/đơ ở giây 41 (`errorCode: "ump.spsrejectfailure"`):** Cơ chế giải mã Unified Media Pipeline (UMP) của Google YouTube trước đây phát hiện sự can thiệp sai lệch vào `Blob`/`Worker` dẫn đến ngắt luồng video. Sau khi dọn sạch, video YouTube chạy mượt mà liên tục, không còn bất kỳ lỗi nào.
   * Bản build Chromium C++ tự build (`MyBrowser 153`) xử lý chống nhận diện trực tiếp từ mã nguồn lõi C++ (Blink engine), vượt qua bài test **Iphey (Pass 100%)** hoàn toàn tự nhiên mà không cần tiêm runtime.

2. **Tối Giản Danh Sách Cờ Khởi Động (Command-line Flags Optimization):**
   * Loại bỏ hơn 25 cờ can thiệp sâu không cần thiết gây treo hoặc giảm tính ổn định (`--disable-features=OptimizationGuide...`, `--disable-renderer-backgrounding`, `--disable-hang-monitor`, `--disable-sync`, v.v.).
   * **Bổ sung cờ `--test-type`:** Ẩn vĩnh viễn thanh cảnh báo màu vàng khó chịu trên đầu trình duyệt (*"Bạn đang sử dụng một cờ dòng lệnh không được hỗ trợ: --no-sandbox"*).

3. **Native Desktop Window Spawner (Hiển Thị Cửa Sổ Trực Tiếp):**
   * Tích hợp bộ nạp native [`bin/spawn-desktop.exe`](bin/spawn-desktop.exe) (kèm mã nguồn C# [`bin/spawn-desktop.cs`](bin/spawn-desktop.cs)) sử dụng Win32 API `CreateProcess` chỉ định thẳng `lpDesktop = @"WinSta0\Default"`.
   * Khắc phục triệt để hiện tượng trình duyệt mở thành công nhưng bị ẩn ngầm dưới hệ thống khi khởi chạy từ terminal/tiến trình nền.

4. **Làm Sạch Tiện Ích Mở Rộng Mặc Định (Clean Default Extensions):**
   * Thiết lập `is_global = 0` cho toàn bộ các extension preset trong cơ sở dữ liệu (`fb-helper`, `proxy-inspector`, `authenticator-2fa`).
   * Profile mới tạo khi mở lên sẽ hoàn toàn sạch sẽ, không bị tự động chèn extension ngoài ý muốn.

5. **Chuẩn Hóa Gói Nhân Tải Về:**
   * Gói nén [`MyBrowser-153-win64.zip`](../MyBrowser-153-win64.zip) được đóng gói đồng nhất từ bản build gốc sạch `E:\Chromium_Workspace\src\out\Default\chrome.exe` (mã kiểm tra SHA-256 đối khớp 100%).

---

#### 🚀 B. CÁC TÍNH NĂNG MỚI ĐÃ ĐƯỢC THÊM VÀO (New Features Added)

1. **Action Synchronizer (Bộ Đồng Bộ Hành Động Đa Luồng):**
   * Cho phép chọn 1 cửa sổ làm **Master** và nhiều cửa sổ làm **Slaves**.
   * Toàn bộ thao tác người dùng trên Master gồm: **Click chuột, Di chuyển chuột, Cuộn trang (Scroll Wheel), Nhập bàn phím (Keydown/Keyup/Input)** được bắt thông qua script tối ưu và phát lại ngay lập tức sang các Slaves qua Chrome DevTools Protocol (`Input.dispatchMouseEvent`, `Input.dispatchKeyEvent`).
   * **Hỗ trợ tọa độ tương đối (Viewport-Relative Coordinates):** Tự động quy đổi tọa độ click/scroll theo tỷ lệ phần trăm khung hình, đảm bảo đồng bộ chuẩn xác ngay cả khi các cửa sổ có kích thước khác nhau.

2. **Auto Window Tiler (Tự Động Chia Lưới & Căn Chỉnh Cửa Sổ):**
   * Module [`src/sync/window-tiler.js`](src/sync/window-tiler.js) tự động phát hiện độ phân giải màn hình làm việc (Work Area).
   * Tự động tính toán và dàn đều toàn bộ các cửa sổ đang đồng bộ theo bố cục lưới tối ưu (2x1, 2x2, 3x2, 4x2, v.v.), không để cửa sổ bị đè chồng lên nhau, giúp người dùng dễ dàng quan sát đồng thời nhiều tài khoản.

3. **Giao Diện Điều Khiển Đồng Bộ Trực Quan (Sync Control Bar):**
   * Bổ sung thanh công cụ điều khiển Sync ngay trên giao diện Web UI:
     * Nút chọn Profile Master và chọn danh sách Profile Slaves bằng checkbox.
     * Nút **Bắt đầu đồng bộ (Start Sync)**, **Tạm dừng (Pause)**, **Kết thúc (Stop Sync)**.
     * Đèn báo trạng thái hoạt động theo thời gian thực (Active / Inactive).
   * File mã nguồn giao diện module hóa độc lập: [`public/js/sync-ui.js`](public/js/sync-ui.js).

4. **Kiến Trúc Backend Đồng Bộ Dạng Module Hóa:**
   * Tổ chức mã nguồn backend sạch sẽ tại thư mục `src/sync/`:
     * `capture-script.js`: Script bắt sự kiện phía Master siêu nhẹ, không gây trễ trang.
     * `event-dispatcher.js`: Bộ phát lệnh CDP đa luồng sang các Slaves.
     * `session-manager.js`: Quản lý vòng đời phiên đồng bộ, tự động xử lý khi một profile bị tắt.
     * `window-tiler.js`: Điều khiển kích thước và vị trí cửa sổ qua CDP `Browser.setWindowBounds`.

---

## 🌟 3. Các Tính Năng Nổi Bật (Key Capabilities)

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

### 📥 H. Trung Tâm Quản Lý Kernel Tự Động (In-App Kernel Downloader)
- **Tải & Giải nén 1-Click ngay trong Web UI**: Tự động stream download gói runtime Chromium 153 với thanh tiến trình %, vận tốc (MB/s) thời gian thực.
- **Giải nén siêu tốc (1.5 giây)**: Tích hợp engine `tar.exe` nguyên bản của Windows 10/11 (với cơ chế dự phòng `Expand-Archive`), tự động bung giải nén vào `bin/chromium/` mà người dùng không cần thao tác file.
- **Hỗ trợ cài đặt Offline từ file ZIP**: Nhập trực tiếp đường dẫn file zip có sẵn trên máy để cài đặt ngay lập tức.

### ⚡ I. Tạo Hồ Sơ Hàng Loạt & Phân Bổ Proxy (Bulk Profile Generator)
- Cho phép tạo từ **5 đến 100 profile** cùng một lúc chỉ với 1 click.
- **Thuật toán sinh phần cứng duy nhất**: Mỗi profile sở hữu fingerprint độc lập (OS, Screen, Canvas noise, WebGL GPU, Audio phase).
- **Phân bổ Proxy xoay vòng (Round-Robin)**: Dán danh sách proxy định dạng `host:port:user:pass` hoặc `host:port` để hệ thống tự động chia đều cho các profile.

### 🔄 J. Hỗ Trợ Proxy Xoay & Đổi IP 1-Click (Proxy Rotation API)
- Tích hợp trường **Link đổi IP (Rotate URL)** cho proxy Dcom 4G / TMProxy / TinProxy / ProxyFB.
- **Nút đổi IP nhanh 1-Click**: Bấm nút xoay IP trực tiếp trên bảng profile kèm animation xoay tròn và tự động cập nhật địa chỉ IP mới.
- **Auto-Rotate Pre-launch**: Tùy chọn tự động gọi link đổi IP trước khi khởi chạy profile nhằm đảm bảo IP luôn mới.

### 📦 K. Sao Lưu & Phục Hồi Hồ Sơ Đóng Gói (ZIP Backup & Restore)
- **Xuất ZIP độc lập**: Đóng gói toàn bộ `User Data` (cookies, cache, session, history) cùng thông số SQLite thành 1 file `.zip` gọn nhẹ để chia sẻ cho đồng nghiệp hoặc chuyển sang máy khác.
- **Nhập ZIP 1-Click**: Bấm nút "Nhập ZIP" trên thanh công cụ để khôi phục nguyên vẹn hồ sơ và sử dụng ngay lập tức.

---

## 📂 4. Cấu Trúc Mã Nguồn (Project Structure)

```
antidetect-manager/
├── bin/                        # Bộ công cụ thực thi Native & Kernel Portable
│   ├── chromium/               # Thư mục giải nén nhân Chromium 153 Portable
│   ├── spawn-desktop.cs        # Mã nguồn C# native Win32 Window Spawner
│   └── spawn-desktop.exe       # Trình nạp cửa sổ trực tiếp lên WinSta0\\Default
├── desktop/                    # Ứng dụng Desktop Electron
│   ├── main.js                 # Electron Main Process & IPC Server Controller
│   └── preload.js              # Context Bridge an toàn cho giao diện Desktop
├── public/
│   ├── js/
│   │   └── sync-ui.js          # Controller điều khiển thanh công cụ Action Synchronizer
│   ├── index.html              # Layout HTML giao diện Workstation, Modal Kernel, Bulk & Modals
│   ├── app.js                  # Frontend Controller, Real-time Spec Sheet, Kernel Poller & Events
│   └── style.css               # Hệ thống Stylesheet Dark/Light theme, Animation xoay proxy & Progress bar
├── src/                        # Backend Engine Modules (Node.js)
│   ├── sync/                   # Hệ thống Action Synchronizer & Grid Window Tiling
│   │   ├── capture-script.js   # Script lắng nghe & chuẩn hóa sự kiện chuột/phím Master
│   │   ├── event-dispatcher.js # Bộ điều phối lệnh CDP sang toàn bộ hồ sơ Slaves
│   │   ├── session-manager.js  # Quản lý vòng đời phiên đồng bộ (Start/Pause/Stop)
│   │   └── window-tiler.js     # Thuật toán tính toán và chia lưới dàn đều cửa sổ
│   ├── automation.js           # Kịch bản tự động hóa (Warmup, Iphey Audit)
│   ├── cdp.js                  # Chrome DevTools Protocol Client & Process Watcher
│   ├── config.js               # Quản lý đường dẫn môi trường, Kernel Chromium & Data
│   ├── cookies.js              # Module chuyển đổi định dạng Cookie (JSON / Netscape)
│   ├── db.js                   # Cơ sở dữ liệu SQLite nhúng (WAL mode, Bulk Create, Proxy Rotation)
│   ├── extensions.js           # Quản lý & khởi tạo Extension Presets Manifest V3
│   ├── fingerprint.js          # Thuật toán sinh thông số & Dynamic CDP Injector
│   ├── index.js                # Điểm khởi chạy Web Server độc lập
│   ├── kernel-downloader.js    # Tải & giải nén ngầm nhân Chromium (Streaming HTTP + tar.exe)
│   ├── launcher.js             # Bộ điều phối tiến trình Chromium & Pre-launch Proxy Rotation
│   ├── license-manager.js      # Hệ thống quản lý bản quyền HWID & License Quota
│   ├── profile-backup.js       # Module đóng gói Backup & Restore Profile dạng ZIP
│   ├── proxy.js                # Bộ kiểm tra Proxy, Local Loopback Forwarder & Rotation API Trigger
│   ├── server.js               # REST API Server v1 (Kernel, Bulk, Backup, Rotation, Sync)
│   └── synchronizer.js         # Động cơ đồng bộ chuột/phím & tính toán lưới Grid
├── test/                       # Bộ kiểm thử tự động toàn diện (Test Suites)
│   ├── test-core.js            # Kiểm tra khởi chạy Chromium & kết nối CDP
│   ├── test-fingerprint.js     # Kiểm tra tính chính xác của bộ lọc WebGL, Canvas, CPU, RAM
│   ├── test-p1-to-p4.js        # Kiểm thử tích hợp 4 tính năng: Kernel, Bulk, Rotation, ZIP
│   ├── test-web-ui-full.js     # Kiểm thử Web UI 8 giai đoạn qua kết nối DevTools thực
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

## 🚀 5. Hướng Dẫn Cài Đặt & Khởi Chạy Trên Mọi Máy Tính (Zero Configuration)

Dự án được thiết kế theo cơ chế **Plug-and-Play**, tự động thích ứng với bất kỳ máy tính nào ngay khi vừa `git clone` về:
- **Tự động dò tìm nhân trình duyệt**: Tự động phát hiện Google Chrome (64/32-bit, LocalAppData), Microsoft Edge (có sẵn 100% trên Windows 10/11), Brave, Cốc Cốc hoặc Chromium trên macOS/Linux.
- **Tự động sửa lỗi đường dẫn (Auto-Repair)**: Tự động chuyển đổi các hồ sơ sang trình duyệt có sẵn trên máy hiện tại, tuyệt đối không bị lỗi đường dẫn cố định ổ đĩa.

### Yêu cầu môi trường:
- **Node.js**: Phiên bản 20+ LTS (khuyên dùng Node v22 hoặc v24). Tải miễn phí tại [nodejs.org](https://nodejs.org).
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

### 🌐 Cài Đặt Nhân Chromium Core 153 Custom Build (Chuẩn PolyLogin):
Nếu bạn hoặc người dùng tải project từ Git về máy mới chưa có sẵn nhân Chromium 153:
- **Cách 1 (Khuyên dùng - 1-Click Tự Động Trong Web UI)**:
  1. Mở giao diện Web tại `http://127.0.0.1:51888`.
  2. Bấm vào nút **"Cài Đặt Kernel"** trên thanh Header (hoặc góc dưới Sidebar).
  3. Bấm **"1-Click Tải & Cài Đặt Tự Động"**: Hệ thống sẽ tự động stream tải gói runtime (~245MB) trực tiếp từ **GitHub Releases chính thức** và tự động giải nén siêu tốc vào `bin/chromium/` trong vài giây!
- **Cách 2 (Tải Trực Tiếp Từ GitHub Releases & Cài Đặt)**:
  - Link tải trực tiếp vĩnh viễn (Tốc độ cao CDN): [MyBrowser-153-win64.zip (245MB)](https://github.com/parkseoduc/CGT-Login-Browser/releases/download/v2.0-kernel/MyBrowser-153-win64.zip)
  - Sau khi tải về: Mở cửa sổ Cài Đặt Kernel -> dán đường dẫn file zip -> bấm **"Cài Đặt File ZIP Này"** (hoặc giải nén thẳng vào `bin/chromium/chrome.exe`).

---

## 🧪 6. Kết Quả Kiểm Thử Hệ Thống (Automated Test Suites)

Dự án tích hợp đầy đủ 8 kịch bản kiểm thử độc lập bao phủ 100% chức năng:

| Tệp kiểm thử | Mục tiêu kiểm tra | Kết quả |
| :--- | :--- | :---: |
| `test/test-p1-to-p4.js` | Kiểm thử tích hợp 4 tính năng: Kernel Downloader, Bulk Create, Proxy Rotation, ZIP Backup | ✅ PASS (100%) |
| `test/test-web-ui-full.js` | Kiểm thử toàn diện 8 giai đoạn Web UI trực tiếp qua Chromium DevTools Protocol (CDP) | ✅ PASS (100%) |
| `test/test-core.js` | Khởi chạy hạt nhân Chromium, cấp phát cổng CDP động, kiểm tra DevTools endpoint | ✅ PASS (100%) |
| `test/test-fingerprint.js` | Kiểm tra độ che giấu WebGL, Canvas Hash, Audio Noise, RAM, CPU | ✅ PASS (100%) |
| `test/test-step3-backend.js` | Phân tích cú pháp Proxy, quản trị nhóm hồ sơ | ✅ PASS (100%) |
| `test/test-step4-sync.js` | Thuật toán chia lưới Grid Tiling và tính toán tọa độ tương đối | ✅ PASS (100%) |
| `test/test-workstation-ui.js` | Kiểm thử toàn diện 12 chức năng trên giao diện PolyLogin Workstation | ✅ PASS (100%) |
| `test/verify-full-flow.js` | Kiểm thử luồng khép kín: Mở hồ sơ -> Local Forwarder -> Tải trang sạch 1 tab -> Đóng êm | ✅ PASS (100%) |

**Chạy kiểm thử hệ thống:**
```bash
node test/test-p1-to-p4.js
node test/test-web-ui-full.js
```

---

## ⚖️ 7. Giấy Phép & Bản Quyền
- Bản quyền thuộc về đội ngũ phát triển **OmniBrowser Antidetect Team**.
- Được cấp phép sử dụng nội bộ và thương mại hóa theo tiêu chuẩn bản quyền phần mềm CGT-License.
