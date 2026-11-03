const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const cssPath = path.join(__dirname, '..', 'public', 'style.css');

let html = fs.readFileSync(htmlPath, 'utf8');

// 1. Upgrade Header Login Button
html = html.replace(
  /<button class="btn btn-primary btn-sm" id="btn-header-login"[\s\S]*?<\/button>/m,
  `<!-- Guest state: Open Login Modal Button (pixbugius AI Platform Style) -->
            <button class="pix-btn-header-login" id="btn-header-login" title="Nhấn để Đăng Nhập hoặc Tạo Tài Khoản">
              <span class="pix-btn-shimmer"></span>
              <svg class="pix-btn-star" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
              </svg>
              <span class="pix-btn-label">Đăng Nhập</span>
              <svg class="pix-btn-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>`
);

// 2. Upgrade Auth Modal Header Icon to AI Sparkle Squircle
html = html.replace(
  /<div class="auth-modal-header-icon">[\s\S]*?<\/div>/m,
  `<div class="auth-modal-header-icon pix-header-ai-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            </svg>
          </div>`
);

// 3. Upgrade Auth Submit Buttons with Shimmer
html = html.replace(
  /<button type="submit" class="[^"]*auth-submit-btn" id="btn-submit-login">[\s\S]*?<\/button>/m,
  `<button type="submit" class="auth-submit-btn pix-btn-submit-login" id="btn-submit-login">
          <span class="pix-btn-shimmer"></span>
          <span>Đăng Nhập Ngay</span>
          <svg class="pix-submit-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>`
);

html = html.replace(
  /<button type="submit" class="[^"]*auth-submit-btn" id="btn-submit-register">[\s\S]*?<\/button>/m,
  `<button type="submit" class="auth-submit-btn pix-btn-submit-reg" id="btn-submit-register">
          <span class="pix-btn-shimmer"></span>
          <span>Tạo Tài Khoản Mới</span>
          <svg class="pix-submit-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>`
);

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('HTML upgraded to pixbugius AI platform layout successfully!');
