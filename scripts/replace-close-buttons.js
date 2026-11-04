const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

const svgClose = `<button class="modal-close" id="admin-grant-close" title="Đóng">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>`;

const svgResetClose = `<button class="modal-close" id="admin-reset-pass-close" title="Đóng">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>`;

const svgClearBtn = `<button type="button" class="proxy-search-clear-btn" id="proxy-hub-search-clear" style="display:none;" title="Xóa"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>`;

html = html.replace('<button class="modal-close" id="admin-grant-close">&times;</button>', svgClose);
html = html.replace('<button class="modal-close" id="admin-reset-pass-close">&times;</button>', svgResetClose);
html = html.replace('<button type="button" class="proxy-search-clear-btn" id="proxy-hub-search-clear" style="display:none;">&times;</button>', svgClearBtn);

fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Replaced all remaining &times; with SVG successfully!');
