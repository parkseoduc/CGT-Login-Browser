const fs = require('fs');

let code = fs.readFileSync('public/app.js', 'utf8');

const pos1 = code.indexOf('function showToast(');
const pos2 = code.indexOf('function showConfirmDialog(');

if (pos1 === -1 || pos2 === -1) {
  console.error('Could not find markers');
  process.exit(1);
}

const newToastBlock = `function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  const normalizedType = (type === 'danger' || type === 'error') ? 'danger' : type;
  toast.className = 'toast toast-' + normalizedType;
  
  let iconSvg = '';
  if (normalizedType === 'success') {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
  } else if (normalizedType === 'danger') {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
  } else if (normalizedType === 'warning') {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  } else {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  }

  const cleanMessage = typeof message === 'string' 
    ? message.replace(/^[\\u{1F300}-\\u{1F9FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}\\uFE0F\\s]+/u, '') 
    : String(message);

  toast.innerHTML = \`
    <div class="toast-content-wrapper">
      <div class="toast-icon-badge">\${iconSvg}</div>
      <div class="toast-message-text">\${cleanMessage}</div>
    </div>
    <button class="toast-close-btn" title="Đóng">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  \`;

  const dismiss = () => {
    if (toast.classList.contains('toast-hiding')) return;
    toast.classList.add('toast-hiding');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 280);
  };

  const closeBtn = toast.querySelector('.toast-close-btn');
  if (closeBtn) closeBtn.onclick = dismiss;

  container.appendChild(toast);
  setTimeout(dismiss, 3500);
}

// Global exports & native alert override
window.showToast = showToast;
window.alert = function(msg) {
  showToast(msg, 'info');
};

`;

const updated = code.substring(0, pos1) + newToastBlock + code.substring(pos2);
fs.writeFileSync('public/app.js', updated, 'utf8');
console.log('Successfully updated showToast & alert override in public/app.js');
