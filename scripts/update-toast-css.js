const fs = require('fs');

let css = fs.readFileSync('public/style.css', 'utf8');

const toastCss = `
/* ==========================================
   UIVERSE TOAST NOTIFICATIONS (TOP-RIGHT)
   ========================================== */
.toast-container {
  position: fixed !important;
  top: 24px !important;
  right: 24px !important;
  bottom: auto !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;
  z-index: 100000 !important;
  pointer-events: none !important;
  max-width: 420px !important;
  width: calc(100% - 48px) !important;
}

.toast {
  pointer-events: auto !important;
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 12px !important;
  padding: 12px 14px !important;
  color: #0f172a !important;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.02) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px !important;
  animation: uivToastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.toast.toast-hiding {
  opacity: 0 !important;
  transform: translateX(110%) scale(0.95) !important;
}

@keyframes uivToastIn {
  from {
    transform: translateX(110%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast-content-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.toast-icon-badge {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.toast-success .toast-icon-badge {
  background: #ecfdf5 !important;
  color: #10b981 !important;
}

.toast-danger .toast-icon-badge {
  background: #fef2f2 !important;
  color: #ef4444 !important;
}

.toast-warning .toast-icon-badge {
  background: #fffbeb !important;
  color: #f59e0b !important;
}

.toast-info .toast-icon-badge {
  background: #f0f9ff !important;
  color: #0284c7 !important;
}

.toast-message-text {
  font-size: 13px;
  color: #1e293b;
  font-weight: 600;
  line-height: 1.4;
  word-break: break-word;
}

.toast-close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.toast-close-btn:hover {
  background: #f1f5f9;
  color: #475569;
}
`;

// Also improve .uiv-icon-btn contrast
css = css.replace(
  'color: #475569;\n  display: inline-flex;',
  'color: #334155;\n  border: 1px solid #cbd5e1;\n  display: inline-flex;'
);

css += toastCss;
fs.writeFileSync('public/style.css', css, 'utf8');
console.log('Appended Toast CSS and updated uiv-icon-btn contrast in public/style.css');
