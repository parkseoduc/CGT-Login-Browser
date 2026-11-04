const fs = require('fs');

let code = fs.readFileSync('public/js/admin-checkout.js', 'utf8');

code = code.replace(
  'alert(msg);',
  'if (typeof window.showToast === "function") window.showToast(msg, "warning"); else alert(msg);'
);

code = code.replace(
  'if (!confirm(`Bạn có chắc chắn muốn ${actionName} tài khoản này không?`)) return;',
  `const confirmed = typeof window.showConfirmDialog === 'function' ? await window.showConfirmDialog({ title: 'Xác nhận thao tác', message: \`Bạn có chắc chắn muốn \${actionName} tài khoản này không?\`, type: 'danger' }) : confirm(\`Bạn có chắc chắn muốn \${actionName} tài khoản này không?\`);
    if (!confirmed) return;`
);

code = code.replace(
  'if (!confirm(`Xác nhận duyệt và cấp Key tự động từ lic.cgtdev.space cho đơn hàng ${orderId}?`)) return;',
  `const confirmed = typeof window.showConfirmDialog === 'function' ? await window.showConfirmDialog({ title: 'Cấp Key Tự Động', message: \`Xác nhận duyệt và cấp Key tự động từ lic.cgtdev.space cho đơn hàng \${orderId}?\`, type: 'warning', confirmText: 'Duyệt & Cấp Key' }) : confirm(\`Xác nhận duyệt và cấp Key tự động từ lic.cgtdev.space cho đơn hàng \${orderId}?\`);
    if (!confirmed) return;`
);

fs.writeFileSync('public/js/admin-checkout.js', code, 'utf8');
console.log('Successfully updated public/js/admin-checkout.js');
