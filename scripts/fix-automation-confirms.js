const fs = require('fs');

let code = fs.readFileSync('public/js/automation-ui.js', 'utf8');

const target1 = "if (!confirm('Bạn có chắc chắn muốn xóa kịch bản này không?')) return;";
const replacement1 = `const confirmed = typeof window.showConfirmDialog === 'function'
      ? await window.showConfirmDialog({
          title: 'Xóa Kịch Bản',
          message: 'Bạn có chắc chắn muốn xóa kịch bản này không? Thao tác này không thể hoàn tác.',
          type: 'danger',
          confirmText: 'Xóa Kịch Bản',
          cancelText: 'Hủy'
        })
      : confirm('Bạn có chắc chắn muốn xóa kịch bản này không?');
    if (!confirmed) return;`;

const target2 = "if (!confirm('Bạn có chắc chắn muốn dừng toàn bộ tiến trình tự động hóa đang chạy không?')) return;";
const replacement2 = `const confirmed = typeof window.showConfirmDialog === 'function'
      ? await window.showConfirmDialog({
          title: 'Dừng Tiến Trình',
          message: 'Bạn có chắc chắn muốn dừng toàn bộ tiến trình tự động hóa đang chạy không?',
          type: 'warning',
          confirmText: 'Dừng Ngay',
          cancelText: 'Tiếp tục'
        })
      : confirm('Bạn có chắc chắn muốn dừng toàn bộ tiến trình tự động hóa đang chạy không?');
    if (!confirmed) return;`;

code = code.replace(target1, replacement1);
code = code.replace(target2, replacement2);

fs.writeFileSync('public/js/automation-ui.js', code, 'utf8');
console.log('Replaced confirms in automation-ui.js!');
