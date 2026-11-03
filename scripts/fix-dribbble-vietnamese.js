const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const cssPath = path.join(__dirname, '..', 'public', 'style.css');
const appJsPath = path.join(__dirname, '..', 'public', 'app.js');

let html = fs.readFileSync(htmlPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// 1. UPDATE HTML: VIETNAMESE + IMAGE 2 CENTERED PILL BUTTON + FORGOT LINK BELOW BUTTON
const newAuthModalHtml = `  <!-- ================= AUTH MODAL (EXACT DRIBBLE IMAGE 2 - TIẾNG VIỆT) ================= -->
  <div class="modal-overlay modal" id="auth-modal" style="display: none;">
    <div class="modal-card dribbble-auth-card">
      <!-- Close Button (Clean & Subtle) -->
      <button class="dribbble-auth-close" id="auth-modal-close" title="Đóng">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <!-- Header: Title on Left + Switch Link on Right (Image 2) -->
      <div class="dribbble-auth-header">
        <h1 class="dribbble-auth-title" id="auth-modal-title">Đăng Nhập</h1>
        <a href="javascript:void(0)" class="dribbble-auth-switch-link" id="auth-modal-switch-link">Đăng Ký</a>
      </div>

      <!-- Hidden tabs for backwards compatibility -->
      <div style="display: none;">
        <button id="tab-btn-login" class="active"></button>
        <button id="tab-btn-register"></button>
      </div>

      <!-- LOGIN FORM -->
      <form id="form-auth-login" class="dribbble-auth-form" novalidate>
        <div class="dribbble-field-group">
          <label class="dribbble-label" for="auth-login-email">Email của bạn</label>
          <input type="email" id="auth-login-email" class="dribbble-input" required placeholder="name@example.com">
        </div>

        <div class="dribbble-field-group">
          <label class="dribbble-label" for="auth-login-password">Mật khẩu</label>
          <div class="dribbble-input-wrap">
            <input type="password" id="auth-login-password" class="dribbble-input dribbble-input-pass" required placeholder="Nhập mật khẩu...">
            <button type="button" class="dribbble-eye-btn" id="btn-toggle-login-pass" title="Hiện/ẩn mật khẩu">
              <svg class="eye-icon-show" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg class="eye-icon-hide" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-.722-3.25"/><path d="M2 8a10.645 10.645 0 0 0 20 0"/><path d="m20 15-1.726-2.05"/><path d="m4 15 1.726-2.05"/><path d="m9 18 .722-3.25"/></svg>
            </button>
          </div>
        </div>

        <div class="dribbble-extra-row">
          <label class="dribbble-checkbox-label">
            <input type="checkbox" id="auth-remember-me" checked>
            <span>Ghi nhớ đăng nhập</span>
          </label>
        </div>

        <div class="dribbble-btn-wrap">
          <button type="submit" class="dribbble-submit-btn" id="btn-submit-login">
            <span>Đăng Nhập</span>
          </button>
          <a href="javascript:void(0)" id="auth-forgot-pass-link" class="dribbble-forgot-link">Quên mật khẩu?</a>
        </div>
      </form>

      <!-- REGISTER FORM (Hidden by default) -->
      <form id="form-auth-register" class="dribbble-auth-form auth-hidden" style="display: none;" novalidate>
        <div class="dribbble-field-group">
          <label class="dribbble-label" for="auth-reg-name">Họ và tên</label>
          <input type="text" id="auth-reg-name" class="dribbble-input" placeholder="Nhập họ và tên...">
        </div>

        <div class="dribbble-field-group">
          <label class="dribbble-label" for="auth-reg-email">Email của bạn</label>
          <input type="email" id="auth-reg-email" class="dribbble-input" required placeholder="name@example.com">
        </div>

        <div class="dribbble-field-group">
          <label class="dribbble-label" for="auth-reg-password">Mật khẩu (tối thiểu 6 ký tự)</label>
          <div class="dribbble-input-wrap">
            <input type="password" id="auth-reg-password" class="dribbble-input dribbble-input-pass" required minlength="6" placeholder="Nhập mật khẩu mới...">
            <button type="button" class="dribbble-eye-btn" id="btn-toggle-reg-pass" title="Hiện/ẩn mật khẩu">
              <svg class="eye-icon-show" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg class="eye-icon-hide" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-.722-3.25"/><path d="M2 8a10.645 10.645 0 0 0 20 0"/><path d="m20 15-1.726-2.05"/><path d="m4 15 1.726-2.05"/><path d="m9 18 .722-3.25"/></svg>
            </button>
          </div>
        </div>

        <div class="dribbble-field-group">
          <label class="dribbble-label" for="auth-reg-confirm">Xác nhận mật khẩu</label>
          <div class="dribbble-input-wrap">
            <input type="password" id="auth-reg-confirm" class="dribbble-input dribbble-input-pass" required minlength="6" placeholder="Nhập lại mật khẩu để xác nhận...">
            <button type="button" class="dribbble-eye-btn" id="btn-toggle-reg-confirm" title="Hiện/ẩn mật khẩu">
              <svg class="eye-icon-show" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg class="eye-icon-hide" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-.722-3.25"/><path d="M2 8a10.645 10.645 0 0 0 20 0"/><path d="m20 15-1.726-2.05"/><path d="m4 15 1.726-2.05"/><path d="m9 18 .722-3.25"/></svg>
            </button>
          </div>
        </div>

        <div class="dribbble-btn-wrap">
          <button type="submit" class="dribbble-submit-btn" id="btn-submit-register">
            <span>Tạo Tài Khoản</span>
          </button>
        </div>
      </form>
    </div>
  </div>`;

// Replace existing auth-modal in index.html
const modalRegex = /<!-- =+ AUTH MODAL[\s\S]*?<\/form>\s*<\/div>\s*<\/div>/m;
if (!modalRegex.test(html)) {
  console.error('Could not find auth-modal in index.html');
  process.exit(1);
}
html = html.replace(modalRegex, newAuthModalHtml);
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('index.html updated with Vietnamese Dribbble layout');

// 2. UPDATE CSS: FIX DISPLAY NONE OVERRIDE & CENTERED BUTTON
const cssSectionRegex = /\/\* =============================================================\s*DRIBBLE MINIMALIST AI PLATFORM LOGIN[\s\S]*?\/\* The Dribbble Royal Blue Pill Button[\s\S]*?}\s*}/m;

const newCssSection = `/* =============================================================
   DRIBBLE MINIMALIST AI PLATFORM LOGIN (IMAGE 2 REPLICA - VIETNAMESE)
   - Pure, spacious, distraction-free
   - Large rounded corners (32px), clean labels, centered royal blue pill button
   ============================================================= */

.dribbble-auth-card {
  position: relative !important;
  max-width: 420px !important;
  width: 420px !important;
  padding: 40px 36px 36px 36px !important;
  border-radius: 32px !important;
  background: #FFFFFF !important;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
  box-shadow: 0 24px 70px -10px rgba(0, 0, 0, 0.16) !important;
  overflow: visible !important;
}

[data-theme="dark"] .dribbble-auth-card {
  background: #111318 !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  box-shadow: 0 30px 80px -10px rgba(0, 0, 0, 0.7), 0 0 40px rgba(37, 99, 235, 0.1) !important;
}

/* Subtle Close Button in Top-Right */
.dribbble-auth-close {
  position: absolute;
  top: 22px;
  right: 22px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #9CA3AF;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
}

.dribbble-auth-close:hover {
  background: #F3F4F6;
  color: #111827;
}

[data-theme="dark"] .dribbble-auth-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #FFFFFF;
}

/* Header: Clean Title + Switch Link */
.dribbble-auth-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 26px;
  padding-right: 24px;
}

.dribbble-auth-title {
  font-family: var(--font-family) !important;
  font-size: 26px !important;
  font-weight: 700 !important;
  color: #111827 !important;
  margin: 0 !important;
  letter-spacing: -0.02em;
}

[data-theme="dark"] .dribbble-auth-title {
  color: #FFFFFF !important;
}

.dribbble-auth-switch-link {
  font-family: var(--font-family);
  font-size: 14.5px;
  font-weight: 600;
  color: #2563EB;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.15s ease;
}

.dribbble-auth-switch-link:hover {
  color: #1D4ED8;
  text-decoration: underline;
}

/* Form Container & Strictly Respect Display None */
.dribbble-auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0;
  margin: 0;
}

.dribbble-auth-form.auth-hidden,
.dribbble-auth-form[style*="display: none"] {
  display: none !important;
}

.dribbble-field-group {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin: 0;
}

.dribbble-label {
  font-family: var(--font-family);
  font-size: 13.5px;
  font-weight: 500;
  color: #4B5563;
  letter-spacing: -0.01em;
  margin: 0;
}

[data-theme="dark"] .dribbble-label {
  color: #9CA3AF;
}

/* Pristine Rounded Inputs */
.dribbble-input {
  width: 100% !important;
  box-sizing: border-box !important;
  height: 50px !important;
  padding: 0 16px !important;
  font-family: var(--font-family) !important;
  font-size: 14.5px !important;
  font-weight: 400 !important;
  border-radius: 14px !important;
  border: 1.5px solid #E5E7EB !important;
  background: #FFFFFF !important;
  color: #111827 !important;
  transition: all 0.2s ease !important;
  box-shadow: none !important;
}

[data-theme="dark"] .dribbble-input {
  background: rgba(255, 255, 255, 0.04) !important;
  border-color: rgba(255, 255, 255, 0.12) !important;
  color: #F9FAFB !important;
}

.dribbble-input::placeholder {
  color: #9CA3AF !important;
  font-weight: 400;
  opacity: 0.8;
}

.dribbble-input:focus {
  border-color: #2563EB !important;
  box-shadow: 0 0 0 3.5px rgba(37, 99, 235, 0.12) !important;
  outline: none !important;
  background: #FFFFFF !important;
}

[data-theme="dark"] .dribbble-input:focus {
  background: rgba(255, 255, 255, 0.07) !important;
  border-color: #3B82F6 !important;
  box-shadow: 0 0 0 3.5px rgba(59, 130, 246, 0.2) !important;
}

.dribbble-input-wrap {
  position: relative;
  width: 100%;
}

.dribbble-input-pass {
  padding-right: 46px !important;
}

.dribbble-eye-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #9CA3AF;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 6px;
  transition: color 0.15s ease;
}

.dribbble-eye-btn:hover {
  color: #2563EB;
}

.dribbble-eye-btn .eye-icon-show { display: block; }
.dribbble-eye-btn .eye-icon-hide { display: none; }
.dribbble-eye-btn.revealed .eye-icon-show { display: none; }
.dribbble-eye-btn.revealed .eye-icon-hide { display: block; color: #2563EB; }

/* Subtle Checkbox Row */
.dribbble-extra-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: -2px;
}

.dribbble-checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 400;
  color: #6B7280;
  cursor: pointer;
  user-select: none;
}

[data-theme="dark"] .dribbble-checkbox-label {
  color: #9CA3AF;
}

.dribbble-checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #2563EB;
  cursor: pointer;
}

/* Centered Pill Button & Forgot Link Container (Image 2) */
.dribbble-btn-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 10px;
  gap: 14px;
}

.dribbble-submit-btn {
  width: auto !important;
  min-width: 170px !important;
  padding: 0 42px !important;
  height: 48px !important;
  border-radius: 9999px !important;
  background: #2563EB !important;
  color: #FFFFFF !important;
  font-family: var(--font-family) !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  border: none !important;
  cursor: pointer !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.28) !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  user-select: none !important;
}

.dribbble-submit-btn:hover {
  background: #1D4ED8 !important;
  box-shadow: 0 12px 26px rgba(37, 99, 235, 0.4) !important;
  transform: translateY(-1.5px) !important;
}

.dribbble-submit-btn:active {
  transform: translateY(1px) !important;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25) !important;
}

.dribbble-forgot-link {
  font-family: var(--font-family);
  font-size: 13.5px;
  color: #9CA3AF;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.15s ease;
}

.dribbble-forgot-link:hover {
  color: #2563EB;
  text-decoration: underline;
}`;

if (cssSectionRegex.test(css)) {
  css = css.replace(cssSectionRegex, newCssSection);
  fs.writeFileSync(cssPath, css, 'utf8');
  console.log('style.css updated with centered pill and fixed display none');
} else {
  console.warn('cssSectionRegex did not match, appending to style.css');
  css += '\n' + newCssSection;
  fs.writeFileSync(cssPath, css, 'utf8');
}

// 3. UPDATE APP.JS: SWITCHTAB TO VIETNAMESE + TOGGLE AUTH-HIDDEN CLASS
let appJsNormalized = appJs.replace(/\r\n/g, '\n');

const switchFunctionRegex = /let currentAuthTab = 'login';[\s\S]*?if \(tabReg\) tabReg\.onclick = \(\) => switchAuthTab\('register'\);/m;

const newSwitchFunction = `let currentAuthTab = 'login';
  const switchLink = document.getElementById('auth-modal-switch-link');

  function switchAuthTab(tab) {
    currentAuthTab = tab;
    if (tab === 'login') {
      if (formLogin) {
        formLogin.style.display = 'flex';
        formLogin.classList.remove('auth-hidden');
      }
      if (formReg) {
        formReg.style.display = 'none';
        formReg.classList.add('auth-hidden');
      }
      if (authTitle) authTitle.textContent = 'Đăng Nhập';
      if (switchLink) switchLink.textContent = 'Đăng Ký';
    } else {
      if (formLogin) {
        formLogin.style.display = 'none';
        formLogin.classList.add('auth-hidden');
      }
      if (formReg) {
        formReg.style.display = 'flex';
        formReg.classList.remove('auth-hidden');
      }
      if (authTitle) authTitle.textContent = 'Đăng Ký';
      if (switchLink) switchLink.textContent = 'Đăng Nhập';
    }
  }

  if (switchLink) {
    switchLink.onclick = (e) => {
      e.preventDefault();
      switchAuthTab(currentAuthTab === 'login' ? 'register' : 'login');
    };
  }
  if (tabLogin) tabLogin.onclick = () => switchAuthTab('login');
  if (tabReg) tabReg.onclick = () => switchAuthTab('register');`;

if (switchFunctionRegex.test(appJsNormalized)) {
  appJsNormalized = appJsNormalized.replace(switchFunctionRegex, newSwitchFunction);
  fs.writeFileSync(appJsPath, appJsNormalized.replace(/\n/g, '\r\n'), 'utf8');
  console.log('app.js updated with Vietnamese switchAuthTab and class toggle');
} else {
  console.error('Could not find switchFunctionRegex in app.js');
}
