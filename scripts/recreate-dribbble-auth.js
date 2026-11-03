const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const cssPath = path.join(__dirname, '..', 'public', 'style.css');
const appJsPath = path.join(__dirname, '..', 'public', 'app.js');

let html = fs.readFileSync(htmlPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// 1. REFRESH AUTH MODAL HTML TO EXACT IMAGE 1 (DRIBBLE)
const newAuthModalHtml = `  <!-- ================= AUTH MODAL (EXACT DRIBBLE IMAGE 1 REPLICA) ================= -->
  <div class="modal-overlay modal" id="auth-modal" style="display: none;">
    <div class="modal-card dribbble-auth-card">
      <!-- Close Button (Clean & Subtle) -->
      <button class="dribbble-auth-close" id="auth-modal-close" title="Đóng">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <!-- Header: Title on Left + Switch Link on Right (Image 1) -->
      <div class="dribbble-auth-header">
        <h1 class="dribbble-auth-title" id="auth-modal-title">Log In</h1>
        <a href="javascript:void(0)" class="dribbble-auth-switch-link" id="auth-modal-switch-link">Sign Up</a>
      </div>

      <!-- Hidden tabs for backwards compatibility if needed -->
      <div style="display: none;">
        <button id="tab-btn-login" class="active"></button>
        <button id="tab-btn-register"></button>
      </div>

      <!-- LOGIN FORM -->
      <form id="form-auth-login" class="dribbble-auth-form" novalidate>
        <div class="dribbble-field-group">
          <label class="dribbble-label" for="auth-login-email">Your email</label>
          <input type="email" id="auth-login-email" class="dribbble-input" required placeholder="name@example.com">
        </div>

        <div class="dribbble-field-group">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label class="dribbble-label" for="auth-login-password">Your password</label>
            <a href="javascript:void(0)" id="auth-forgot-pass-link" style="font-size: 13px; color: #2563EB; text-decoration: none;">Forgot?</a>
          </div>
          <div class="dribbble-input-wrap">
            <input type="password" id="auth-login-password" class="dribbble-input dribbble-input-pass" required placeholder="Enter your password">
            <button type="button" class="dribbble-eye-btn" id="btn-toggle-login-pass" title="Hiện/ẩn mật khẩu">
              <svg class="eye-icon-show" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg class="eye-icon-hide" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-.722-3.25"/><path d="M2 8a10.645 10.645 0 0 0 20 0"/><path d="m20 15-1.726-2.05"/><path d="m4 15 1.726-2.05"/><path d="m9 18 .722-3.25"/></svg>
            </button>
          </div>
        </div>

        <div class="dribbble-extra-row">
          <label class="dribbble-checkbox-label">
            <input type="checkbox" id="auth-remember-me" checked>
            <span>Remember me on this device</span>
          </label>
        </div>

        <button type="submit" class="dribbble-submit-btn" id="btn-submit-login">
          <span>Log In</span>
        </button>
      </form>

      <!-- REGISTER FORM -->
      <form id="form-auth-register" class="dribbble-auth-form" style="display: none;" novalidate>
        <div class="dribbble-field-group">
          <label class="dribbble-label" for="auth-reg-name">Your full name</label>
          <input type="text" id="auth-reg-name" class="dribbble-input" placeholder="e.g. Alex Johnson">
        </div>

        <div class="dribbble-field-group">
          <label class="dribbble-label" for="auth-reg-email">Your email</label>
          <input type="email" id="auth-reg-email" class="dribbble-input" required placeholder="name@example.com">
        </div>

        <div class="dribbble-field-group">
          <label class="dribbble-label" for="auth-reg-password">Password (min. 6 characters)</label>
          <div class="dribbble-input-wrap">
            <input type="password" id="auth-reg-password" class="dribbble-input dribbble-input-pass" required minlength="6" placeholder="Create a strong password">
            <button type="button" class="dribbble-eye-btn" id="btn-toggle-reg-pass" title="Hiện/ẩn mật khẩu">
              <svg class="eye-icon-show" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg class="eye-icon-hide" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-.722-3.25"/><path d="M2 8a10.645 10.645 0 0 0 20 0"/><path d="m20 15-1.726-2.05"/><path d="m4 15 1.726-2.05"/><path d="m9 18 .722-3.25"/></svg>
            </button>
          </div>
        </div>

        <div class="dribbble-field-group">
          <label class="dribbble-label" for="auth-reg-confirm">Confirm password</label>
          <div class="dribbble-input-wrap">
            <input type="password" id="auth-reg-confirm" class="dribbble-input dribbble-input-pass" required minlength="6" placeholder="Repeat your password">
            <button type="button" class="dribbble-eye-btn" id="btn-toggle-reg-confirm" title="Hiện/ẩn mật khẩu">
              <svg class="eye-icon-show" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg class="eye-icon-hide" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-.722-3.25"/><path d="M2 8a10.645 10.645 0 0 0 20 0"/><path d="m20 15-1.726-2.05"/><path d="m4 15 1.726-2.05"/><path d="m9 18 .722-3.25"/></svg>
            </button>
          </div>
        </div>

        <button type="submit" class="dribbble-submit-btn" id="btn-submit-register">
          <span>Sign Up</span>
        </button>
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
console.log('index.html updated with Dribbble minimal layout');

// 2. UPDATE CSS FOR DRIBBLE LAYOUT
const dribbbleCss = `
/* =============================================================
   DRIBBLE MINIMALIST AI PLATFORM LOGIN (IMAGE 1 REPLICA)
   - Pure, spacious, distraction-free
   - Large rounded corners (32px), clean labels, royal blue pill button
   ============================================================= */

.dribbble-auth-card {
  position: relative !important;
  max-width: 460px !important;
  width: 460px !important;
  padding: 44px 40px 40px 40px !important;
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
  width: 34px;
  height: 34px;
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
  margin-bottom: 28px;
  padding-right: 28px;
}

.dribbble-auth-title {
  font-family: var(--font-family) !important;
  font-size: 28px !important;
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
  font-size: 15px;
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

/* Form Container & Spacious 24px Gap */
.dribbble-auth-form {
  display: flex !important;
  flex-direction: column !important;
  gap: 22px !important;
  padding: 0 !important;
  margin: 0 !important;
}

.dribbble-field-group {
  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;
  margin: 0 !important;
}

.dribbble-label {
  font-family: var(--font-family) !important;
  font-size: 14.5px !important;
  font-weight: 500 !important;
  color: #374151 !important;
  letter-spacing: -0.01em;
  margin: 0 !important;
}

[data-theme="dark"] .dribbble-label {
  color: #9CA3AF !important;
}

/* Pristine Rounded Inputs */
.dribbble-input {
  width: 100% !important;
  box-sizing: border-box !important;
  height: 52px !important;
  padding: 0 18px !important;
  font-family: var(--font-family) !important;
  font-size: 15px !important;
  font-weight: 400 !important;
  border-radius: 16px !important;
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
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12) !important;
  outline: none !important;
  background: #FFFFFF !important;
}

[data-theme="dark"] .dribbble-input:focus {
  background: rgba(255, 255, 255, 0.07) !important;
  border-color: #3B82F6 !important;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2) !important;
}

.dribbble-input-wrap {
  position: relative;
  width: 100%;
}

.dribbble-input-pass {
  padding-right: 48px !important;
}

.dribbble-eye-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #9CA3AF;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 8px;
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
  margin-top: -4px;
}

.dribbble-checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  font-weight: 400;
  color: #6B7280;
  cursor: pointer;
  user-select: none;
}

[data-theme="dark"] .dribbble-checkbox-label {
  color: #9CA3AF;
}

.dribbble-checkbox-label input[type="checkbox"] {
  width: 17px;
  height: 17px;
  accent-color: #2563EB;
  cursor: pointer;
}

/* The Dribbble Royal Blue Pill Button (Image 1) */
.dribbble-submit-btn {
  width: 100% !important;
  height: 52px !important;
  border-radius: 9999px !important;
  background: #2563EB !important;
  color: #FFFFFF !important;
  font-family: var(--font-family) !important;
  font-size: 15.5px !important;
  font-weight: 600 !important;
  border: none !important;
  cursor: pointer !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  margin-top: 6px !important;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3) !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  user-select: none !important;
}

.dribbble-submit-btn:hover {
  background: #1D4ED8 !important;
  box-shadow: 0 12px 28px rgba(37, 99, 235, 0.45) !important;
  transform: translateY(-1.5px) !important;
}

.dribbble-submit-btn:active {
  transform: translateY(1px) !important;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25) !important;
}
`;

css += dribbbleCss;
fs.writeFileSync(cssPath, css, 'utf8');
console.log('style.css updated with Dribbble replica styles');

// 3. UPDATE APP.JS SWITCH FUNCTION
let appJsNormalized = appJs.replace(/\r\n/g, '\n');

const switchOldRegex = /function switchAuthTab\(tab\) {[\s\S]*?if \(tabReg\) tabReg\.onclick = \(\) => switchAuthTab\('register'\);/m;

const switchNew = `let currentAuthTab = 'login';
  const switchLink = document.getElementById('auth-modal-switch-link');

  function switchAuthTab(tab) {
    currentAuthTab = tab;
    if (tab === 'login') {
      if (formLogin) formLogin.style.display = 'flex';
      if (formReg) formReg.style.display = 'none';
      if (authTitle) authTitle.textContent = 'Log In';
      if (switchLink) switchLink.textContent = 'Sign Up';
    } else {
      if (formLogin) formLogin.style.display = 'none';
      if (formReg) formReg.style.display = 'flex';
      if (authTitle) authTitle.textContent = 'Sign Up';
      if (switchLink) switchLink.textContent = 'Log In';
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

if (switchOldRegex.test(appJsNormalized)) {
  appJsNormalized = appJsNormalized.replace(switchOldRegex, switchNew);
  fs.writeFileSync(appJsPath, appJsNormalized.replace(/\n/g, '\r\n'), 'utf8');
  console.log('app.js updated with switchLink toggle successfully!');
} else {
  console.warn('Could not find switchOldRegex in app.js, checking alternate search');
}
