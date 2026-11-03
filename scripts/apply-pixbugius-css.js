const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'public', 'style.css');
let css = fs.readFileSync(cssPath, 'utf8');

const targetSectionRegex = /\/\* =============================================================\s*MODERN AUTH MODAL & FORM CONTROLS[\s\S]*?\/\* Ensure all modal form-controls have 100% width and box-sizing \*\//m;

const replacementCss = `/* =============================================================
   STAN YAKUSEVYCH (pixbugius) AI PLATFORM INTERACTION STYLES
   - Hologram ambient glows, dark cyber glassmorphism, spring physics
   - Segmented luminous capsule tabs, iridescent shimmer buttons
   ============================================================= */

/* 1. Header Login Button (Signature pixbugius floating AI capsule) */
.pix-btn-header-login {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 16px;
  border-radius: 9999px;
  border: 1px solid rgba(168, 85, 247, 0.45);
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.22) 0%, rgba(124, 58, 237, 0.3) 50%, rgba(37, 99, 235, 0.22) 100%);
  color: #FFFFFF;
  font-family: var(--font-family);
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 0 18px rgba(124, 58, 237, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(12px);
  transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
  user-select: none;
}

[data-theme="light"] .pix-btn-header-login {
  background: linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #7C3AED 100%);
  border: 1px solid #4338CA;
  color: #FFFFFF;
  box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.pix-btn-header-login:hover {
  transform: translateY(-1.5px);
  border-color: rgba(192, 132, 252, 0.7);
  box-shadow: 0 0 28px rgba(168, 85, 247, 0.55), 0 4px 16px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

[data-theme="light"] .pix-btn-header-login:hover {
  box-shadow: 0 6px 20px rgba(79, 70, 229, 0.45), 0 0 20px rgba(124, 58, 237, 0.3);
}

.pix-btn-header-login:active {
  transform: translateY(1px) scale(0.97);
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
}

.pix-btn-star {
  color: #C084FC;
  flex-shrink: 0;
  transition: transform 0.4s ease;
}

.pix-btn-header-login:hover .pix-btn-star {
  transform: rotate(90deg) scale(1.15);
  color: #E9D5FF;
}

.pix-btn-arrow {
  color: rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.pix-btn-header-login:hover .pix-btn-arrow {
  transform: translateX(3px);
  color: #FFFFFF;
}

/* Shimmer Beam Animation across buttons */
.pix-btn-shimmer {
  position: absolute;
  top: 0;
  left: -100%;
  width: 60%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.28), transparent);
  transform: skewX(-20deg);
  pointer-events: none;
}

.pix-btn-header-login:hover .pix-btn-shimmer,
.auth-submit-btn:hover .pix-btn-shimmer {
  animation: pixShimmerSweep 0.9s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes pixShimmerSweep {
  0% { left: -100%; }
  100% { left: 200%; }
}

/* 2. Modal Card (Deep Cyber Glassmorphism) */
.auth-modal-card {
  max-width: 490px !important;
  width: 490px !important;
  border-radius: 24px !important;
  overflow: hidden !important;
  background: radial-gradient(130% 120% at 50% -10%, rgba(99, 102, 241, 0.18) 0%, rgba(13, 15, 25, 0.98) 60%), #0A0B10 !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06) inset, 0 32px 80px -15px rgba(0, 0, 0, 0.85), 0 0 60px -10px rgba(99, 102, 241, 0.25) !important;
  backdrop-filter: blur(32px) !important;
}

[data-theme="light"] .auth-modal-card {
  background: radial-gradient(120% 120% at 50% 0%, rgba(238, 242, 255, 0.9) 0%, #FFFFFF 65%) !important;
  border: 1.5px solid #E2E8F0 !important;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.14), 0 0 40px rgba(99, 102, 241, 0.1) !important;
}

.auth-modal-header {
  padding: 24px 32px 18px 32px !important;
  border-bottom: 1px solid var(--border-subtle) !important;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Modal Header Icon: AI Hologram Squircle */
.auth-modal-header-icon.pix-header-ai-icon {
  width: 48px;
  height: 48px;
  min-width: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.25) 0%, rgba(168, 85, 247, 0.3) 100%) !important;
  border: 1px solid rgba(168, 85, 247, 0.45) !important;
  color: #C084FC !important;
  box-shadow: 0 0 24px rgba(124, 58, 237, 0.35) !important;
  display: flex;
  align-items: center;
  justify-content: center;
}

[data-theme="light"] .auth-modal-header-icon.pix-header-ai-icon {
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.12), rgba(168, 85, 247, 0.18)) !important;
  border-color: rgba(124, 58, 237, 0.3) !important;
  color: #7C3AED !important;
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.2) !important;
}

.auth-modal-title {
  font-family: var(--font-heading) !important;
  font-size: 19px !important;
  font-weight: 700 !important;
  color: var(--text-main) !important;
  margin: 0 !important;
  letter-spacing: -0.01em;
}

.auth-modal-subtitle {
  font-family: var(--font-family) !important;
  font-size: 12.5px !important;
  color: var(--text-muted) !important;
  margin: 4px 0 0 0 !important;
  line-height: 1.45;
}

/* Modal Close Button */
.auth-modal-card .btn-close {
  width: 34px !important;
  height: 34px !important;
  border-radius: 50% !important;
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  color: var(--text-muted) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
}

[data-theme="light"] .auth-modal-card .btn-close {
  background: #F1F5F9 !important;
  border-color: #E2E8F0 !important;
  color: #64748B !important;
}

.auth-modal-card .btn-close:hover {
  background: rgba(239, 68, 68, 0.16) !important;
  border-color: rgba(239, 68, 68, 0.35) !important;
  color: #EF4444 !important;
  transform: rotate(90deg) scale(1.08) !important;
}

/* 3. Segmented Tabs (Floating Capsule Track) */
.auth-tabs-segmented {
  display: flex;
  gap: 6px;
  background: rgba(0, 0, 0, 0.45) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  padding: 5px !important;
  border-radius: 9999px !important;
  margin: 20px 32px 24px 32px !important;
  backdrop-filter: blur(16px);
}

[data-theme="light"] .auth-tabs-segmented {
  background: #F1F5F9 !important;
  border-color: #E2E8F0 !important;
}

.auth-tab-btn {
  flex: 1;
  padding: 10px 20px !important;
  font-family: var(--font-family) !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  border: none !important;
  border-radius: 9999px !important;
  background: transparent !important;
  color: var(--text-muted) !important;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
  user-select: none;
}

.auth-tab-btn:hover {
  color: var(--text-main) !important;
  background: rgba(255, 255, 255, 0.06) !important;
}

[data-theme="light"] .auth-tab-btn:hover {
  background: rgba(0, 0, 0, 0.05) !important;
}

.auth-tab-btn.active {
  background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%) !important;
  color: #FFFFFF !important;
  font-weight: 700 !important;
  box-shadow: 0 4px 18px rgba(124, 58, 237, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
  transform: scale(1.02);
}

.auth-tab-btn.active svg {
  stroke: #FFFFFF !important;
}

/* Form Body & Spacious Breathing Room */
.auth-form-body {
  padding: 0 32px 32px 32px !important;
  display: flex;
  flex-direction: column;
  gap: 20px !important;
}

.auth-field-group {
  display: flex;
  flex-direction: column;
  gap: 8px !important;
  margin: 0 !important;
}

.auth-field-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-family);
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-main);
  letter-spacing: -0.01em;
}

[data-theme="light"] .auth-field-label {
  color: #334155 !important;
}

.auth-field-label svg {
  color: #6366F1;
  opacity: 0.9;
  flex-shrink: 0;
}

.auth-input-box {
  position: relative;
  width: 100%;
}

/* 4. High-Precision AI Platform Inputs */
.auth-input {
  width: 100% !important;
  box-sizing: border-box !important;
  height: 48px !important;
  padding: 0 18px !important;
  font-family: var(--font-family) !important;
  font-size: 14px !important;
  font-weight: 500;
  border-radius: 13px !important;
  border: 1.5px solid rgba(255, 255, 255, 0.1) !important;
  background: rgba(18, 20, 32, 0.8) !important;
  color: #F8FAFC !important;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15) !important;
}

[data-theme="light"] .auth-input {
  background: #F8FAFC !important;
  border: 1.5px solid #CBD5E1 !important;
  color: #0F172A !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
}

.auth-input::placeholder {
  color: #94A3B8 !important;
  font-weight: 400;
  opacity: 1;
}

.auth-input:focus {
  border-color: #6366F1 !important;
  background: rgba(22, 25, 40, 0.95) !important;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.22), 0 0 24px rgba(99, 102, 241, 0.2) !important;
  outline: none !important;
}

[data-theme="light"] .auth-input:focus {
  background: #FFFFFF !important;
  border-color: #4F46E5 !important;
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.18), 0 0 20px rgba(79, 70, 229, 0.14) !important;
}

.auth-input-password {
  padding-right: 44px !important;
}

/* Eye Toggle Button Inside Password Input */
.auth-eye-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  cursor: pointer;
  color: #64748B;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.15s ease;
}

.auth-eye-btn:hover {
  color: #818CF8;
  background: rgba(99, 102, 241, 0.12);
}

.auth-eye-btn .eye-icon-show { display: block; }
.auth-eye-btn .eye-icon-hide { display: none; }
.auth-eye-btn.revealed .eye-icon-show { display: none; }
.auth-eye-btn.revealed .eye-icon-hide { display: block; color: #818CF8; }

/* Checkbox Row */
.auth-extra-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0;
  padding: 2px 0;
}

.auth-checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  user-select: none;
}

[data-theme="light"] .auth-checkbox-label {
  color: #475569;
}

.auth-checkbox-label input[type="checkbox"] {
  width: 17px;
  height: 17px;
  accent-color: #6366F1;
  cursor: pointer;
  margin: 0;
}

/* Promo Card in Register Tab */
.auth-promo-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%) !important;
  border: 1.5px solid rgba(16, 185, 129, 0.3) !important;
  margin-top: 4px;
}

[data-theme="light"] .auth-promo-card {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(99, 102, 241, 0.05) 100%) !important;
  border-color: rgba(16, 185, 129, 0.35) !important;
}

.auth-promo-badge {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 10px;
  background: rgba(16, 185, 129, 0.2);
  color: #10B981;
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-promo-content {
  flex: 1;
}

.auth-promo-title {
  font-size: 13.5px;
  color: #10B981;
  line-height: 1.4;
}

.auth-promo-title strong {
  font-weight: 700;
}

.auth-promo-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 3px;
  line-height: 1.4;
}

[data-theme="light"] .auth-promo-desc {
  color: #64748B;
}

/* 5. Submit CTA Buttons (pixbugius AI Action Shimmer Buttons) */
.auth-submit-btn {
  position: relative !important;
  overflow: hidden !important;
  width: 100% !important;
  height: 50px !important;
  font-family: var(--font-family) !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  letter-spacing: 0.01em;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 10px !important;
  border-radius: 14px !important;
  cursor: pointer !important;
  border: none !important;
  margin-top: 6px !important;
  color: #FFFFFF !important;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
  user-select: none !important;
}

/* Login Submit: Ethereal Indigo-Violet-Cyan AI Beam */
.pix-btn-submit-login {
  background: linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #7C3AED 100%) !important;
  box-shadow: 0 8px 24px rgba(79, 70, 229, 0.42), 0 2px 4px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.35) !important;
}

.pix-btn-submit-login:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 12px 32px rgba(99, 102, 241, 0.55), 0 0 35px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.45) !important;
}

/* Register Submit: Luminous Emerald-Cyan AI Beam */
.pix-btn-submit-reg {
  background: linear-gradient(135deg, #059669 0%, #10B981 50%, #047857 100%) !important;
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.42), 0 2px 4px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.35) !important;
}

.pix-btn-submit-reg:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 12px 32px rgba(16, 185, 129, 0.55), 0 0 35px rgba(16, 185, 129, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.45) !important;
}

.auth-submit-btn:active {
  transform: translateY(1px) scale(0.99) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25) !important;
}

.pix-submit-arrow {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.auth-submit-btn:hover .pix-submit-arrow {
  transform: translateX(4px);
}

/* Ensure all modal form-controls have 100% width and box-sizing */`;

const updatedCss = css.replace(targetSectionRegex, replacementCss);

if (updatedCss === css) {
  console.error('Target section regex not matched in style.css');
  process.exit(1);
}

fs.writeFileSync(cssPath, updatedCss, 'utf8');
console.log('Successfully updated style.css with pixbugius AI platform interaction styles!');
