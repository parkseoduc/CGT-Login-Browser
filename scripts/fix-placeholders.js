const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(filePath, 'utf8');

html = html.replace(
  '<input type="password" id="chg-old-password" class="form-control" required placeholder="••••••••">',
  '<input type="password" id="chg-old-password" class="form-control" required placeholder="Nhập mật khẩu hiện tại...">'
);

html = html.replace(
  /<label>Mật Khẩu Mới \(Ít nhất 6 ký tự\):<\/label>\s*<input type="password" id="chg-new-password" class="form-control" required minlength="6" placeholder="••••••••">/m,
  '<label>Mật Khẩu Mới:</label>\r\n          <input type="password" id="chg-new-password" class="form-control" required minlength="6" placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)...">'
);

html = html.replace(
  '<input type="password" id="chg-confirm-password" class="form-control" required minlength="6" placeholder="••••••••">',
  '<input type="password" id="chg-confirm-password" class="form-control" required minlength="6" placeholder="Nhập lại mật khẩu mới...">'
);

fs.writeFileSync(filePath, html, 'utf8');
console.log('Successfully updated placeholders in index.html');
