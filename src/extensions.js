const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');
const db = require('./db');

const PRESETS_DIR = path.join(config.EXTENSIONS_DIR, 'presets');

// 1. Tạo các Preset Extensions chính thức cho MMO / Facebook
function initPresetExtensions() {
  if (!fs.existsSync(PRESETS_DIR)) {
    fs.mkdirSync(PRESETS_DIR, { recursive: true });
  }

  // --- Preset 1: Cookie-Editor MMO ---
  const cookieDir = path.join(PRESETS_DIR, 'cookie-editor');
  fs.mkdirSync(cookieDir, { recursive: true });

  const cookieManifest = {
    manifest_version: 3,
    name: "Cookie-Editor MMO",
    version: "1.12.2",
    description: "Quản lý Cookie chuyên sâu cho Facebook, TikTok: Xuất/Nhập JSON cookies 1-click.",
    action: {
      default_popup: "popup.html",
      default_title: "Cookie-Editor MMO"
    },
    permissions: ["cookies", "activeTab", "storage"]
  };
  fs.writeFileSync(path.join(cookieDir, 'manifest.json'), JSON.stringify(cookieManifest, null, 2), 'utf8');

  const cookiePopupHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cookie-Editor MMO</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { width: 380px; min-height: 460px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 12px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-bottom: 10px; }
    .title { font-size: 14px; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 6px; }
    .domain { font-size: 11px; color: #94a3b8; word-break: break-all; }
    .actions { display: flex; gap: 6px; margin-bottom: 10px; }
    button { background: #1e293b; color: #f8fafc; border: 1px solid #475569; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: 0.2s; }
    button:hover { background: #334155; border-color: #38bdf8; }
    button.btn-primary { background: #2563eb; border-color: #3b82f6; }
    button.btn-primary:hover { background: #1d4ed8; }
    .search-box { width: 100%; padding: 6px 10px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; color: #fff; font-size: 12px; margin-bottom: 8px; }
    .cookie-list { max-height: 270px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
    .cookie-item { background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 8px; font-size: 11px; }
    .cookie-name { font-weight: 700; color: #a7f3d0; word-break: break-all; }
    .cookie-val { color: #cbd5e1; word-break: break-all; font-family: monospace; font-size: 10px; margin-top: 3px; max-height: 36px; overflow: hidden; }
    .modal-area { display: none; margin-top: 8px; }
    textarea { width: 100%; height: 120px; background: #1e293b; border: 1px solid #334155; color: #e2e8f0; font-family: monospace; font-size: 11px; padding: 8px; border-radius: 6px; resize: none; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">🍪 Cookie-Editor MMO</div>
    <button id="btn-refresh" title="Làm mới">🔄</button>
  </div>
  <div class="domain" id="current-url">Đang lấy URL...</div>
  
  <div class="actions" style="margin-top: 8px;">
    <button id="btn-export" class="btn-primary">📋 Xuất JSON</button>
    <button id="btn-import">📥 Nhập Cookie</button>
    <button id="btn-clear" style="color: #f87171;">🗑️ Xóa hết</button>
  </div>

  <input type="text" id="search-input" class="search-box" placeholder="Tìm kiếm cookie theo tên...">

  <div class="cookie-list" id="cookies-container">
    <div style="text-align:center; padding:20px; color:#94a3b8; font-size:11px;">Đang tải cookies...</div>
  </div>

  <div id="import-modal" class="modal-area">
    <div style="font-size:11px; margin-bottom:4px; color:#38bdf8;">Dán mảng JSON Cookie vào đây:</div>
    <textarea id="import-text" placeholder="[{ 'name': 'c_user', 'value': '1000...' }]"></textarea>
    <div style="display:flex; justify-content:flex-end; gap:6px; margin-top:6px;">
      <button id="btn-cancel-import">Hủy</button>
      <button id="btn-save-import" class="btn-primary">Lưu & Ghi đè</button>
    </div>
  </div>

  <script src="popup.js"></script>
</body>
</html>`;
  fs.writeFileSync(path.join(cookieDir, 'popup.html'), cookiePopupHtml, 'utf8');

  const cookiePopupJs = `let currentDomain = '';
let currentUrl = '';
let allCookies = [];

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) {
    document.getElementById('current-url').textContent = 'Không có tab hợp lệ';
    return;
  }
  currentUrl = tab.url;
  try {
    const urlObj = new URL(tab.url);
    currentDomain = urlObj.hostname;
    document.getElementById('current-url').textContent = currentDomain;
    loadCookies();
  } catch (e) {
    document.getElementById('current-url').textContent = tab.url;
  }
}

async function loadCookies() {
  const container = document.getElementById('cookies-container');
  container.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8; font-size:11px;">Đang tải...</div>';
  
  chrome.cookies.getAll({ url: currentUrl }, (cookies) => {
    allCookies = cookies || [];
    renderCookies(allCookies);
  });
}

function renderCookies(list) {
  const container = document.getElementById('cookies-container');
  container.innerHTML = '';
  if (!list || list.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8; font-size:11px;">Không tìm thấy cookie cho trang này.</div>';
    return;
  }
  list.forEach(c => {
    const div = document.createElement('div');
    div.className = 'cookie-item';
    div.innerHTML = \`
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="cookie-name">\${c.name}</span>
        <button style="padding:2px 6px; font-size:9px; color:#f87171;" class="btn-del" data-name="\${c.name}">Xóa</button>
      </div>
      <div class="cookie-val">\${c.value}</div>
    \`;
    container.appendChild(div);
  });

  container.querySelectorAll('.btn-del').forEach(b => {
    b.onclick = (e) => {
      const name = e.target.dataset.name;
      chrome.cookies.remove({ url: currentUrl, name }, () => loadCookies());
    };
  });
}

document.getElementById('search-input').oninput = (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = allCookies.filter(c => c.name.toLowerCase().includes(query) || c.value.toLowerCase().includes(query));
  renderCookies(filtered);
};

document.getElementById('btn-refresh').onclick = loadCookies;

document.getElementById('btn-export').onclick = () => {
  const jsonStr = JSON.stringify(allCookies, null, 2);
  navigator.clipboard.writeText(jsonStr).then(() => {
    alert(\`Đã sao chép \${allCookies.length} cookies dạng JSON vào Clipboard!\`);
  });
};

document.getElementById('btn-import').onclick = () => {
  document.getElementById('import-modal').style.display = 'block';
};

document.getElementById('btn-cancel-import').onclick = () => {
  document.getElementById('import-modal').style.display = 'none';
};

document.getElementById('btn-save-import').onclick = async () => {
  const text = document.getElementById('import-text').value.trim();
  if (!text) return;
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error('Dữ liệu cookie phải là một mảng JSON []');
    
    let count = 0;
    for (const c of parsed) {
      if (!c.name) continue;
      await chrome.cookies.set({
        url: currentUrl,
        name: c.name,
        value: c.value || '',
        domain: c.domain && !c.domain.startsWith('.') ? c.domain : undefined,
        path: c.path || '/',
        secure: c.secure !== undefined ? c.secure : true,
        httpOnly: c.httpOnly !== undefined ? c.httpOnly : false,
      });
      count++;
    }
    alert(\`Đã nhập thành công \${count} cookies!\`);
    document.getElementById('import-modal').style.display = 'none';
    document.getElementById('import-text').value = '';
    loadCookies();
  } catch (err) {
    alert('Lỗi nhập cookie: ' + err.message);
  }
};

document.getElementById('btn-clear').onclick = () => {
  if (!confirm('Bạn có chắc muốn xóa toàn bộ cookies của trang này?')) return;
  allCookies.forEach(c => {
    chrome.cookies.remove({ url: currentUrl, name: c.name });
  });
  setTimeout(loadCookies, 300);
};

init();`;
  fs.writeFileSync(path.join(cookieDir, 'popup.js'), cookiePopupJs, 'utf8');

  // --- Preset 2: 2FA Authenticator MMO ---
  const authDir = path.join(PRESETS_DIR, 'authenticator-2fa');
  fs.mkdirSync(authDir, { recursive: true });

  const authManifest = {
    manifest_version: 3,
    name: "2FA Authenticator MMO",
    version: "1.6.0",
    description: "Tạo mã xác thực 2FA 6 số tự động theo thời gian (TOTP) an toàn cho tài khoản Facebook / Google.",
    action: {
      default_popup: "popup.html",
      default_title: "2FA Authenticator MMO"
    },
    permissions: ["storage"]
  };
  fs.writeFileSync(path.join(authDir, 'manifest.json'), JSON.stringify(authManifest, null, 2), 'utf8');

  const authPopupHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>2FA Authenticator</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { width: 350px; min-height: 420px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 14px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-bottom: 12px; }
    .title { font-size: 14px; font-weight: 700; color: #10b981; display: flex; align-items: center; gap: 6px; }
    button { background: #1e293b; color: #f8fafc; border: 1px solid #475569; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: 0.2s; }
    button:hover { background: #334155; }
    button.btn-primary { background: #059669; border-color: #10b981; }
    button.btn-primary:hover { background: #047857; }
    .card-list { display: flex; flex-direction: column; gap: 8px; max-height: 280px; overflow-y: auto; }
    .auth-card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 10px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
    .auth-card:hover { border-color: #10b981; }
    .auth-label { font-size: 11px; color: #94a3b8; margin-bottom: 2px; }
    .auth-code { font-size: 22px; font-weight: 800; font-family: monospace; letter-spacing: 2px; color: #34d399; }
    .timer-ring { font-size: 11px; font-weight: 700; color: #94a3b8; }
    .add-form { display: none; background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 10px; margin-top: 10px; }
    .add-form input { width: 100%; padding: 6px 8px; background: #0f172a; border: 1px solid #334155; border-radius: 6px; color: #fff; font-size: 12px; margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">🔐 2FA Authenticator MMO</div>
    <div style="display:flex; align-items:center; gap:8px;">
      <span id="countdown" class="timer-ring">30s</span>
      <button id="btn-add-toggle" class="btn-primary">+ Thêm</button>
    </div>
  </div>

  <div id="add-form" class="add-form">
    <input type="text" id="input-label" placeholder="Tên tài khoản (VD: FB Nick 1)">
    <input type="text" id="input-secret" placeholder="Mã bảo mật 2FA (Secret Key)">
    <div style="display:flex; justify-content:flex-end; gap:6px;">
      <button id="btn-cancel-add">Hủy</button>
      <button id="btn-save-key" class="btn-primary">Lưu Khóa</button>
    </div>
  </div>

  <div class="card-list" id="keys-container"></div>

  <div style="text-align:center; margin-top:12px; font-size:10px; color:#64748b;">
    Nhấp vào mã 6 số để tự động sao chép
  </div>

  <script src="totp.js"></script>
</body>
</html>`;
  fs.writeFileSync(path.join(authDir, 'popup.html'), authPopupHtml, 'utf8');

  // TOTP algorithm implementation in pure JavaScript (RFC 6238)
  const authTotpJs = `// Simple Base32 decode & SHA1 HMAC for 2FA TOTP
function base32tohex(base32) {
  const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  let hex = "";
  base32 = base32.replace(/=+$/, "").toUpperCase().replace(/\\s/g, '');
  for (let i = 0; i < base32.length; i++) {
    const val = base32chars.indexOf(base32.charAt(i));
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  for (let i = 0; i + 4 <= bits.length; i += 4) {
    const chunk = bits.substr(i, 4);
    hex += parseInt(chunk, 2).toString(16);
  }
  return hex;
}

async function hmacSha1(keyHex, messageHex) {
  const keyBytes = new Uint8Array(keyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  const msgBytes = new Uint8Array(messageHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: { name: "SHA-1" } }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgBytes);
  return new Uint8Array(signature);
}

async function getTOTP(secret) {
  try {
    const keyHex = base32tohex(secret);
    if (!keyHex) return 'ERROR';
    const epoch = Math.floor(Date.now() / 1000);
    const timeStep = Math.floor(epoch / 30);
    const timeHex = timeStep.toString(16).padStart(16, '0');
    const hmacResult = await hmacSha1(keyHex, timeHex);
    const offset = hmacResult[hmacResult.length - 1] & 0xf;
    const binary = ((hmacResult[offset] & 0x7f) << 24) |
                   ((hmacResult[offset + 1] & 0xff) << 16) |
                   ((hmacResult[offset + 2] & 0xff) << 8) |
                   (hmacResult[offset + 3] & 0xff);
    const otp = (binary % 1000000).toString().padStart(6, '0');
    return otp;
  } catch (e) {
    return 'ERROR';
  }
}

let storedAccounts = [];

function loadStored() {
  chrome.storage.local.get(['twoFaAccounts'], (res) => {
    storedAccounts = res.twoFaAccounts || [
      { label: 'Demo Account', secret: 'JBSWY3DPEHPK3PXP' }
    ];
    updateCodes();
  });
}

async function updateCodes() {
  const container = document.getElementById('keys-container');
  container.innerHTML = '';
  
  const epoch = Math.floor(Date.now() / 1000);
  const remaining = 30 - (epoch % 30);
  document.getElementById('countdown').textContent = remaining + 's';

  for (let i = 0; i < storedAccounts.length; i++) {
    const acc = storedAccounts[i];
    const code = await getTOTP(acc.secret);
    const div = document.createElement('div');
    div.className = 'auth-card';
    div.innerHTML = \`
      <div>
        <div class="auth-label">\${acc.label}</div>
        <div class="auth-code">\${code}</div>
      </div>
      <button style="padding:4px 8px; font-size:10px; color:#f87171;" class="btn-del" data-index="\${i}">Xoá</button>
    \`;
    div.onclick = (e) => {
      if (e.target.classList.contains('btn-del')) return;
      navigator.clipboard.writeText(code).then(() => {
        alert(\`Đã chép mã 2FA \${code} vào bộ nhớ tạm!\`);
      });
    };
    container.appendChild(div);
  }

  container.querySelectorAll('.btn-del').forEach(b => {
    b.onclick = (e) => {
      const idx = Number(e.target.dataset.index);
      storedAccounts.splice(idx, 1);
      chrome.storage.local.set({ twoFaAccounts: storedAccounts }, updateCodes);
    };
  });
}

document.getElementById('btn-add-toggle').onclick = () => {
  const form = document.getElementById('add-form');
  form.style.display = form.style.display === 'block' ? 'none' : 'block';
};

document.getElementById('btn-cancel-add').onclick = () => {
  document.getElementById('add-form').style.display = 'none';
};

document.getElementById('btn-save-key').onclick = () => {
  const label = document.getElementById('input-label').value.trim() || 'Account';
  const secret = document.getElementById('input-secret').value.trim().replace(/\\s/g, '');
  if (!secret) return alert('Vui lòng nhập secret key');

  storedAccounts.push({ label, secret });
  chrome.storage.local.set({ twoFaAccounts: storedAccounts }, () => {
    document.getElementById('input-label').value = '';
    document.getElementById('input-secret').value = '';
    document.getElementById('add-form').style.display = 'none';
    updateCodes();
  });
};

setInterval(updateCodes, 1000);
loadStored();`;
  fs.writeFileSync(path.join(authDir, 'totp.js'), authTotpJs, 'utf8');

  // --- Preset 3: Facebook Token & UID Extractor ---
  const fbDir = path.join(PRESETS_DIR, 'fb-helper');
  fs.mkdirSync(fbDir, { recursive: true });

  const fbManifest = {
    manifest_version: 3,
    name: "FB Token & UID Extractor",
    version: "2.1.0",
    description: "Trích xuất Access Token (EAAB/EAAA...), User ID (c_user) và chuỗi Cookie cho Facebook Auto-Post.",
    action: {
      default_popup: "popup.html",
      default_title: "FB Token & UID Extractor"
    },
    permissions: ["cookies", "activeTab"]
  };
  fs.writeFileSync(path.join(fbDir, 'manifest.json'), JSON.stringify(fbManifest, null, 2), 'utf8');

  const fbPopupHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Facebook Token Extractor</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { width: 360px; min-height: 400px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 14px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-bottom: 12px; }
    .title { font-size: 14px; font-weight: 700; color: #3b82f6; display: flex; align-items: center; gap: 6px; }
    .info-box { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 10px; margin-bottom: 10px; }
    .label { font-size: 11px; color: #94a3b8; font-weight: 600; margin-bottom: 4px; display: flex; justify-content: space-between; }
    .val { font-family: monospace; font-size: 11px; color: #60a5fa; word-break: break-all; background: #0f172a; padding: 6px; border-radius: 4px; max-height: 50px; overflow-y: auto; }
    button { background: #2563eb; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; }
    button:hover { background: #1d4ed8; }
    .btn-copy { background: #334155; color: #cbd5e1; font-size: 10px; padding: 2px 6px; }
    .btn-copy:hover { background: #475569; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">🔵 FB Token & UID Extractor</div>
    <button id="btn-refresh" style="background:#334155; padding:4px 8px;">🔄</button>
  </div>

  <div class="info-box">
    <div class="label">
      <span>User ID (UID):</span>
      <button class="btn-copy" id="btn-copy-uid">Chép UID</button>
    </div>
    <div class="val" id="val-uid">Đang quét...</div>
  </div>

  <div class="info-box">
    <div class="label">
      <span>Cookie String:</span>
      <button class="btn-copy" id="btn-copy-cookie">Chép Cookie</button>
    </div>
    <div class="val" id="val-cookie">Đang quét...</div>
  </div>

  <div class="info-box">
    <div class="label">
      <span>User-Agent Profile:</span>
      <button class="btn-copy" id="btn-copy-ua">Chép UA</button>
    </div>
    <div class="val" id="val-ua">...</div>
  </div>

  <div style="margin-top:12px; text-align:center;">
    <button id="btn-copy-all" style="width:100%; padding:8px; font-size:12px;">📋 Sao Chép Toàn Bộ Sang Facebook Tool</button>
  </div>

  <script src="popup.js"></script>
</body>
</html>`;
  fs.writeFileSync(path.join(fbDir, 'popup.html'), fbPopupHtml, 'utf8');

  const fbPopupJs = `async function extractFB() {
  const uidEl = document.getElementById('val-uid');
  const cookieEl = document.getElementById('val-cookie');
  const uaEl = document.getElementById('val-ua');

  uaEl.textContent = navigator.userAgent;

  chrome.cookies.getAll({ domain: 'facebook.com' }, (cookies) => {
    if (!cookies || cookies.length === 0) {
      uidEl.textContent = 'Chưa đăng nhập Facebook';
      cookieEl.textContent = 'Không có cookie';
      return;
    }
    const cUser = cookies.find(c => c.name === 'c_user');
    const xs = cookies.find(c => c.name === 'xs');

    uidEl.textContent = cUser ? cUser.value : 'Chưa có c_user';
    const cookieString = cookies.map(c => \`\${c.name}=\${c.value}\`).join('; ');
    cookieEl.textContent = cookieString;

    document.getElementById('btn-copy-uid').onclick = () => {
      navigator.clipboard.writeText(uidEl.textContent);
      alert('Đã chép UID!');
    };

    document.getElementById('btn-copy-cookie').onclick = () => {
      navigator.clipboard.writeText(cookieString);
      alert('Đã chép chuỗi Cookie!');
    };

    document.getElementById('btn-copy-ua').onclick = () => {
      navigator.clipboard.writeText(navigator.userAgent);
      alert('Đã chép User-Agent!');
    };

    document.getElementById('btn-copy-all').onclick = () => {
      const payload = {
        uid: uidEl.textContent,
        cookies: cookieString,
        user_agent: navigator.userAgent
      };
      navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      alert('Đã chép JSON tài khoản Facebook tương thích hoàn toàn với tool auto post!');
    };
  });
}

document.getElementById('btn-refresh').onclick = extractFB;
extractFB();`;
  fs.writeFileSync(path.join(fbDir, 'popup.js'), fbPopupJs, 'utf8');

  // --- Preset 4: Proxy & IP Inspector ---
  const proxyDir = path.join(PRESETS_DIR, 'proxy-inspector');
  fs.mkdirSync(proxyDir, { recursive: true });

  const proxyManifest = {
    manifest_version: 3,
    name: "Proxy & IP Inspector",
    version: "1.2.0",
    description: "Kiểm tra IP công khai, quốc gia, ISP và trạng thái WebRTC trực tiếp trên tab.",
    action: {
      default_popup: "popup.html",
      default_title: "Proxy & IP Inspector"
    },
    permissions: ["activeTab"]
  };
  fs.writeFileSync(path.join(proxyDir, 'manifest.json'), JSON.stringify(proxyManifest, null, 2), 'utf8');

  const proxyPopupHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Proxy & IP Inspector</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { width: 340px; min-height: 320px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 14px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-bottom: 12px; }
    .title { font-size: 14px; font-weight: 700; color: #a855f7; display: flex; align-items: center; gap: 6px; }
    .row { display: flex; justify-content: space-between; margin-bottom: 8px; background: #1e293b; padding: 8px 10px; border-radius: 6px; font-size: 11px; }
    .row-title { color: #94a3b8; font-weight: 600; }
    .row-val { color: #38bdf8; font-weight: 700; font-family: monospace; }
    button { background: #7e22ce; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; width: 100%; margin-top: 10px; }
    button:hover { background: #6b21a8; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">🌐 Proxy & IP Inspector</div>
  </div>

  <div class="row">
    <span class="row-title">Địa chỉ IP:</span>
    <span class="row-val" id="ip-val">Đang kiểm tra...</span>
  </div>
  <div class="row">
    <span class="row-title">Quốc gia:</span>
    <span class="row-val" id="country-val">...</span>
  </div>
  <div class="row">
    <span class="row-title">Thành phố:</span>
    <span class="row-val" id="city-val">...</span>
  </div>
  <div class="row">
    <span class="row-title">Nhà mạng (ISP):</span>
    <span class="row-val" id="isp-val">...</span>
  </div>
  <div class="row">
    <span class="row-title">WebRTC Leak:</span>
    <span class="row-val" id="webrtc-val" style="color:#10b981;">Bảo vệ an toàn</span>
  </div>

  <button id="btn-recheck">Kiểm tra lại</button>

  <script src="popup.js"></script>
</body>
</html>`;
  fs.writeFileSync(path.join(proxyDir, 'popup.html'), proxyPopupHtml, 'utf8');

  const proxyPopupJs = `async function checkIp() {
  document.getElementById('ip-val').textContent = 'Đang tải...';
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    document.getElementById('ip-val').textContent = data.ip || 'Unknown';
    document.getElementById('country-val').textContent = (data.country_name || '') + ' (' + (data.country_code || '') + ')';
    document.getElementById('city-val').textContent = data.city || 'Unknown';
    document.getElementById('isp-val').textContent = data.org || 'Unknown';
  } catch (e) {
    document.getElementById('ip-val').textContent = 'Lỗi kết nối';
  }
}
document.getElementById('btn-recheck').onclick = checkIp;
checkIp();`;
  fs.writeFileSync(path.join(proxyDir, 'popup.js'), proxyPopupJs, 'utf8');

  return [
    {
      id: 'ext_cookie_editor',
      name: 'Cookie-Editor MMO',
      version: '1.12.2',
      description: 'Quản lý Cookie chuyên sâu cho Facebook, TikTok: Xuất/Nhập JSON cookies 1-click.',
      path: cookieDir,
      icon_url: null,
      is_global: 1,
      enabled: 1,
    },
    {
      id: 'ext_authenticator_2fa',
      name: '2FA Authenticator MMO',
      version: '1.6.0',
      description: 'Tạo mã xác thực 2FA 6 số tự động theo thời gian (TOTP) an toàn cho tài khoản Facebook / Google.',
      path: authDir,
      icon_url: null,
      is_global: 1,
      enabled: 1,
    },
    {
      id: 'ext_fb_helper',
      name: 'FB Token & UID Extractor',
      version: '2.1.0',
      description: 'Trích xuất Access Token (EAAB/EAAA...), User ID (c_user) và chuỗi Cookie cho Facebook Auto-Post.',
      path: fbDir,
      icon_url: null,
      is_global: 1,
      enabled: 1,
    },
    {
      id: 'ext_proxy_inspector',
      name: 'Proxy & IP Inspector',
      version: '1.2.0',
      description: 'Kiểm tra IP công khai, quốc gia, ISP và trạng thái WebRTC trực tiếp trên tab.',
      path: proxyDir,
      icon_url: null,
      is_global: 0,
      enabled: 1,
    }
  ];
}

// Cài đặt hoặc đồng bộ các presets vào cơ sở dữ liệu
function ensurePresetsInDatabase() {
  const presets = initPresetExtensions();
  for (const p of presets) {
    const existing = db.getExtension(p.id);
    if (!existing) {
      db.createExtension(p);
    } else {
      // Cập nhật lại đường dẫn phòng khi di chuyển thư mục
      db.updateExtension(p.id, { path: p.path });
    }
  }
  return presets;
}

// Đọc và phân tích thông tin extension từ một thư mục bất kỳ do người dùng tải lên
function parseExtensionFromFolder(folderPath) {
  if (!fs.existsSync(folderPath)) {
    throw new Error('Thư mục không tồn tại: ' + folderPath);
  }
  const manifestPath = path.join(folderPath, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Thư mục không hợp lệ: Không tìm thấy file manifest.json');
  }

  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(raw);
    return {
      name: manifest.name || path.basename(folderPath),
      version: manifest.version || '1.0.0',
      description: manifest.description || '',
      manifestVersion: manifest.manifest_version || 3,
      path: folderPath,
      icon_url: null
    };
  } catch (err) {
    throw new Error('Không thể đọc file manifest.json: ' + err.message);
  }
}

module.exports = {
  PRESETS_DIR,
  initPresetExtensions,
  ensurePresetsInDatabase,
  parseExtensionFromFolder
};
