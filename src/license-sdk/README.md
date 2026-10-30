# @tumy/license

> **JavaScript / TypeScript / Electron Client SDK** cho hệ thống bản quyền bảo mật Tumy / CGT License Engine.

---

## ⚡ Tính năng nổi bật

- 🛡️ **Xác thực chữ ký số Ed25519**: Chống giả mạo server, chống Replay Attack, chống Clock Skew.
- 🔒 **Mã hóa bộ nhớ đệm AES-256-GCM**: Khóa mã hóa dẫn xuất trực tiếp từ Hardware ID (HWID), tự hủy nếu can thiệp file trên đĩa hoặc copy sang máy khác.
- 💻 **Định danh phần cứng (Hardware ID)**: Tự động trích xuất mã máy duy nhất trên Windows (MachineGuid), macOS, Linux (tương thích 100% với Python SDK).
- ⏰ **Chống lùi giờ máy tính (`CLOCK_ROLLBACK`)**: Theo dõi mốc thời gian cao nhất để chống gian lận lùi đồng hồ.
- 🌐 **Giới hạn ngoại tuyến 24h (`OFFLINE_EXPIRED`)**: Tự động khóa nếu ngắt mạng quá hạn mức bảo mật cho phép.
- 🚀 **1 Dòng lệnh tích hợp**: Đơn giản hóa toàn bộ luồng kiểm tra và khóa tính năng Pro.

---

## 📦 Cài đặt

```bash
npm install @tumy/license
```

---

## 🚀 Hướng dẫn sử dụng

### 1. Khởi tạo và kích hoạt (1 dòng lệnh)

```javascript
import { License } from '@tumy/license';

const license = new License({
  product: 'videomaker',
  serverUrl: 'https://lic.cgtdev.space'
});

// Khởi tạo và đọc bản quyền đã lưu
await license.init();

if (!license.status().allowed) {
  // Nếu chưa có key -> Kích hoạt với key người dùng nhập
  const result = await license.activate('VMK-XXXX-XXXX-XXXX-XXXX');
  console.log('Kích hoạt thành công:', result);
}
```

### 2. Khóa tính năng cao cấp (Pro Feature Protection)

```javascript
// Tính năng dạng bật/tắt (boolean)
await license.require('export_4k');

// Tính năng dạng hạn mức (limit)
await license.require('max_accounts', 5);
```

---

## 🧪 Chạy thử nghiệm

```bash
node --test test/*.test.mjs
```
