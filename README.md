# CRM Dashboard & Workstation UI Template

Giao diện mẫu CRM / Admin Dashboard hiện đại, đa năng, tối ưu hóa trải nghiệm người dùng (UI/UX) với hệ thống Design System chuẩn chỉnh, hỗ trợ Dark/Light Mode, Data Table lọc thời gian thực, Batch Actions hàng loạt và sẵn sàng tích hợp vào bất kỳ dự án nào.

---

## 🌟 Tính Năng Nổi Bật

- **Thiết kế chuẩn Modern CRM & Workstation:**
  - Sidebar điều hướng với huy hiệu gói, hạn sử dụng, trạng thái kết nối.
  - Thanh tìm kiếm thời gian thực (Search filter) với phím tắt nhanh (`/`).
  - Bộ lọc thông minh theo Nhóm (Groups), Trạng thái (Status), Proxy/Tags.
  - Nút chuyển đổi giao diện **Sáng / Tối (Dark & Light Mode)** mượt mà, tự động lưu vào `localStorage`.
- **Thanh công cụ Thao tác hàng loạt (Batch Action Bar):**
  - Tích chọn một hoặc nhiều hàng dữ liệu bằng checkbox.
  - Tự động đếm và hiển thị số lượng hồ sơ được chọn dưới dạng viên thuốc (Pill Badge): `[ ▶ Mở (2) ]`, `[ ⨂ Đóng (2) ]`, `[ 🗑 Xóa (2) ]`...
- **Bảng dữ liệu (Data Table) cao cấp:**
  - Checkbox chọn tất cả (Select All) có trạng thái `indeterminate`.
  - Huy hiệu trạng thái động (Đang chạy, Sẵn sàng, Ngoại tuyến, Lỗi).
  - Thao tác nhanh trên từng dòng (Khởi chạy, Chỉnh sửa, Quản lý, Xóa).
- **Hệ thống Modal Đa Tầng (Multi-Tab Forms):**
  - Form tạo & chỉnh sửa phân chia khoa học thành các tab: Thông tin cơ bản, Cấu hình Mạng / Proxy, Phần cứng & Cấu hình, Tiện ích mở rộng.
  - Modal tạo hàng loạt (Batch Creator) sinh nhanh hàng chục bản ghi cùng lúc.
- **Components Tùy biến:**
  - `custom-select.js`: Dropdown tuyển chọn hỗ trợ tìm kiếm từ khóa, chống giật trang.
  - `showToast(message, type)`: Thông báo đẩy góc màn hình (Success, Warning, Danger, Info).
  - `showConfirmDialog({...})`: Hộp thoại xác nhận hành động nguy hiểm đẹp mắt thay thế `window.confirm()`.
- **Chế độ Chạy độc lập (Standalone Mock Mode):**
  - Tích hợp sẵn `js/mock-data.js` lưu trữ trực tiếp trên trình duyệt qua `localStorage`.
  - Có thể mở trực tiếp file `index.html` trong trình duyệt hoặc chạy `npx serve` là hoạt động đầy đủ tính năng thêm/sửa/xóa mà không cần cài đặt backend phức tạp.

---

## 📁 Cấu Trúc Thư Mục

```text
crm-template/
├── index.html              # Trang chủ giao diện CRM Workstation
├── css/
│   └── style.css           # Toàn bộ CSS Design System (Biến màu, Dark/Light theme, Cards, Tables, Modals)
├── js/
│   ├── app.js              # Controller điều khiển tương tác giao diện (Tables, Modals, Filters, Batch Actions)
│   ├── mock-data.js        # Cơ sở dữ liệu Mock & State Manager trên LocalStorage
│   ├── custom-select.js    # Component Custom Select tìm kiếm nhanh
│   └── sync-ui.js          # Giao diện đồng bộ thao tác đa màn hình
├── package.json            # Cấu hình dự án & script chạy thử
├── .gitignore
└── README.md               # Tài liệu hướng dẫn sử dụng
```

---

## 🚀 Hướng Dẫn Sử Dụng Cho Dự Án Mới

### Cách 1: Chạy trực tiếp (Không cần cài đặt)
Chỉ cần nhấp đúp chuột vào file `index.html` để mở trực tiếp trong trình duyệt Chrome, Edge, Safari hoặc Firefox.

### Cách 2: Chạy qua Local Web Server
Nếu máy đã cài Node.js:
```bash
# Cài đặt hoặc chạy server tĩnh
npx serve -l 3000 .
```
Truy cập: `http://localhost:3000`

---

## 🔌 Hướng Dẫn Kết Nối Backend Thực Tế

Trong file [`js/mock-data.js`](file:///js/mock-data.js):
```javascript
window.CRM_CONFIG = {
  // Đặt false để chuyển sang kết nối REST API thực tế của bạn
  USE_MOCK_DATA: false,

  // Địa chỉ API máy chủ của bạn (Node.js, Laravel, Python FastAPI, Go, Supabase...)
  API_BASE: 'https://your-api-domain.com/api',
};
```

### Các Endpoint REST API Chuẩn:
- `GET /api/profiles`: Danh sách hồ sơ / khách hàng.
- `POST /api/profiles`: Thêm hồ sơ mới.
- `GET /api/profiles/:id`: Lấy chi tiết hồ sơ.
- `PUT /api/profiles/:id`: Cập nhật thông tin hồ sơ.
- `DELETE /api/profiles/:id`: Xóa hồ sơ.
- `GET /api/groups`: Danh sách nhóm phân loại.
- `POST /api/groups`: Tạo nhóm mới.
- `GET /api/proxies`: Danh sách kết nối mạng / proxy.

---

## 🎨 Tùy Biến Giao Diện (Design System)

Tất cả màu sắc, khoảng cách, kích thước font đều được quản lý tại phần đầu file [`css/style.css`](file:///css/style.css):

```css
:root {
  --primary: #3B82F6;       /* Màu chủ đạo (Xanh dương) */
  --primary-hover: #2563EB;
  --bg-main: #0B0F19;       /* Màu nền Dark Mode */
  --bg-card: #111827;       /* Màu thẻ / Card */
  --text-main: #F9FAFB;
  --border-subtle: rgba(255, 255, 255, 0.08);
}

[data-theme="light"] {
  --bg-main: #F8FAFC;       /* Màu nền Light Mode */
  --bg-card: #FFFFFF;
  --text-main: #0F172A;
  --border-subtle: #E2E8F0;
}
```
Bạn có thể dễ dàng thay đổi mã màu `--primary` để phù hợp với bộ nhận diện thương hiệu của dự án mới.

---

## 📄 Bản Quyền
Phát hành theo giấy phép **MIT License** — Thoải mái sử dụng, tùy biến và tích hợp vào các dự án thương mại và cá nhân.
