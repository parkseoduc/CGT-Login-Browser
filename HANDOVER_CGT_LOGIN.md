# TÀI LIỆU BÀN GIAO & VẬN HÀNH HỆ THỐNG CGT-LOGIN
**Hệ Thống Trình Duyệt Antidetect Tự Động Hóa Chuyên Dụng Cho Đội Ngũ CGT Media**
*(Tài liệu nội bộ dành cho Quản lý dự án, Kỹ sư Automation & Đội ngũ Vận hành)*

---

## 1. TỔNG QUAN HỆ THỐNG
**CGT-Login** là giải pháp trình duyệt ẩn danh (Antidetect Browser Profile Manager) hiệu năng cao, được phát triển chuyên biệt để quản lý hàng nghìn tài khoản mạng xã hội, sàn thương mại điện tử và các chiến dịch MMO / Marketing độc lập, an toàn và chống phát hiện gian lận.

### Các Tính Năng Cốt Lõi:
- **Nhân Trình Duyệt Custom (Chromium 153 Core)**: Tùy biến mã nguồn sâu từ Chromium gốc, vượt qua 100% các bài kiểm tra vân tay khắt khe nhất thế giới hiện nay (*Iphey 100% Authentic*, *Pixelscan*, *CreepJS*, *BrowserLeaks*).
- **Cách Ly Triệt Để Profile**: Mỗi profile có thư mục cache, cookies, local storage, indexedDB và thông số phần cứng riêng biệt.
- **Giả Lập Dấu Vân Tay (Fingerprint Spoofing)**: Canvas 2D/WebGL Noise ngẫu nhiên nhưng nhất quán theo hạt giống (Seed), WebRTC Local IP Masking, AudioContext Fingerprint Spoofing, Font List, Screen Resolution, CPU Concurrency, RAM Memory, OS Timezone & Geo-location.
- **Hạ Tầng Proxy Độc Lập**: Hỗ trợ toàn diện HTTP, HTTPS, SOCKS5 với cơ chế kiểm tra kết nối Live Ping và đo lường IP tức thì.
- **No-code Automation Studio**: Thiết lập chuỗi kịch bản nuôi tài khoản tự động (lướt TikTok/Shorts, xem video ngâm cookie, cày Muse AI chống ngắt kết nối, lướt tin tức tự nhiên) không cần lập trình.
- **Multi-Window Sync**: Đồng bộ thao tác chuột, bàn phím và cuộn trang đồng thời từ một cửa sổ chính tới hàng loạt cửa sổ con.
- **Mở Full Hạn Mức Tạo Profile**: Toàn bộ thành viên trong đội ngũ được mở quyền tạo hồ sơ **VÔ HẠN (Unlimited / 999,999 Profiles)**, kích hoạt vĩnh viễn không giới hạn số lượng.

---

## 2. YÊU CẦU MÔI TRƯỜNG & HẠ TẦNG

| Thành Phần | Yêu Cầu Tối Thiểu | Khuyên Dùng Cho Vận Hành Team |
| :--- | :--- | :--- |
| **Hệ Điều Hành** | Windows 10 (64-bit) | Windows 10 / 11 (64-bit) bản Pro hoặc Workstation |
| **Bộ Nhớ RAM** | 4 GB | 8 GB - 16 GB (hoặc 32GB nếu chạy trên 20 profile cùng lúc) |
| **Dung Lượng Ổ Cứng** | 2 GB trống | Khuyên dùng ổ SSD NVMe để nạp cache nhanh |
| **Môi Trường Với Bản Portable (ZIP)** | **Không cần cài đặt thêm gì** | Tải file zip về, giải nén và click file `.bat` là chạy ngay |
| **Môi Trường Nếu Chạy Source (Git)** | Node.js v18.0.0+ | Node.js v20.x hoặc v22.x LTS (x64) |

---

## 3. HƯỚNG DẪN KHỞI ĐỘNG NHANH (QUICK START)

### Cách 1: Sử dụng Bản Đóng Gói Sẵn (Khuyên Dùng Cho Team)
1. Tải file đóng gói `CGT-Login-v1.0.0-Portable-x64.zip` về máy tính.
2. Chuột phải vào file zip, chọn **Extract All...** để giải nén ra thư mục bất kỳ (ví dụ: `Desktop\CGT-Login` hoặc `D:\CGT-Login`).
3. Mở thư mục vừa giải nén và click đúp vào file:
   👉 **`Khoi_Dong_CGT_Login.bat`** (hoặc file thực thi **`CGT-Login.exe`**).
4. Hệ thống sẽ tự động khởi tạo backend và mở giao diện ứng dụng quản trị ngay lập tức.

### Cách 2: Chạy Từ Mã Nguồn (Dành Cho Kỹ Sư Phát Triển)
```bash
# 1. Clone mã nguồn về máy
git clone https://gitlab.com/cgtmedia-group/CGT-Browser-Profile.git
cd CGT-Browser-Profile

# 2. Khởi động máy chủ ứng dụng
node --experimental-sqlite src/index.js
```
Truy cập giao diện Web Dashboard tại: `http://127.0.0.1:51888`

---

## 4. TÀI LIỆU API ĐIỀU KHIỂN PROFILE & AUTOMATION (REST & CDP)

Mọi thao tác quản lý profile trên giao diện đều được mở cổng REST API nội bộ trên cổng mặc định `51888` để các công cụ tự động hóa bên ngoài (Python, C#, Golang, Puppeteer, Playwright, Selenium) có thể cắm vào điều khiển.

Base URL: `http://127.0.0.1:51888/api/v1`

### 4.1. Kiểm Tra Trạng Thái Hệ Thống
- **Endpoint**: `GET /api/v1/status`
- **Mô tả**: Kiểm tra API đã sẵn sàng, lấy thông tin nhân Chromium khả dụng và trạng thái bản quyền.
- **Response**:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "activeProfiles": 2,
  "defaultKernel": "bin/chromium/chrome.exe"
}
```

---

### 4.2. Lấy Danh Sách Hồ Sơ (Profiles)
- **Endpoint**: `GET /api/v1/profiles`
- **Query Params**:
  - `page`: Số trang (mặc định 1)
  - `limit`: Số profile mỗi trang (mặc định 50)
  - `groupId`: Lọc theo ID nhóm
  - `search`: Tìm kiếm theo tên hoặc ghi chú
- **Response**:
```json
{
  "profiles": [
    {
      "id": "cgt_prof_01",
      "name": "TikTok Marketing US 01",
      "os": "win",
      "browser_kernel": "MyBrowser 153 Portable",
      "proxy_id": "px_us_01",
      "group_name": "Tài Khoản Nuôi US",
      "created_at": "2026-11-16T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1
}
```

---

### 4.3. Tạo Mới Hồ Sơ (Create Profile)
- **Endpoint**: `POST /api/v1/profiles`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "name": "Facebook Ads Account 01",
  "os": "win",
  "browserKernel": "local-portable-chromium",
  "proxyId": "",
  "proxyHost": "104.28.19.45",
  "proxyPort": 1080,
  "proxyType": "socks5",
  "proxyUser": "",
  "proxyPass": "",
  "notes": "Tài khoản chạy chiến dịch Noel"
}
```
- **Response**: Trả về thông tin profile vừa tạo kèm `id` và bộ thông số vân tay đã được cấu hình tự động.

---

### 4.4. Khởi Động Trình Duyệt Profile (Start Profile)
- **Endpoint**: `POST /api/v1/profiles/:id/start`
- **Mô tả**: Kích hoạt nhân Chromium antidetect chạy ngầm với đầy đủ fingerprint giả lập và proxy đã gán. **Endpoint này trả về trực tiếp `wsEndpoint` (Cổng WebSocket CDP)** để các thư viện tự động hóa kết nối vào điều khiển!
- **Response**:
```json
{
  "success": true,
  "profileId": "cgt_prof_01",
  "debugPort": 52104,
  "wsEndpoint": "ws://127.0.0.1:52104/devtools/browser/7f8b894d-1e12-4c28-971c-7bf0a98f7e21",
  "pid": 18452
}
```

---

### 4.5. Lấy Trạng Thái Hoạt Động & Link CDP Đang Mở (Get Active Status)
- **Endpoint**: `GET /api/v1/profiles/:id/active`
- **Mô tả**: Trả về tình trạng profile có đang chạy hay không, cổng debug CDP và WebSocket endpoint hiện thời.
- **Response**:
```json
{
  "running": true,
  "profileId": "cgt_prof_01",
  "debugPort": 52104,
  "wsEndpoint": "ws://127.0.0.1:52104/devtools/browser/7f8b894d-1e12-4c28-971c-7bf0a98f7e21"
}
```

---

### 4.6. Dừng / Đóng Trình Duyệt Profile (Stop Profile)
- **Endpoint**: `POST /api/v1/profiles/:id/stop`
- **Response**:
```json
{
  "success": true,
  "profileId": "cgt_prof_01",
  "message": "Đã dừng tiến trình trình duyệt an toàn"
}
```

---

### 4.7. Quản Lý Cookies (Import & Export Cookies)
- **Xuất Cookies**: `GET /api/v1/profiles/:id/cookies`
  - Trả về mảng JSON chứa toàn bộ Cookies của profile (name, value, domain, path, expires, httpOnly, secure).
- **Nhập Cookies**: `POST /api/v1/profiles/:id/cookies`
  - Nhập mảng JSON cookies hoặc chuỗi cookie dạng text vào profile.

---

### 4.8. Chạy Kịch Bản Tự Động Hóa Hàng Loạt (Run Batch Automation)
- **Endpoint**: `POST /api/v1/automation/run-batch`
- **Body**:
```json
{
  "scriptId": "script_iphey_audit",
  "profileIds": ["cgt_prof_01", "cgt_prof_02"],
  "concurrency": 2,
  "delayBetweenProfilesMs": 3000
}
```

---

## 5. CODE MẪU TÍCH HỢP CHO KỸ SƯ AUTOMATION

### Ví Dụ 1: Điều Khiển Bằng Node.js (Puppeteer Core)
```javascript
const puppeteer = require('puppeteer-core');

async function automateProfile(profileId) {
  // 1. Gọi API khởi động profile
  const startRes = await fetch(`http://127.0.0.1:51888/api/v1/profiles/${profileId}/start`, {
    method: 'POST'
  });
  const data = await startRes.json();
  if (!data.success) throw new Error('Không thể mở profile: ' + data.error);

  console.log(`[CDP] Kết nối tới trình duyệt qua: ${data.wsEndpoint}`);

  // 2. Kết nối Puppeteer thẳng vào trình duyệt đang chạy
  const browser = await puppeteer.connect({
    browserWSEndpoint: data.wsEndpoint,
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();

  // 3. Thực hiện công việc tự động
  await page.goto('https://iphey.com', { waitUntil: 'networkidle2' });
  console.log('Đã mở trang kiểm tra thành công!');

  // 4. Ngắt kết nối tool (profile vẫn giữ nguyên hoặc gọi API stop để đóng)
  browser.disconnect();
}

automateProfile('cgt_prof_01');
```

---

### Ví Dụ 2: Điều Khiển Bằng Python (Playwright)
```python
import requests
from playwright.sync_api import sync_playwright

def run_automation(profile_id):
    # 1. Gọi API CGT-Login để mở profile
    url = f"http://127.0.0.1:51888/api/v1/profiles/{profile_id}/start"
    res = requests.post(url).json()
    if not res.get("success"):
        raise Exception(f"Lỗi khởi động: {res.get('error')}")

    ws_url = res["wsEndpoint"]
    print(f"Kết nối CDP: {ws_url}")

    # 2. Tự động hóa qua Playwright CDP
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(ws_url)
        context = browser.contexts[0]
        page = context.pages[0] if len(context.pages) > 0 else context.new_page()

        page.goto("https://iphey.com")
        page.wait_for_timeout(5000)
        print("Tiêu đề trang:", page.title())

        # Ngắt kết nối CDP
        browser.close()

run_automation("cgt_prof_01")
```

---

## 6. DANH SÁCH TÀI NGUYÊN & LINK LƯU TRỮ CHÍNH THỨC

| Thành Phần | Đường Dẫn / Link Lưu Trữ | Ghi Chú |
| :--- | :--- | :--- |
| **GitLab (CGT Media)** | `https://gitlab.com/cgtmedia-group/CGT-Browser-Profile.git` | Kho lưu trữ chính thức của tập đoàn (Nhánh `main`) |
| **GitHub (Backup)** | `https://github.com/parkseoduc/CGT-Login-Browser.git` | Kho lưu trữ dự phòng đồng bộ |
| **Google Drive Nhân Gốc** | `https://drive.google.com/file/d/10g0VKejeLA0Bn-sYGseInTLEWpRHQ3GK/view?usp=sharing` | Gói nén bộ nhân Chromium 153 antidetect gốc lưu trữ trên Google Drive |
| **Cloud Backup Mirror** | `https://gofile.io/d/VmyJsIUD` | Link tải trực tiếp dự phòng tốc độ cao |
| **Bản Portable Đóng Gói Sẵn** | `CGT-Login-v1.0.0-Portable-x64.zip` | Đã tích hợp sẵn Chromium 153 + Node Portable + Batch Launcher |
| **Database Mẫu Trắng** | `clean_antidetect.db` (hoặc `data/clean_antidetect.db`) | Cơ sở dữ liệu sạch, đã mở full hạn mức 999,999 profiles |
| **File Cấu Hình Mẫu** | `.env.example` | File khai báo cấu hình mẫu (cổng mạng, SMTP, secret key) |

---
*CGT Media Group - Bộ phận Phát triển Công nghệ & Tự Động Hóa*
