const API_BASE = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin.startsWith('http'))
  ? `${window.location.origin}/api/v1`
  : 'http://127.0.0.1:51888/api/v1';


// ==================== AUTH & TOKEN INTERCEPTOR ==================== //
const AUTH_TOKEN_KEY = 'cgt_auth_token';
let currentUser = null;

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

function setAuthToken(token) {
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  currentUser = null;
}

// Intercept window.fetch to automatically append Authorization header
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
  const token = getAuthToken();
  if (token && typeof url === 'string' && (url.includes('/api/v1') || url.startsWith('/api/'))) {
    options = options || {};
    options.headers = options.headers || {};
    if (options.headers instanceof Headers) {
      if (!options.headers.has('Authorization')) {
        options.headers.set('Authorization', 'Bearer ' + token);
      }
    } else if (Array.isArray(options.headers)) {
      options.headers.push(['Authorization', 'Bearer ' + token]);
    } else {
      if (!options.headers['Authorization'] && !options.headers['authorization']) {
        options.headers['Authorization'] = 'Bearer ' + token;
      }
    }
  }
  return originalFetch.apply(this, [url, options]);
};

let allProfiles = [];
let allGroups = [];
let allProxies = [];
let licenseInfo = null;

// DOM Elements
const tbody = document.getElementById('profiles-tbody');
const statTotal = document.getElementById('stat-total');
const statRunning = document.getElementById('stat-running');
const statQuota = document.getElementById('stat-quota');
const searchInput = document.getElementById('search-input');
const filterGroupSelect = document.getElementById('filter-group-select');
const kernelLabel = document.getElementById('core-kernel-label');
const brandLicenseBadge = document.getElementById('brand-license-badge');

function formatVnDate(dateInput) {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
window.formatVnDate = formatVnDate;

function formatShortBadge(planStr) {
  if (!planStr) return 'FREE';
  const str = String(planStr).toUpperCase();
  if (str.includes('VIP')) return 'VIP';
  if (str.includes('PRO')) return 'PRO';
  return 'FREE';
}

function updateBrandBadge(planStr) {
  if (!brandLicenseBadge) return;
  const shortText = formatShortBadge(planStr);
  brandLicenseBadge.textContent = shortText;
  brandLicenseBadge.className = 'brand-badge ' + shortText.toLowerCase();
}

const sidebarPlanName = document.getElementById('sidebar-plan-name');
const sidebarPlanQuota = document.getElementById('sidebar-plan-quota');
const sidebarPlanExpires = document.getElementById('sidebar-plan-expires');

const pageHeading = document.getElementById('page-heading');
const pageSubheading = document.getElementById('page-subheading');

const viewProfiles = document.getElementById('view-profiles');
const viewLicense = document.getElementById('view-license');

const modal = document.getElementById('profile-modal');
const modalTitle = document.getElementById('modal-title');
const btnCreateModal = document.getElementById('btn-create-modal');
const btnModalClose = document.getElementById('modal-close-btn');
const btnModalCancel = document.getElementById('modal-cancel-btn');
const btnModalSave = document.getElementById('modal-save-btn');
const btnRefresh = document.getElementById('btn-refresh');
const btnBatchCloseAll = document.getElementById('btn-batch-close-all');

const formId = document.getElementById('form-profile-id');
const formName = document.getElementById('form-name');
const formGroupId = document.getElementById('form-group-id');
const formKernel = document.getElementById('form-kernel');
const formProxySelect = document.getElementById('form-proxy-select');
const formProxy = document.getElementById('form-proxy');
const formStartUrl = document.getElementById('form-start-url');
const formResolution = document.getElementById('form-resolution');
const formWebrtc = document.getElementById('form-webrtc');
const formNotes = document.getElementById('form-notes');

// Group Modal DOM
const groupModal = document.getElementById('group-modal');
const groupModalTitle = document.getElementById('group-modal-title');
const btnCreateGroup = document.getElementById('btn-create-group');
const groupModalCloseBtn = document.getElementById('group-modal-close-btn');
const groupModalCancelBtn = document.getElementById('group-modal-cancel-btn');
const groupModalSaveBtn = document.getElementById('group-modal-save-btn');
const groupFormId = document.getElementById('group-form-id');
const groupFormName = document.getElementById('group-form-name');
const groupFormColor = document.getElementById('group-form-color');
const groupFormNotes = document.getElementById('group-form-notes');
const groupsTbody = document.getElementById('groups-tbody');

// Proxy Modal DOM
const proxyModal = document.getElementById('proxy-modal');
const proxyModalTitle = document.getElementById('proxy-modal-title');
const btnAddProxy = document.getElementById('btn-add-proxy');
const btnCheckAllProxies = document.getElementById('btn-check-all-proxies');
const proxyModalCloseBtn = document.getElementById('proxy-modal-close-btn');
const proxyModalCancelBtn = document.getElementById('proxy-modal-cancel-btn');
const proxyModalSaveBtn = document.getElementById('proxy-modal-save-btn');
const proxyTabSingle = document.getElementById('proxy-tab-single');
const proxyTabBulk = document.getElementById('proxy-tab-bulk');
const proxyContentSingle = document.getElementById('proxy-content-single');
const proxyContentBulk = document.getElementById('proxy-content-bulk');
const proxyFormId = document.getElementById('proxy-form-id');
const proxyFormName = document.getElementById('proxy-form-name');
const proxyFormType = document.getElementById('proxy-form-type');
const proxyFormHost = document.getElementById('proxy-form-host');
const proxyFormPort = document.getElementById('proxy-form-port');
const proxyFormUser = document.getElementById('proxy-form-user');
const proxyFormPass = document.getElementById('proxy-form-pass');
const proxyFormBulk = document.getElementById('proxy-form-bulk');
const proxiesTbody = document.getElementById('proxies-tbody');

// Automation Code Snippets DOM
const apiCodeSnippet = document.getElementById('api-code-snippet');
const btnCopyCode = document.getElementById('btn-copy-code');

// Fingerprint Modal Elements
// Fingerprint Modal & PolyLogin Workstation Elements
const modalTabBasic = document.getElementById('modal-tab-basic');
const modalTabProxy = document.getElementById('modal-tab-proxy');
const modalTabFp = document.getElementById('modal-tab-fp');
const modalTabExt = document.getElementById('modal-tab-ext');

const modalContentBasic = document.getElementById('modal-content-basic');
const modalContentProxy = document.getElementById('modal-content-proxy');
const modalContentFp = document.getElementById('modal-content-fp');
const modalContentExt = document.getElementById('modal-content-ext');

const btnRandomizeFp = document.getElementById('btn-randomize-fp');
const btnRandomizeSummary = document.getElementById('btn-randomize-summary');
const btnQuickRandomUa = document.getElementById('btn-quick-random-ua');
const uaPresetSelect = document.getElementById('ua-preset-select');
const activeProfileIndicator = document.getElementById('active-profile-indicator');
const formCookieInput = document.getElementById('form-cookie-input');
const fpDeviceName = document.getElementById('fp-device-name');
const quickProxyHubWrap = document.getElementById('quick-proxy-hub-wrap');
const quickProxyCustomWrap = document.getElementById('quick-proxy-custom-wrap');
const tabProxySource = document.getElementById('tab-proxy-source');
const tabProxyHubSelect = document.getElementById('tab-proxy-hub-select');
const tabProxyHubSection = document.getElementById('tab-proxy-hub-section');

const fpOs = document.getElementById('fp-os');
const fpWebgl = document.getElementById('fp-webgl');
const fpCpu = document.getElementById('fp-cpu');
const fpRam = document.getElementById('fp-ram');
const fpCanvasNoise = document.getElementById('fp-canvas-noise');
const fpAudioNoise = document.getElementById('fp-audio-noise');
const fpUserAgent = document.getElementById('fp-user-agent');
const profileExtensionsChecklist = document.getElementById('profile-extensions-checklist');

// Workstation Real-time Summary Elements
const sumKernel = document.getElementById('sum-kernel');
const sumOs = document.getElementById('sum-os');
const sumUa = document.getElementById('sum-ua');
const sumProxy = document.getElementById('sum-proxy');
const sumTimezone = document.getElementById('sum-timezone');
const sumWebrtc = document.getElementById('sum-webrtc');
const sumCanvas = document.getElementById('sum-canvas');
const sumWebglNoise = document.getElementById('sum-webgl-noise');
const sumAudio = document.getElementById('sum-audio');
const sumGpu = document.getElementById('sum-gpu');
const sumCpu = document.getElementById('sum-cpu');
const sumRam = document.getElementById('sum-ram');
const sumRes = document.getElementById('sum-res');
const sumDevicename = document.getElementById('sum-devicename');
const sumMac = document.getElementById('sum-mac');

// Extensions Hub Elements
const viewExtensions = document.getElementById('view-extensions');
const extensionsGrid = document.getElementById('extensions-grid');
const extensionsEmptyState = document.getElementById('extensions-empty-state');
const btnUploadExtension = document.getElementById('btn-upload-extension');
const btnInstallPresets = document.getElementById('btn-install-presets');
const searchExtensionsInput = document.getElementById('search-extensions-input');
const filterExtensionMode = document.getElementById('filter-extension-mode');

// Extension Modal Elements
const extensionModal = document.getElementById('extension-modal');
const extensionModalCloseBtn = document.getElementById('extension-modal-close-btn');
const extensionModalCancelBtn = document.getElementById('extension-modal-cancel-btn');
const extensionModalSaveBtn = document.getElementById('extension-modal-save-btn');
const btnBrowseExtFolder = document.getElementById('btn-browse-ext-folder');
const extFormPath = document.getElementById('ext-form-path');
const extFormName = document.getElementById('ext-form-name');
const extFormGlobal = document.getElementById('ext-form-global');

let allExtensions = [];

// Theme Switcher (Light / Dark)
const btnThemeToggle = document.getElementById('btn-theme-toggle');

function initTheme() {
  const currentTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(currentTheme);
}

function applyTheme(theme) {
  const themeSvg = document.getElementById('theme-svg-icon');
  const themeText = document.getElementById('theme-icon-text');
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    if (themeSvg) {
      themeSvg.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
    }
    if (themeText) themeText.innerText = 'Sáng';
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
    if (themeSvg) {
      themeSvg.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    }
    if (themeText) themeText.innerText = 'Tối';
    localStorage.setItem('theme', 'dark');
  }
}

if (btnThemeToggle) {
  btnThemeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    applyTheme(isLight ? 'dark' : 'light');
  });
}

// Enhanced Glassmorphic Toast Notification with Modern SVG Icons
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  if (type === 'success') {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
  } else if (type === 'danger') {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  } else if (type === 'warning') {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  }

  const cleanMessage = typeof message === 'string' 
    ? message.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\uFE0F\s]+/u, '') 
    : message;
  toast.innerHTML = `<span class="toast-icon">${iconSvg}</span><span class="toast-message">${cleanMessage}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// PolyLogin Style Custom Confirmation Dialog (Replaces native window.confirm)
function showConfirmDialog({ title = 'Xác nhận thao tác', message = '', type = 'danger', confirmText = 'Đồng ý', cancelText = 'Hủy bỏ' }) {
  return new Promise((resolve) => {
    const modalEl = document.getElementById('confirm-dialog-modal');
    const iconEl = document.getElementById('confirm-modal-icon');
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    const btnCancel = document.getElementById('confirm-modal-btn-cancel');
    const btnConfirm = document.getElementById('confirm-modal-btn-confirm');

    if (!modalEl) {
      resolve(window.confirm(message.replace(/<[^>]*>?/gm, '')));
      return;
    }

    titleEl.innerText = title;
    msgEl.innerHTML = message;
    btnCancel.style.display = 'inline-flex';
    btnCancel.innerText = cancelText;
    btnConfirm.innerText = confirmText;

    iconEl.className = `confirm-icon-wrapper ${type}`;
    if (type === 'danger') {
      btnConfirm.className = 'uiv-cta-danger';
      iconEl.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    } else if (type === 'warning') {
      btnConfirm.className = 'uiv-cta-primary';
      iconEl.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    } else {
      btnConfirm.className = 'uiv-cta-primary';
      iconEl.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    modalEl.style.display = 'flex';

    const cleanup = () => {
      modalEl.style.display = 'none';
      btnConfirm.removeEventListener('click', onConfirm);
      btnCancel.removeEventListener('click', onCancel);
    };

    const onConfirm = () => {
      cleanup();
      resolve(true);
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    btnConfirm.addEventListener('click', onConfirm);
    btnCancel.addEventListener('click', onCancel);
  });
}

// PolyLogin Style Custom Alert Modal (Replaces native window.alert)
function showCustomAlert({ title = 'Thông báo', message = '', type = 'info', confirmText = 'Đã hiểu' }) {
  return new Promise((resolve) => {
    const modalEl = document.getElementById('confirm-dialog-modal');
    const iconEl = document.getElementById('confirm-modal-icon');
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    const btnCancel = document.getElementById('confirm-modal-btn-cancel');
    const btnConfirm = document.getElementById('confirm-modal-btn-confirm');

    if (!modalEl) {
      window.alert(message.replace(/<[^>]*>?/gm, ''));
      resolve(true);
      return;
    }

    titleEl.innerText = title;
    msgEl.innerHTML = message;
    btnCancel.style.display = 'none';
    btnConfirm.innerText = confirmText;
    btnConfirm.className = 'uiv-cta-primary';

    iconEl.className = `confirm-icon-wrapper ${type}`;
    if (type === 'danger') {
      iconEl.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else if (type === 'warning') {
      iconEl.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    } else {
      iconEl.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    modalEl.style.display = 'flex';

    const onConfirm = () => {
      modalEl.style.display = 'none';
      btnConfirm.removeEventListener('click', onConfirm);
      resolve(true);
    };

    btnConfirm.addEventListener('click', onConfirm);
  });
}

// Relative human-friendly time helper
function formatTimeAgo(dateString) {
  if (!dateString) return 'Chưa chạy';
  const now = new Date();
  const past = new Date(dateString);
  const diffSec = Math.floor((now - past) / 1000);
  if (isNaN(diffSec) || diffSec < 0) return 'Vừa xong';
  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} ngày trước`;
  return past.toLocaleDateString();
}

async function safeCopyToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    // Fallback to execCommand
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    return false;
  }
}

window.copyText = async function(text, event) {
  if (event) event.stopPropagation();
  await safeCopyToClipboard(text);
  showToast(`Đã sao chép ID: ${text.slice(0, 12)}...`, 'info');
};

function populateKernelSelect(kernels, defaultKernel) {
  if (!formKernel) return;
  const currentVal = formKernel.value;
  formKernel.innerHTML = '';

  const available = kernels.filter(k => k.exists);
  const unavailable = kernels.filter(k => !k.exists);

  if (available.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.text = 'Chưa tìm thấy Google Chrome hoặc Microsoft Edge trên máy';
    formKernel.appendChild(opt);
    return;
  }

  // Ưu tiên đưa MyBrowser 153 Portable lên đầu danh sách
  available.sort((a, b) => {
    if (a.id === 'local-portable-chromium') return -1;
    if (b.id === 'local-portable-chromium') return 1;
    if (a.isPrimary) return -1;
    if (b.isPrimary) return 1;
    return 0;
  });

  const portable = available.find(k => k.id === 'local-portable-chromium');
  // Ưu tiên chọn MyBrowser 153 Portable làm mặc định nếu có sẵn trên máy
  let selectPath = defaultKernel;
  if (portable) {
    selectPath = portable.path;
  } else if (currentVal && available.some(k => k.path === currentVal)) {
    selectPath = currentVal;
  }

  available.forEach((k) => {
    const opt = document.createElement('option');
    opt.value = k.path;
    opt.text = `${k.name} (Sẵn sàng)`;
    if (k.path === selectPath || (!selectPath && (k.id === 'local-portable-chromium' || k.isPrimary))) {
      opt.selected = true;
    }
    formKernel.appendChild(opt);
  });

  if (formKernel.selectedIndex < 0 && formKernel.options.length > 0) {
    formKernel.options[0].selected = true;
  }

  unavailable.slice(0, 2).forEach(k => {
    const opt = document.createElement('option');
    opt.value = k.path;
    opt.text = `${k.name} (Chưa cài đặt)`;
    opt.disabled = true;
    formKernel.appendChild(opt);
  });

  // Cập nhật trạng thái badge & text trong modal Tạo Hồ Sơ
  const modalQuickBtn = document.getElementById('btn-modal-open-kernel');
  const modalQuickText = document.getElementById('modal-kernel-quick-text');
  const kernelHint = document.getElementById('form-kernel-hint');

  if (portable) {
    if (modalQuickText) modalQuickText.innerText = '✓ Core 153 Sẵn Sàng';
    if (modalQuickBtn) {
      modalQuickBtn.style.color = '#10B981';
      modalQuickBtn.style.background = 'rgba(16, 185, 129, 0.12)';
      modalQuickBtn.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    }
    if (kernelHint) {
      kernelHint.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" style="flex-shrink: 0;"><polyline points="20 6 9 17 4 12"/></svg><span style="color: #10B981; font-weight: 600;">Chromium 153 Core (Portable) đang được chọn. Tối ưu chống nhận diện 100% (Bypass Iphey & Pixelscan).</span>';
    }
  } else {
    if (modalQuickText) modalQuickText.innerText = '⬇ Cài Chromium 153';
    if (modalQuickBtn) {
      modalQuickBtn.style.color = 'var(--primary)';
      modalQuickBtn.style.background = 'rgba(56, 103, 244, 0.12)';
      modalQuickBtn.style.borderColor = 'rgba(56, 103, 244, 0.3)';
    }
    if (kernelHint) {
      kernelHint.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; color: var(--accent);"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg><span>Khuyên dùng: Bấm nút <b>Cài Chromium 153</b> phía trên để tải nhân chống phát hiện danh tính 100%.</span>';
    }
  }

  updateProfileSummary();
  if (typeof initAllCustomSelects === 'function') initAllCustomSelects();
}

// Fetch Initial Data
async function fetchStatus() {
  try {
    const res = await fetch(`${API_BASE}/status`);
    const data = await res.json();
    if (data.kernels && data.kernels.length > 0) {
      populateKernelSelect(data.kernels, data.defaultKernel);
    }
    if (typeof pollKernelStatus === 'function') {
      pollKernelStatus();
    }
  } catch (err) {
    console.error('Error fetching status:', err);
  }
}

async function fetchLicense() {
  try {
    const res = await fetch(`${API_BASE}/license`);
    const data = await res.json();
    if (data.success && data.license) {
      licenseInfo = data.license;
      updateLicenseUI(licenseInfo);
    }
  } catch (err) {
    console.error('Error fetching license:', err);
  }
}

function updateLicenseUI(info) {
  if (sidebarPlanName) sidebarPlanName.innerText = `Gói ${info.plan}`;
  if (sidebarPlanQuota) sidebarPlanQuota.innerText = `${info.current_profiles}/${info.max_profiles}`;
  if (sidebarPlanExpires) {
    if (info.is_lifetime || String(info.plan).toUpperCase().includes('VIP')) {
      sidebarPlanExpires.innerText = 'Vĩnh viễn';
    } else if (info.expires_at) {
      sidebarPlanExpires.innerText = formatVnDate(info.expires_at);
    } else {
      sidebarPlanExpires.innerText = 'Vô hạn';
    }
  }
  const sidebarBadge = document.getElementById('sidebar-plan-badge');
  if (sidebarBadge) {
    const isVip = Boolean(info.is_lifetime || String(info.plan).toUpperCase().includes('VIP'));
    const isPro = String(info.plan).toUpperCase().includes('PRO');
    sidebarBadge.textContent = isVip ? 'VIP' : (isPro ? 'PRO' : 'FREE');
    sidebarBadge.className = 'badge ' + (isVip ? 'badge-emerald-subtle' : (isPro ? 'badge-subtle-blue' : 'badge-subtle-gray'));
  }
  updateBrandBadge(info.plan);
  statQuota.innerText = `${info.current_profiles}/${info.max_profiles}`;

  const hwidEl = document.getElementById('license-hwid-text');
  if (hwidEl) hwidEl.innerText = info.device_id || 'HWID-LOCAL';

  const devicePlan = document.getElementById('device-plan-name');
  if (devicePlan) devicePlan.innerText = info.plan;

  const deviceMax = document.getElementById('device-max-profiles');
  if (deviceMax) deviceMax.innerText = `${info.max_profiles} Profiles`;

  const deviceExp = document.getElementById('device-expires');
  if (deviceExp) deviceExp.innerText = info.expires_at ? new Date(info.expires_at).toLocaleDateString() : 'Vô hạn';
}

async function fetchGroups() {
  try {
    const res = await fetch(`${API_BASE}/groups`);
    const data = await res.json();
    allGroups = data.groups || [];
    
    // Update Profile Modal group select
    formGroupId.innerHTML = '<option value="">(Không chọn nhóm)</option>' +
      allGroups.map(g => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');

    // Update Filter Bar group select
    if (filterGroupSelect) {
      const curFilter = filterGroupSelect.value;
      filterGroupSelect.innerHTML = '<option value="" style="background-color: #FFFFFF; color: #0F172A;">Tất Cả Nhóm</option>' +
        allGroups.map(g => `<option value="${g.id}" style="background-color: #FFFFFF; color: #0F172A;">${escapeHtml(g.name)} (${g.profile_count || 0})</option>`).join('');
      if (curFilter) filterGroupSelect.value = curFilter;
    }

    if (typeof initAllCustomSelects === 'function') initAllCustomSelects();

    renderGroups();
  } catch (err) {
    console.error('Error fetching groups:', err);
  }
}

function renderGroups() {
  if (!groupsTbody) return;
  if (allGroups.length === 0) {
    groupsTbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-muted);">
          Chưa có nhóm nào. Bấm "Tạo Nhóm Mới" để bắt đầu phân loại hồ sơ!
        </td>
      </tr>
    `;
    return;
  }

  groupsTbody.innerHTML = allGroups.map(g => {
    const color = (!g.color || g.color.toLowerCase() === '#3867f4') ? '#60A5FA' : g.color;
    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="width:12px; height:12px; border-radius:50%; background:${color}; display:inline-block;"></span>
            <span style="font-weight:600; font-size:13px;">${escapeHtml(g.name)}</span>
          </div>
        </td>
        <td>
          <span class="badge" style="background:${color}20; color:${color}; font-family:monospace; font-size:11px;">${color}</span>
        </td>
        <td>
          <span style="font-weight:700; font-size:14px; color:var(--text-main);">${g.profile_count || 0}</span>
          <span style="font-size:11px; color:var(--text-muted);"> hồ sơ</span>
        </td>
        <td style="color:var(--text-muted); font-size:12px;">${escapeHtml(g.notes || 'Không có ghi chú')}</td>
        <td style="text-align: right;">
          <div class="actions-cell" style="justify-content: flex-end;">
            <button class="uiv-btn uiv-btn-secondary" onclick="editGroup('${g.id}')">Sửa</button>
            <button class="uiv-btn uiv-btn-secondary" style="color: #F87171;" onclick="deleteGroup('${g.id}')">Xóa</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function fetchProxies() {
  try {
    const res = await fetch(`${API_BASE}/proxies`);
    const data = await res.json();
    allProxies = data.proxies || [];

    if (formProxySelect) {
      const curVal = formProxySelect.value;
      let opts = `
        <option value="">(Không dùng Proxy - Kết nối mạng trực tiếp)</option>
        <option value="__custom__">Nhập thủ công URL Proxy...</option>
      `;
      opts += allProxies.map(p => {
        const flag = p.country ? `[${p.country}] ` : '';
        const pingTxt = p.ping > 0 ? ` - ${p.ping}ms` : '';
        return `<option value="${p.id}">${flag}${escapeHtml(p.name)} (${p.type.toUpperCase()} • ${p.host}:${p.port}${pingTxt})</option>`;
      }).join('');
      formProxySelect.innerHTML = opts;
      if (curVal) formProxySelect.value = curVal;
    }

    if (tabProxyHubSelect) {
      const curHub = tabProxyHubSelect.value;
      let hubOpts = allProxies.map(p => {
        const flag = p.country ? `[${p.country}] ` : '';
        const pingTxt = p.ping > 0 ? ` - ${p.ping}ms` : '';
        return `<option value="${p.id}">${flag}${escapeHtml(p.name)} (${p.type.toUpperCase()} • ${p.host}:${p.port}${pingTxt})</option>`;
      }).join('');
      tabProxyHubSelect.innerHTML = hubOpts || '<option value="">(Kho trống - chưa có proxy nào)</option>';
      if (curHub) tabProxyHubSelect.value = curHub;
    }

    if (typeof updateProxyCounters === 'function') updateProxyCounters();
    if (typeof renderProxyHubCards === 'function') renderProxyHubCards();
    if (typeof updateSelectedProxyInspector === 'function') updateSelectedProxyInspector();

    renderProxies();
  } catch (err) {
    console.error('Error fetching proxies:', err);
  }
}

function renderProxies() {
  if (!proxiesTbody) return;
  if (allProxies.length === 0) {
    proxiesTbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
          Chưa có danh sách Proxy tĩnh. Bấm "Thêm Proxy Mới" để import danh sách (host:port:user:pass)
        </td>
      </tr>
    `;
    return;
  }

  proxiesTbody.innerHTML = allProxies.map(p => {
    let statusBadge = `<span class="badge" style="background:rgba(156,163,175,0.15); color:var(--text-muted);">Chưa check</span>`;
    if (p.status === 'live') {
      statusBadge = `<span class="badge badge-running"><span class="badge-pulse"></span> LIVE</span>`;
    } else if (p.status === 'dead') {
      statusBadge = `<span class="badge" style="background:rgba(239,68,68,0.15); color:#EF4444;">DIE / Lỗi</span>`;
    }

    let pingBadge = `<span style="color:var(--text-muted); font-size:12px;">--</span>`;
    if (p.ping > 0) {
      const pingColor = p.ping < 200 ? '#10B981' : (p.ping < 600 ? '#F59E0B' : '#EF4444');
      pingBadge = `<span style="font-weight:700; color:${pingColor}; font-size:12px;">${p.ping} ms</span>`;
    }

    const authTxt = p.username ? '<span title="Có tài khoản / mật khẩu" style="display:inline-flex; align-items:center; margin-left:4px; color:var(--text-muted);"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>' : '';

    const countryTxt = p.country
      ? `<span style="font-size:12px; font-weight:600; color:var(--text-main);">${escapeHtml(p.country)}</span>`
      : `<span style="color:var(--text-muted); font-size:12px;">--</span>`;

    return `
      <tr>
        <td>
          <div style="display:flex; flex-direction:column;">
            <span style="font-weight:600; font-size:13px; font-family:monospace; color:var(--text-main);">${escapeHtml(p.host)}:${p.port}${authTxt}</span>
            <span style="font-size:11px; color:var(--text-muted);">${escapeHtml(p.name)}</span>
          </div>
        </td>
        <td>
          <span class="badge" style="background:rgba(255,255,255,0.06); text-transform:uppercase; font-size:11px; font-weight:600;">${escapeHtml(p.type)}</span>
        </td>
        <td>${countryTxt}</td>
        <td>${pingBadge}</td>
        <td>${statusBadge}</td>
        <td>
          <span style="font-weight:600; font-size:12px; color:var(--text-main);">${p.profile_count || 0}</span>
          <span style="font-size:11px; color:var(--text-muted);"> profiles</span>
        </td>
        <td style="text-align: right;">
          <div style="display:inline-flex; gap:6px; justify-content:flex-end;">
            <button class="uiv-btn uiv-btn-secondary" onclick="checkProxySingle('${p.id}')" style="display:inline-flex; align-items:center; gap:5px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <span>Test IP</span>
            </button>
            <button class="uiv-btn uiv-btn-secondary" onclick="editProxy('${p.id}')">Sửa</button>
            <button class="uiv-btn uiv-btn-secondary" style="color:#F87171;" onclick="deleteProxy('${p.id}')">Xóa</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function fetchProfiles() {
  try {
    const res = await fetch(`${API_BASE}/profiles`);
    const data = await res.json();
    allProfiles = data.profiles || [];
    for (const p of allProfiles) {
      if (p.isRunning) {
        launchingProfileIds.delete(p.id);
        failedProfileIds.delete(p.id);
      } else {
        stoppingProfileIds.delete(p.id);
      }
    }
    renderProfiles();
  } catch (err) {
    console.error('Error fetching profiles:', err);
  }
}

// Selection Set for Batch Actions
const selectedProfileIds = new Set();
const launchingProfileIds = new Set();
const stoppingProfileIds = new Set();
const failedProfileIds = new Map();

function updateBatchToolbar() {
  const count = selectedProfileIds.size;
  const countEl = document.getElementById('batch-selected-count');
  if (countEl) countEl.innerText = count;

  // Cập nhật số lượng hồ sơ đã chọn lên nút Đóng
  const batchStopBtn = document.getElementById('batch-btn-stop');
  if (batchStopBtn) {
    const badge = batchStopBtn.querySelector('.batch-count-badge');
    const label = batchStopBtn.querySelector('.btn-label') || batchStopBtn.querySelector('span');
    if (badge) {
      if (count > 0) {
        badge.innerText = count;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
      if (label) label.innerText = 'Đóng';
    } else if (label) {
      label.innerText = count > 0 ? `Đóng (${count})` : 'Đóng';
    }
    batchStopBtn.title = count > 0 ? `Đóng ${count} hồ sơ đã chọn` : 'Đóng các hồ sơ đã chọn';
  }

  // Cập nhật số lượng lên các nút thao tác hàng loạt khác
  const batchStartBtn = document.getElementById('batch-btn-start');
  if (batchStartBtn) {
    const badge = batchStartBtn.querySelector('.batch-count-badge');
    const label = batchStartBtn.querySelector('.btn-label') || batchStartBtn.querySelector('span');
    if (badge) {
      if (count > 0) {
        badge.innerText = count;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
      if (label) label.innerText = 'Mở';
    } else if (label) {
      label.innerText = count > 0 ? `Mở (${count})` : 'Mở';
    }
    batchStartBtn.title = count > 0 ? `Khởi chạy ${count} hồ sơ đã chọn` : 'Khởi chạy các hồ sơ đã chọn';
  }

  const batchAutoBtn = document.getElementById('batch-btn-auto');
  if (batchAutoBtn) {
    const span = batchAutoBtn.querySelector('span');
    if (span) {
      span.innerText = count > 0 ? `Tự động hóa (${count})` : 'Tự động hóa';
    }
  }

  const batchSyncBtn = document.getElementById('batch-btn-sync');
  if (batchSyncBtn) {
    const span = batchSyncBtn.querySelector('span');
    if (span) {
      span.innerText = count >= 2 ? `Bắt đầu đồng bộ hóa (${count})` : 'Bắt đầu đồng bộ hóa';
    }
  }

  const batchProxyBtn = document.getElementById('batch-btn-proxy');
  if (batchProxyBtn) {
    const span = batchProxyBtn.querySelector('span');
    if (span) {
      span.innerText = count > 0 ? `Cập nhật proxy (${count})` : 'Cập nhật proxy';
    }
  }

  const batchRandomizeBtn = document.getElementById('batch-btn-randomize');
  if (batchRandomizeBtn) {
    const span = batchRandomizeBtn.querySelector('span');
    if (span) {
      span.innerText = count > 0 ? `Đổi vân tay mới (${count})` : 'Đổi vân tay mới';
    }
  }

  const batchDeleteBtn = document.getElementById('batch-btn-delete');
  if (batchDeleteBtn) {
    const span = batchDeleteBtn.querySelector('span');
    if (span) {
      span.innerText = count > 0 ? `Xóa (${count})` : 'Xóa';
    }
  }

  // Cập nhật số lượng hồ sơ đang mở lên nút "Đóng tất cả" trên thanh header
  const btnCloseAll = document.getElementById('btn-batch-close-all');
  if (btnCloseAll && typeof allProfiles !== 'undefined' && Array.isArray(allProfiles)) {
    const runningCount = allProfiles.filter(p => p.isRunning).length;
    const span = btnCloseAll.querySelector('span');
    if (span) {
      span.innerText = runningCount > 0 ? `Đóng tất cả (${runningCount})` : 'Đóng tất cả';
    }
  }

  const thSelectAll = document.getElementById('th-select-all');
  if (thSelectAll) {
    const visibleCheckboxes = Array.from(document.querySelectorAll('.profile-row-cb'));
    if (visibleCheckboxes.length === 0) {
      thSelectAll.checked = false;
      thSelectAll.indeterminate = false;
    } else {
      const checkedCount = visibleCheckboxes.filter(cb => cb.checked).length;
      if (checkedCount === 0) {
        thSelectAll.checked = false;
        thSelectAll.indeterminate = false;
      } else if (checkedCount === visibleCheckboxes.length) {
        thSelectAll.checked = true;
        thSelectAll.indeterminate = false;
      } else {
        thSelectAll.checked = false;
        thSelectAll.indeterminate = true;
      }
    }
  }
}

// Hiển thị tên Profile đang mở và Master Profile đồng bộ gần thanh search (Item 9)
function updateActiveProfileIndicator() {
  if (!activeProfileIndicator) return;

  const runningProfiles = allProfiles.filter(p => p.isRunning);

  // 1. Nếu đang có phiên đồng bộ chuột phím (Sync)
  if (typeof isSyncActive !== 'undefined' && isSyncActive) {
    const masterSelect = document.getElementById('sync-master-select');
    const masterName = (masterSelect && masterSelect.selectedIndex >= 0 && masterSelect.options[masterSelect.selectedIndex]) 
      ? masterSelect.options[masterSelect.selectedIndex].text 
      : 'Chính';
    const cleanMasterName = masterName.split(' (')[0].trim();
    activeProfileIndicator.style.display = 'inline-flex';
    activeProfileIndicator.innerHTML = `
      <span class="sync-master-pill" title="Phiên đồng bộ đang hoạt động. Thao tác từ Master sẽ truyền sang các máy Slaves.">
        <span class="pulse-dot-blue"></span>
        <span>👑 Master: <strong>${escapeHtml(cleanMasterName)}</strong> • Đang đồng bộ (${runningProfiles.length} máy)</span>
      </span>
    `;
    return;
  }

  // 2. Không có profile nào đang chạy
  if (runningProfiles.length === 0) {
    activeProfileIndicator.style.display = 'none';
    activeProfileIndicator.innerHTML = '';
    return;
  }

  // 3. Có profile đang chạy
  activeProfileIndicator.style.display = 'inline-flex';
  if (runningProfiles.length === 1) {
    const p = runningProfiles[0];
    activeProfileIndicator.innerHTML = `
      <span class="active-profile-pill" title="Hồ sơ đang mở. Nhấn để định vị trong bảng." onclick="window.focusProfile('${p.id}')">
        <span class="pulse-dot-green"></span>
        <span>Đang mở: <strong>${escapeHtml(p.name)}</strong></span>
      </span>
    `;
  } else {
    const first = runningProfiles[0];
    activeProfileIndicator.innerHTML = `
      <span class="active-profile-pill" title="${runningProfiles.map(p => p.name).join(', ')}" onclick="window.focusProfile('${first.id}')">
        <span class="pulse-dot-green"></span>
        <span>Đang mở: <strong>${escapeHtml(first.name)}</strong> (+${runningProfiles.length - 1})</span>
      </span>
    `;
  }
}

window.focusProfile = function(id) {
  const row = document.getElementById(`profile-row-${id}`);
  if (row) {
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.style.transition = 'background-color 0.4s';
    const oldBg = row.style.backgroundColor;
    row.style.backgroundColor = 'rgba(56, 103, 244, 0.25)';
    setTimeout(() => { row.style.backgroundColor = oldBg; }, 1400);
  }
};

window.updateActiveProfileIndicator = updateActiveProfileIndicator;

// Render Profiles Table
function renderProfiles() {
  const query = (searchInput.value || '').toLowerCase().trim();
  const selectedGroupId = filterGroupSelect ? filterGroupSelect.value : '';
  const filtered = allProfiles.filter(p => {
    const matchesQuery = p.name.toLowerCase().includes(query) ||
           (p.group_name && p.group_name.toLowerCase().includes(query)) ||
           p.id.toLowerCase().includes(query);
    const matchesGroup = !selectedGroupId || p.group_id === selectedGroupId;
    return matchesQuery && matchesGroup;
  });

  // Update Stats
  statTotal.innerText = allProfiles.length;
  const runningCount = allProfiles.filter(p => p.isRunning).length;
  statRunning.innerText = runningCount;

  if (licenseInfo) {
    statQuota.innerText = `${allProfiles.length}/${licenseInfo.max_profiles}`;
    sidebarPlanQuota.innerText = `${allProfiles.length}/${licenseInfo.max_profiles}`;
  }

  updateActiveProfileIndicator();

  if (filtered.length === 0) {
    if (allProfiles.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
            <div style="width: 52px; height: 52px; border-radius: 12px; background: rgba(56, 103, 244, 0.1); border: 1px solid rgba(56, 103, 244, 0.25); display: inline-flex; align-items: center; justify-content: center; color: var(--primary); margin-bottom: 12px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            </div>
            <div style="font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">Chưa có hồ sơ nào</div>
            <p style="font-size: 12.5px; color: var(--text-muted); max-width: 400px; margin: 0 auto 16px;">Tạo hồ sơ độc lập đầu tiên với dấu vân tay phần cứng và nhân Chromium chống nhận diện 100%.</p>
            <button class="uiv-cta-primary" onclick="document.getElementById('btn-create-modal').click()" style="display: inline-flex; align-items: center; gap: 6px; margin: 0 auto; padding: 9px 18px; font-size: 13px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>Tạo Hồ Sơ Đầu Tiên</span>
            </button>
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
            Không tìm thấy hồ sơ nào khớp với bộ lọc tìm kiếm.
          </td>
        </tr>
      `;
    }
    updateBatchToolbar();
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    let fp = null;
    if (p.fingerprint) {
      try {
        fp = typeof p.fingerprint === 'string' ? JSON.parse(p.fingerprint) : p.fingerprint;
      } catch (e) {
        fp = null;
      }
    }

    // OS detection & modern official SVG
    const osType = fp?.os || 'windows';
    let osSvg = `<svg width="14" height="14" viewBox="0 0 88 88" fill="none"><rect width="40" height="40" rx="3" fill="#0078D4"/><rect x="48" width="40" height="40" rx="3" fill="#0078D4"/><rect y="48" width="40" height="40" rx="3" fill="#0078D4"/><rect x="48" y="48" width="40" height="40" rx="3" fill="#0078D4"/></svg>`;
    let osTooltip = 'Windows 11';
    if (osType === 'mac') {
      osSvg = `<svg width="14" height="14" viewBox="0 0 384 512" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>`;
      osTooltip = 'macOS Sonoma';
    } else if (osType === 'linux') {
      osSvg = `<svg width="14" height="14" viewBox="0 0 448 512" fill="#F59E0B"><path d="M220.8 123.3c1 .5 1.8 1.7 3 1.7 1.1 0 2.8-.4 2.9-1.5.2-1.4-1.9-2.3-3.2-2.9-1.7-.7-3.9-1-5.5-.1-.4.2-.8.7-.6 1.1.3 1.3 2.3 1.1 3.4 1.7zm-21.9 1.7c1.2 0 2-1.2 3-1.7 1.1-.6 3.1-.4 3.5-1.6.2-.4-.2-.9-.6-1.1-1.6-.9-3.8-.6-5.5.1-1.3.6-3.4 1.5-3.2 2.9.1 1 1.8 1.5 2.8 1.4zM420 403.8c-3.6-4-5.3-11.6-7.2-19.7-1.8-8.1-3.9-16.8-10.5-22.4-1.3-1.1-2.6-2.1-4-2.9-1.3-.8-2.7-1.5-4.1-2 9.2-27.3 5.6-54.5-3.7-79.1-11.4-30.1-31.3-56.4-46.5-74.4-17.1-21.5-33.7-41.9-33.4-72C311.1 85.4 315.7.1 234.8 0 132.4-.2 158 103.4 156.9 135.2c-1.7 23.4-6.4 41.8-22.5 64.7-18.9 22.5-45.5 58.8-58.1 96.7-6 17.9-8.8 36.1-6.2 53.3-6.5 5.8-11.4 14.7-16.6 20.2-4.2 4.3-10.3 5.9-17 8.3s-14 6-18.5 14.5c-2.1 3.9-2.8 8.1-2.8 12.4 0 3.9.6 7.9 1.2 11.8 1.2 8.1 2.5 15.7.8 20.8-5.2 14.4-5.9 24.4-2.2 31.7 3.8 7.3 11.4 10.5 20.1 12.3 17.3 3.6 40.8 2.7 59.3 12.5 19.8 10.4 39.9 14.1 55.9 10.4 11.6-2.6 21.1-9.6 25.9-20.2 12.5-.1 26.3-5.4 48.3-6.6 14.9-1.2 33.6 5.3 55.1 4.1.6 2.3 1.4 4.6 2.5 6.7v.1c8.3 16.7 23.8 24.3 40.3 23 16.6-1.3 34.1-11 48.3-27.9 13.6-16.4 36-23.2 50.9-32.2 7.4-4.5 13.4-10.1 13.9-18.3.4-8.2-4.4-17.3-15.5-29.7zM223.7 87.3c9.8-22.2 34.2-21.8 44-.4 6.5 14.2 3.6 30.9-4.3 40.4-1.6-.8-5.9-2.6-12.6-4.9 1.1-1.2 3.1-2.7 3.9-4.6 4.8-11.8-.2-27-9.1-27.3-7.3-.5-13.9 10.8-11.8 23-4.1-2-9.4-3.5-13-4.4-1-6.9-.3-14.6 2.9-21.8zM183 75.8c10.1 0 20.8 14.2 19.1 33.5-3.5 1-7.1 2.5-10.2 4.6 1.2-8.9-3.3-20.1-9.6-19.6-8.4.7-9.8 21.2-1.8 28.1 1 .8 1.9-.2-5.9 5.5-15.6-14.6-10.5-52.1 8.4-52.1zm-13.6 60.7c6.2-4.6 13.6-10 14.1-10.5 4.7-4.4 13.5-14.2 27.9-14.2 7.1 0 15.6 2.3 25.9 8.9 6.3 4.1 11.3 4.4 22.6 9.3 8.4 3.5 13.7 9.7 10.5 18.2-2.6 7.1-11 14.4-22.7 18.1-11.1 3.6-19.8 16-38.2 14.9-3.9-.2-7-1-9.6-2.1-8-3.5-12.2-10.4-20-15-8.6-4.8-13.2-10.4-14.7-15.3-1.4-4.9 0-9 4.2-12.3zm3.3 334c-2.7 35.1-43.9 34.4-75.3 18-29.9-15.8-68.6-6.5-76.5-21.9-2.4-4.7-2.4-12.7 2.6-26.4v-.2c2.4-7.6.6-16-.6-23.9-1.2-7.8-1.8-15 .9-20 3.5-6.7 8.5-9.1 14.8-11.3 10.3-3.7 11.8-3.4 19.6-9.9 5.5-5.7 9.5-12.9 14.3-18 5.1-5.5 10-8.1 17.7-6.9 8.1 1.2 15.1 6.8 21.9 16l19.6 35.6c9.5 19.9 43.1 48.4 41 68.9zm-1.4-25.9c-4.1-6.6-9.6-13.6-14.4-19.6 7.1 0 14.2-2.2 16.7-8.9 2.3-6.2 0-14.9-7.4-24.9-13.5-18.2-38.3-32.5-38.3-32.5-13.5-8.4-21.1-18.7-24.6-29.9s-3-23.3-.3-35.2c5.2-22.9 18.6-45.2 27.2-59.2 2.3-1.7.8 3.2-8.7 20.8-8.5 16.1-24.4 53.3-2.6 82.4.6-20.7 5.5-41.8 13.8-61.5 12-27.4 37.3-74.9 39.3-112.7 1.1.8 4.6 3.2 6.2 4.1 4.6 2.7 8.1 6.7 12.6 10.3 12.4 10 28.5 9.2 42.4 1.2 6.2-3.5 11.2-7.5 15.9-9 9.9-3.1 17.8-8.6 22.3-15 7.7 30.4 25.7 74.3 37.2 95.7 6.1 11.4 18.3 35.5 23.6 64.6 3.3-.1 7 .4 10.9 1.4 13.8-35.7-11.7-74.2-23.3-84.9-4.7-4.6-4.9-6.6-2.6-6.5 12.6 11.2 29.2 33.7 35.2 59 2.8 11.6 3.3 23.7.4 35.7 16.4 6.8 35.9 17.9 30.7 34.8-2.2-.1-3.2 0-4.2 0 3.2-10.1-3.9-17.6-22.8-26.1-19.6-8.6-36-8.6-38.3 12.5-12.1 4.2-18.3 14.7-21.4 27.3-2.8 11.2-3.6 24.7-4.4 39.9-.5 7.7-3.6 18-6.8 29-32.1 22.9-76.7 32.9-114.3 7.2zm257.4-11.5c-.9 16.8-41.2 19.9-63.2 46.5-13.2 15.7-29.4 24.4-43.6 25.5s-26.5-4.8-33.7-19.3c-4.7-11.1-2.4-23.1 1.1-36.3 3.7-14.2 9.2-28.8 9.9-40.6.8-15.2 1.7-28.5 4.2-38.7 2.6-10.3 6.6-17.2 13.7-21.1.3-.2.7-.3 1-.5.8 13.2 7.3 26.6 18.8 29.5 12.6 3.3 30.7-7.5 38.4-16.3 9-.3 15.7-.9 22.6 5.1 9.9 8.5 7.1 30.3 17.1 41.6 10.6 11.6 14 19.5 13.7 24.6zM173.3 148.7c2 1.9 4.7 4.5 8 7.1 6.6 5.2 15.8 10.6 27.3 10.6 11.6 0 22.5-5.9 31.8-10.8 4.9-2.6 10.9-7 14.8-10.4s5.9-6.3 3.1-6.6-2.6 2.6-6 5.1c-4.4 3.2-9.7 7.4-13.9 9.8-7.4 4.2-19.5 10.2-29.9 10.2s-18.7-4.8-24.9-9.7c-3.1-2.5-5.7-5-7.7-6.9-1.5-1.4-1.9-4.6-4.3-4.9-1.4-.1-1.8 3.7 1.7 6.5z"/></svg>`;
      osTooltip = 'Linux (Tux)';
    } else if (osType === 'android') {
      osSvg = `<svg width="14" height="14" viewBox="0 0 576 512" fill="#3DDC84"><path d="M420.55,301.93a24,24,0,1,1,24-24,24,24,0,0,1-24,24m-265.1,0a24,24,0,1,1,24-24,24,24,0,0,1-24,24m273.7-144.48,47.94-83a10,10,0,1,0-17.27-10h0l-48.54,84.07a301.25,301.25,0,0,0-246.56,0L116.18,64.45a10,10,0,1,0-17.27,10h0l47.94,83C64.53,202.22,8.24,285.55,0,384H576c-8.24-98.45-64.54-181.78-146.85-226.55"/></svg>`;
      osTooltip = 'Android';
    }

    const kernelVersion = (p.kernel_path && (p.kernel_path.includes('153') || p.kernel_path.includes('Chromium_Workspace'))) ? '153' : '150';
    const groupColor = (!p.group_color || p.group_color.toLowerCase() === '#3867f4') ? '#60A5FA' : p.group_color;
    const isChecked = selectedProfileIds.has(p.id);

    return `
      <tr>
        <td style="text-align: center; padding-left: 12px; padding-right: 6px;">
          <input type="checkbox" class="profile-row-cb" data-id="${p.id}" ${isChecked ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px; accent-color: var(--primary);">
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="os-badge" title="${osTooltip}">
              ${osSvg}
            </div>
            <span class="kernel-pill" title="Chromium Core Kernel">${kernelVersion}</span>
          </div>
        </td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-weight: 700; font-size: 13px; color: var(--text-main);">${escapeHtml(p.name)}</span>
              <button class="btn-icon-action" onclick="copyText('${p.id}', event)" title="Sao chép ID: ${p.id}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
              <button class="btn-icon-action" onclick="editProfile('${p.id}')" title="Sửa hồ sơ">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </div>
            <div style="font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
              <span style="font-family: monospace;">ID: ${p.id.slice(0, 8)}...</span>
              <span>•</span>
              <span>${p.hardware_concurrency || 8}C/${p.device_memory || 8}GB</span>
            </div>
          </div>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${groupColor}" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <span style="font-size: 12px; font-weight: 600; color: ${groupColor};">${escapeHtml(p.group_name || 'Không nhóm')}</span>
          </div>
        </td>
        <td>
          ${p.proxy_host ? `
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span style="font-family: monospace; font-size: 12px; font-weight: 600; color: var(--text-main);" id="proxy-ip-display-${p.id}">${escapeHtml(p.proxy_host)}:${p.proxy_port}</span>
                ${p.proxy_rotation_api_url ? `
                  <button class="btn-rotate-proxy" onclick="rotateProfileProxy('${p.id}', event)" title="Xoay đổi IP mới ngay lập tức qua API" id="btn-rotate-${p.id}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                  </button>
                ` : ''}
              </div>
              <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted);">
                <span style="text-transform: uppercase; font-weight: 700; color: var(--accent);">${p.proxy_type || 'HTTP'}</span>
                ${p.proxy_user ? '<span style="display:inline-flex; align-items:center; gap:3px;">• Auth <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>' : ''}
                ${p.proxy_rotation_api_url ? '<span style="color: #10B981; font-weight: 600;">• Xoay IP 4G</span>' : ''}
              </div>
            </div>
          ` : `
            <div style="display: flex; align-items: center; gap: 6px; color: var(--text-muted); font-size: 12px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
              <span>Trực tiếp (Direct)</span>
            </div>
          `}
        </td>
        <td>
          ${launchingProfileIds.has(p.id)
            ? `<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.35); font-size: 12px; padding: 4px 9px; display: inline-flex; align-items: center; gap: 6px;"><span class="badge-pulse" style="background: #F59E0B;"></span> Đang khởi động...</span>`
            : (stoppingProfileIds.has(p.id)
                ? `<span class="badge" style="background: rgba(148, 163, 184, 0.15); color: #94A3B8; border: 1px solid rgba(148, 163, 184, 0.35); font-size: 12px; padding: 4px 9px; display: inline-flex; align-items: center; gap: 6px;"><span class="uiv-spinner" style="width: 10px; height: 10px; border-width: 1.5px; border-top-color: #94A3B8;"></span> Đang đóng...</span>`
                : (failedProfileIds.has(p.id)
                    ? `<span class="badge badge-danger" style="font-size: 12px; padding: 4px 9px; display: inline-flex; align-items: center; gap: 5px;" title="${escapeHtml(failedProfileIds.get(p.id))}"><span class="badge-dot danger"></span> Khởi động thất bại</span>`
                    : (p.isRunning
                        ? `<span class="badge badge-running" style="font-size: 12px; padding: 4px 9px;"><span class="badge-pulse"></span> Đang chạy</span>`
                        : `<span class="badge badge-stopped" style="font-size: 12px; padding: 4px 9px;">Đã dừng</span>`
                      )
                  )
              )
          }
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 5px; color: var(--text-muted); font-size: 12px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>${formatTimeAgo(p.last_run_at)}</span>
          </div>
        </td>
        <td style="text-align: right;">
          <div class="actions-cell" style="justify-content: flex-end; align-items: center; gap: 6px;">
            ${launchingProfileIds.has(p.id)
              ? `<button class="uiv-btn" style="opacity: 0.75; cursor: not-allowed; min-width: 68px; font-size: 12px; display: inline-flex; align-items: center; gap: 5px; background: rgba(245, 158, 11, 0.15); color: #F59E0B; border-color: rgba(245, 158, 11, 0.35);" disabled><span class="uiv-spinner" style="width: 11px; height: 11px; border-width: 2px; border-top-color: #F59E0B;"></span> Mở...</button>`
              : (stoppingProfileIds.has(p.id)
                  ? `<button class="uiv-btn" style="opacity: 0.75; cursor: not-allowed; min-width: 68px; font-size: 12px; display: inline-flex; align-items: center; gap: 5px;" disabled><span class="uiv-spinner" style="width: 11px; height: 11px; border-width: 2px;"></span> Đóng...</button>`
                  : (p.isRunning
                      ? `<button class="uiv-btn uiv-btn-stop" onclick="stopProfile('${p.id}')">Đóng</button>`
                      : `<button class="uiv-btn uiv-btn-run" onclick="startProfile('${p.id}')">Mở</button>`
                    )
                )
            }
            <button class="uiv-btn-icon" onclick="exportProfileZip('${p.id}', event)" title="Xuất toàn bộ Profile thành file ZIP (Backup & Restore)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <button class="uiv-btn-icon" onclick="openCookieModal('${p.id}')" title="Quản lý / Xuất / Nhập Cookie">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/></svg>
            </button>
            <button class="uiv-btn-icon" onclick="editProfile('${p.id}')" title="Sửa hồ sơ">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="uiv-btn-icon danger" onclick="deleteProfile('${p.id}')" title="Xóa hồ sơ">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  updateBatchToolbar();

  if (typeof renderSyncWorkspace === 'function') {
    renderSyncWorkspace();
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

// Actions
window.startProfile = async function(id) {
  try {
    launchingProfileIds.add(id);
    failedProfileIds.delete(id);
    renderProfiles();
    showToast(`Đang khởi chạy hồ sơ ${id.slice(0, 8)}...`, 'info');
    const res = await fetch(`${API_BASE}/profiles/${id}/start`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      launchingProfileIds.delete(id);
      showToast(`Profile đã mở thành công! PID: ${data.pid} | Cổng CDP: ${data.port}`, 'success');
      await fetchProfiles();
    } else {
      launchingProfileIds.delete(id);
      failedProfileIds.set(id, data.error || 'Khởi động thất bại');
      renderProfiles();
      showToast(`Không mở được: ${data.error}`, 'danger');
    }
  } catch (err) {
    launchingProfileIds.delete(id);
    failedProfileIds.set(id, err.message || 'Lỗi mở hồ sơ');
    renderProfiles();
    showToast(`Lỗi mở hồ sơ: ${err.message}`, 'danger');
  }
};

window.stopProfile = async function(id) {
  try {
    stoppingProfileIds.add(id);
    renderProfiles();
    showToast(`Đang đóng hồ sơ an toàn qua CDP...`, 'info');
    const res = await fetch(`${API_BASE}/profiles/${id}/stop`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      stoppingProfileIds.delete(id);
      showToast(`Đã đóng êm hồ sơ (Đã lưu toàn bộ cookie)`, 'success');
      await fetchProfiles();
    } else {
      stoppingProfileIds.delete(id);
      renderProfiles();
      showToast(`Lỗi đóng: ${data.error}`, 'danger');
    }
  } catch (err) {
    stoppingProfileIds.delete(id);
    renderProfiles();
    showToast(`Lỗi đóng hồ sơ: ${err.message}`, 'danger');
  }
};

// Modal Subtabs Navigation (PolyLogin Workstation)
function setModalTab(tab) {
  if (modalTabBasic) modalTabBasic.classList.toggle('active', tab === 'basic');
  if (modalTabProxy) modalTabProxy.classList.toggle('active', tab === 'proxy');
  if (modalTabFp) modalTabFp.classList.toggle('active', tab === 'fp');
  if (modalTabExt) modalTabExt.classList.toggle('active', tab === 'ext');

  if (modalContentBasic) modalContentBasic.style.display = tab === 'basic' ? 'block' : 'none';
  if (modalContentProxy) modalContentProxy.style.display = tab === 'proxy' ? 'flex' : 'none';
  if (modalContentFp) modalContentFp.style.display = tab === 'fp' ? 'block' : 'none';
  if (modalContentExt) modalContentExt.style.display = tab === 'ext' ? 'block' : 'none';

  if (tab === 'proxy') {
    if (typeof renderProxyHubCards === 'function') renderProxyHubCards();
    if (typeof updateSelectedProxyInspector === 'function') updateSelectedProxyInspector();
  }
}

if (modalTabBasic) modalTabBasic.addEventListener('click', () => setModalTab('basic'));
if (modalTabProxy) modalTabProxy.addEventListener('click', () => setModalTab('proxy'));
if (modalTabFp) modalTabFp.addEventListener('click', () => setModalTab('fp'));
if (modalTabExt) modalTabExt.addEventListener('click', () => setModalTab('ext'));

function getExtensionIcon(ext, size = 24) {
  const rawUrl = (ext && ext.icon_url) ? String(ext.icon_url).trim() : '';
  if (rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('/') || rawUrl.startsWith('data:image'))) {
    return `<img src="${escapeHtml(rawUrl)}" style="width:${size}px;height:${size}px;border-radius:4px;object-fit:contain;" alt="" onerror="this.onerror=null;this.replaceWith(this.nextElementSibling||this);"><svg style="display:none" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`;
  }

  const id = (ext && ext.id) ? ext.id.toLowerCase() : '';
  const name = (ext && ext.name) ? ext.name.toLowerCase() : '';

  // Proxy / IP Inspector
  if (id.includes('proxy') || name.includes('proxy') || name.includes('ip inspector')) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
  }

  // Facebook / FB Helper
  if (id.includes('fb') || name.includes('fb') || name.includes('facebook')) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="#3B82F6"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`;
  }

  // 2FA Authenticator
  if (id.includes('authenticator') || id.includes('2fa') || name.includes('2fa') || name.includes('authenticator')) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`;
  }

  // Cookie Editor
  if (id.includes('cookie') || name.includes('cookie')) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><circle cx="8.5" cy="8.5" r="1" fill="#F59E0B"/><circle cx="16" cy="15.5" r="1" fill="#F59E0B"/><circle cx="8.5" cy="15.5" r="1" fill="#F59E0B"/><circle cx="12" cy="12" r="1" fill="#F59E0B"/><circle cx="13" cy="17" r="1" fill="#F59E0B"/></svg>`;
  }

  // Generic extension package icon
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`;
}

function renderProfileExtensionsChecklist(selectedExtIds = []) {
  if (!profileExtensionsChecklist) return;
  if (!allExtensions || allExtensions.length === 0) {
    profileExtensionsChecklist.innerHTML = `
      <div style="text-align:center; padding: 24px; color: var(--text-muted); font-size: 12px;">
        Chưa có tiện ích nào trong hệ thống.
        <a href="javascript:void(0)" onclick="closeModal(); switchTab('extensions');" style="color: var(--primary); text-decoration: underline; margin-left: 4px;">
          Đến Kho Tiện Ích để cài đặt
        </a>
      </div>
    `;
    return;
  }

  profileExtensionsChecklist.innerHTML = allExtensions.map(ext => {
    const isGlobal = ext.is_global === 1;
    const isChecked = isGlobal || selectedExtIds.includes(ext.id);
    const disabledAttr = isGlobal ? 'disabled' : '';
    const badgeTxt = isGlobal
      ? `<span class="badge badge-global">Toàn cục (Luôn bật)</span>`
      : `<span class="badge badge-targeted">Riêng lẻ</span>`;

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:10px 14px; border-radius:8px; border:1px solid var(--border-subtle);">
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="display:inline-flex; align-items:center; flex-shrink:0;">${getExtensionIcon(ext, 20)}</span>
          <div>
            <div style="font-size:13px; font-weight:600; color:var(--text-main);">
              ${escapeHtml(ext.name)} 
              <span style="font-size:11px; color:var(--text-muted); font-family:monospace;">v${escapeHtml(ext.version)}</span>
            </div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
              ${escapeHtml(ext.description || ext.path)}
            </div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          ${badgeTxt}
          <input type="checkbox" class="profile-ext-cb" value="${ext.id}" ${isChecked ? 'checked' : ''} ${disabledAttr} style="width:18px; height:18px; accent-color:var(--primary); cursor:pointer;">
        </div>
      </div>
    `;
  }).join('');
}

const WEBGL_CONFIGS = {
  rtx4070: {
    vendor: 'Google Inc. (NVIDIA)',
    renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 (0x00002786) Direct3D11 vs_5_0 ps_5_0, D3D11)',
    unmaskedVendor: 'Google Inc. (NVIDIA)',
    unmaskedRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)'
  },
  rtx3060: {
    vendor: 'Google Inc. (NVIDIA)',
    renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)',
    unmaskedVendor: 'Google Inc. (NVIDIA)',
    unmaskedRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)'
  },
  rtx3080: {
    vendor: 'Google Inc. (NVIDIA)',
    renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 (0x00002206) Direct3D11 vs_5_0 ps_5_0, D3D11)',
    unmaskedVendor: 'Google Inc. (NVIDIA)',
    unmaskedRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)'
  },
  rx6700: {
    vendor: 'Google Inc. (AMD)',
    renderer: 'ANGLE (AMD, AMD Radeon RX 6700 XT (0x000073DF) Direct3D11 vs_5_0 ps_5_0, D3D11)',
    unmaskedVendor: 'Google Inc. (AMD)',
    unmaskedRenderer: 'ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)'
  },
  iris_xe: {
    vendor: 'Google Inc. (Intel)',
    renderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11)',
    unmaskedVendor: 'Google Inc. (Intel)',
    unmaskedRenderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)'
  },
  apple_m2: {
    vendor: 'Apple',
    renderer: 'Apple M2 Pro',
    unmaskedVendor: 'Apple Inc.',
    unmaskedRenderer: 'Apple M2 Pro'
  }
};

function generateRandomMac() {
  const hex = '0123456789ABCDEF';
  const parts = [];
  for (let i = 0; i < 6; i++) {
    parts.push(hex[Math.floor(Math.random() * 16)] + hex[Math.floor(Math.random() * 16)]);
  }
  return parts.join(' ');
}

function generateRandomDeviceName(os) {
  if (os === 'mac') {
    const macPrefixes = ['MacBook-Pro', 'MacBook-Air', 'iMac-Retina', 'Mac-mini', 'MacStudio'];
    return macPrefixes[Math.floor(Math.random() * macPrefixes.length)] + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  }
  if (os === 'linux') {
    return 'workstation-' + Math.random().toString(36).substring(2, 8);
  }
  if (os === 'android') {
    const androidDevices = ['Galaxy-S24', 'Pixel-9-Pro', 'Xiaomi-14T', 'OnePlus-12'];
    return androidDevices[Math.floor(Math.random() * androidDevices.length)] + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let rand = '';
  for (let i = 0; i < 7; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  return `DESKTOP-${rand}`;
}

const UA_PRESETS = {
  win11_chrome133: {
    os: 'windows',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
  },
  win10_chrome130: {
    os: 'windows',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.117 Safari/537.36'
  },
  mac_chrome133: {
    os: 'mac',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
  },
  mac_safari18: {
    os: 'mac',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
  },
  linux_chrome132: {
    os: 'linux',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
  },
  android_chrome133: {
    os: 'android',
    ua: 'Mozilla/5.0 (Linux; Android 15; Pixel 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36'
  }
};

const MODERN_USER_AGENTS = {
  windows: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.117 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.101 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0'
  ],
  mac: [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.117 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
  ],
  linux: [
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.117 Safari/537.36',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0'
  ],
  android: [
    'Mozilla/5.0 (Linux; Android 15; Pixel 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.102 Mobile Safari/537.36'
  ]
};

function getRandomUa(os) {
  const list = MODERN_USER_AGENTS[os] || MODERN_USER_AGENTS.windows;
  return list[Math.floor(Math.random() * list.length)];
}

// Cập nhật bảng tổng quan bên phải (Real-time Spec Sheet kiểu PolyLogin)
function updateProfileSummary() {
  if (!sumKernel) return;

  // 1. Browser Kernel
  if (formKernel && formKernel.selectedIndex >= 0) {
    const kText = formKernel.options[formKernel.selectedIndex]?.text || 'MyBrowser 153';
    sumKernel.innerText = kText.split(' (')[0].trim();
  }

  // 2. Hệ điều hành
  const activeOsBtn = document.querySelector('.os-select-btn.active');
  const os = activeOsBtn ? activeOsBtn.dataset.os : (fpOs ? fpOs.value : 'windows');
  const osMap = {
    windows: 'Windows 11',
    mac: 'macOS (Silicon)',
    linux: 'Linux (Ubuntu)',
    android: 'Android 14'
  };
  if (sumOs) sumOs.innerText = osMap[os] || 'Windows 11';

  // 3. User-Agent
  if (sumUa) {
    const uaVal = fpUserAgent?.value || 'Mozilla/5.0...';
    sumUa.innerText = uaVal;
    sumUa.title = uaVal;
  }

  // 4. Mạng / Proxy
  if (sumProxy) {
    const activeProxyPill = document.querySelector('#quick-proxy-pills .quick-pill-btn.active');
    const proxyMode = activeProxyPill ? activeProxyPill.dataset.proxymode : 'none';
    if (proxyMode === 'none') {
      sumProxy.innerText = 'Trực tiếp (Direct)';
      sumProxy.style.color = 'var(--text-muted)';
    } else if (proxyMode === 'hub') {
      const pid = formProxySelect ? formProxySelect.value : '';
      const p = allProxies.find(x => x.id === pid);
      if (p) {
        const flag = p.country ? `[${p.country}] ` : '';
        sumProxy.innerText = `${flag}${p.host}:${p.port}`;
        sumProxy.style.color = '#10B981';
      } else {
        sumProxy.innerText = 'Chưa chọn từ kho';
        sumProxy.style.color = 'var(--accent)';
      }
    } else if (proxyMode === 'custom') {
      const customVal = formProxy?.value.trim() || '';
      if (customVal) {
        sumProxy.innerText = customVal.replace(/^https?:\/\/[^@]*@/, '').substring(0, 24);
        sumProxy.style.color = 'var(--accent)';
      } else {
        sumProxy.innerText = 'Chưa nhập IP';
        sumProxy.style.color = 'var(--text-muted)';
      }
    }
  }

  // 5. Múi giờ
  if (sumTimezone) {
    sumTimezone.innerText = 'Dựa trên IP (Auto GeoIP)';
  }

  // 6. WebRTC
  if (sumWebrtc) {
    const wVal = formWebrtc?.value || 'fake_ip';
    if (wVal === 'fake_ip') {
      sumWebrtc.innerText = 'Bảo vệ (Fake IP UDP)';
      sumWebrtc.style.color = '#10B981';
    } else if (wVal === 'disabled') {
      sumWebrtc.innerText = 'Vô hiệu hóa WebRTC';
      sumWebrtc.style.color = 'var(--accent)';
    } else {
      sumWebrtc.innerText = 'Nguyên bản (Thực)';
      sumWebrtc.style.color = 'var(--text-muted)';
    }
  }

  // 7. Canvas / Audio Noise
  if (sumCanvas) {
    const hasNoise = fpCanvasNoise ? fpCanvasNoise.checked : true;
    sumCanvas.innerText = hasNoise ? 'Nhiễu' : 'Thực';
    sumCanvas.className = hasNoise ? 'summary-badge-active' : 'summary-prop-val';
  }
  if (sumAudio) {
    const hasAudio = fpAudioNoise ? fpAudioNoise.checked : true;
    sumAudio.innerText = hasAudio ? 'Nhiễu' : 'Thực';
    sumAudio.className = hasAudio ? 'summary-badge-active' : 'summary-prop-val';
  }

  // 8. GPU / WebGL
  if (sumGpu && fpWebgl && fpWebgl.selectedIndex >= 0) {
    sumGpu.innerText = fpWebgl.options[fpWebgl.selectedIndex]?.text || 'NVIDIA GeForce RTX 4070';
  }

  // 9. CPU & RAM
  if (sumCpu && fpCpu) {
    sumCpu.innerText = `${fpCpu.value || 8} Nhân`;
  }
  if (sumRam && fpRam) {
    sumRam.innerText = `${fpRam.value || 8} GB`;
  }

  // 10. Độ phân giải
  if (sumRes && formResolution) {
    sumRes.innerText = (formResolution.value || '1920x1080').replace('x', ' x ');
  }

  // 11. Tên thiết bị & MAC
  if (sumDevicename && fpDeviceName) {
    sumDevicename.innerText = fpDeviceName.value || 'DESKTOP-PPUE7CY';
  }
  if (sumMac) {
    if (!sumMac.innerText || sumMac.innerText === '77 64 D3 FC FE 79') {
      sumMac.innerText = generateRandomMac();
    }
  }
}

// Chống đệ quy & loop lặp vô tận khi đổi OS / User-Agent / Fingerprint
let isSyncingOs = false;
let isRandomizingFp = false;

// Chuyển đổi OS trên Card Buttons kiểu PolyLogin
function setWorkstationOs(os, triggerRandom = false) {
  if (isSyncingOs) return;
  isSyncingOs = true;
  try {
    document.querySelectorAll('.os-select-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.os === os);
    });
    if (fpOs) {
      fpOs.value = os;
    }

    if (os === 'mac') {
      if (fpWebgl) fpWebgl.value = 'apple_m2';
      if (uaPresetSelect) uaPresetSelect.value = 'mac_chrome133';
    } else if (os === 'linux') {
      if (fpWebgl && fpWebgl.value === 'apple_m2') fpWebgl.value = 'rtx3060';
      if (uaPresetSelect) uaPresetSelect.value = 'linux_chrome132';
    } else if (os === 'android') {
      if (fpWebgl) fpWebgl.value = 'iris_xe';
      if (uaPresetSelect) uaPresetSelect.value = 'android_chrome133';
    } else {
      if (fpWebgl && fpWebgl.value === 'apple_m2') fpWebgl.value = 'rtx4070';
      if (uaPresetSelect) uaPresetSelect.value = 'win11_chrome133';
    }

    if (fpUserAgent) fpUserAgent.value = getRandomUa(os);
    if (fpDeviceName) fpDeviceName.value = generateRandomDeviceName(os);
    if (sumMac) sumMac.innerText = generateRandomMac();

    if (triggerRandom) {
      randomizeFingerprint(os, true);
    }
    updateProfileSummary();
    if (typeof syncAllCustomSelects === 'function') syncAllCustomSelects();
    else if (typeof initAllCustomSelects === 'function') initAllCustomSelects();
  } finally {
    isSyncingOs = false;
  }
}

document.querySelectorAll('.os-select-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    setWorkstationOs(btn.dataset.os, false);
  });
});

// =========================================================================
// PARSER & PROXY HUB MANAGER (UIverse Modern Redesign)
// =========================================================================

function parseProxyStringToFields(str) {
  if (!str) return null;
  let raw = String(str).trim();
  if (!raw) return null;
  let proto = 'http';

  // Kiểm tra tiền tố giao thức (http://, https://, socks5://, socks4://)
  const protoMatch = raw.match(/^([a-zA-Z0-9]+):\/\//);
  if (protoMatch) {
    proto = protoMatch[1].toLowerCase();
    raw = raw.slice(protoMatch[0].length);
  }

  let host = '', port = '', user = '', pass = '';

  // Định dạng URI chuẩn: [user[:pass]@]host:port
  if (raw.includes('@')) {
    const atParts = raw.split('@');
    const authPart = atParts[0];
    const hostPart = atParts.slice(1).join('@');
    if (authPart.includes(':')) {
      const authSub = authPart.split(':');
      user = authSub[0];
      pass = authSub.slice(1).join(':');
    } else {
      user = authPart;
    }
    const hostSub = hostPart.split(':');
    host = hostSub[0];
    port = hostSub[1] || '';
  } else {
    // Định dạng phân tách bằng dấu hai chấm ':'
    // Chuẩn: host:port:user:pass HOẶC host:port
    const parts = raw.split(':');
    if (parts.length >= 4) {
      host = parts[0];
      port = parts[1];
      user = parts[2];
      pass = parts.slice(3).join(':');
    } else if (parts.length === 2) {
      host = parts[0];
      port = parts[1];
    } else if (parts.length === 3) {
      host = parts[0];
      port = parts[1];
      user = parts[2];
    }
  }

  port = port ? parseInt(String(port).replace(/\D/g, ''), 10) : '';
  if (!host || !port || isNaN(port)) return null;

  return {
    proto: ['http', 'https', 'socks5', 'socks4'].includes(proto) ? proto : 'http',
    host: host.trim(),
    port: String(port),
    user: user ? user.trim() : '',
    pass: pass ? pass.trim() : ''
  };
}

// Hub State Variables
let currentHubFilter = 'all';
let currentHubSearch = '';

function updateProxyCounters() {
  const allCount = allProxies.length;
  const liveCount = allProxies.filter(p => p.status === 'live').length;

  const countAllEl = document.getElementById('proxy-count-all');
  if (countAllEl) countAllEl.innerText = allCount;

  const countLiveEl = document.getElementById('proxy-count-live');
  if (countLiveEl) countLiveEl.innerText = liveCount;

  // Cập nhật nhãn pill Tab 1
  const hubPillBtn = document.querySelector('#quick-proxy-pills .quick-pill-btn[data-proxymode="hub"]');
  if (hubPillBtn) {
    hubPillBtn.innerText = `Chọn từ Kho Proxy (${liveCount} Live)`;
  }
}

// Render danh sách thẻ Proxy trong Tab 2 Modal Hồ Sơ
function renderProxyHubCards() {
  const container = document.getElementById('proxy-hub-cards-container');
  if (!container) return;

  const q = (currentHubSearch || '').trim().toLowerCase();
  const filter = currentHubFilter || 'all';

  let list = allProxies.slice();

  // Lọc theo trạng thái / giao thức
  if (filter === 'live') {
    list = list.filter(p => p.status === 'live');
  } else if (filter === 'http') {
    list = list.filter(p => (p.type || '').toLowerCase() === 'http' || (p.type || '').toLowerCase() === 'https');
  } else if (filter === 'socks5') {
    list = list.filter(p => (p.type || '').toLowerCase() === 'socks5');
  }

  // Tìm kiếm theo text
  if (q) {
    list = list.filter(p => {
      const matchName = (p.name || '').toLowerCase().includes(q);
      const matchHost = (p.host || '').toLowerCase().includes(q);
      const matchPort = String(p.port || '').includes(q);
      const matchCountry = (p.country || '').toLowerCase().includes(q);
      return matchName || matchHost || matchPort || matchCountry;
    });
  }

  if (allProxies.length === 0) {
    container.innerHTML = `
      <div style="padding: 28px 16px; text-align: center; color: var(--text-muted); background: rgba(56, 103, 244, 0.04); border: 1.5px dashed rgba(56, 103, 244, 0.25); border-radius: 12px;">
        <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(56, 103, 244, 0.1); color: var(--primary); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 10px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        </div>
        <div style="font-size: 13.5px; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">Kho Proxy Đang Trống</div>
        <p style="font-size: 12px; color: var(--text-muted); margin: 0 auto 12px; max-width: 340px;">Bạn có thể chuyển sang chế độ <strong>"Nhập Tùy Chỉnh"</strong> để dùng trực tiếp cho hồ sơ này.</p>
        <div style="display: flex; gap: 8px; justify-content: center;">
          <button type="button" class="uiv-btn uiv-btn-secondary" onclick="setQuickProxyMode('custom')" style="font-size: 12px; padding: 6px 14px; font-weight: 600;">
            <span>Chuyển sang Nhập Tùy Chỉnh</span>
          </button>
        </div>
      </div>
    `;
    return;
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div style="padding: 32px 16px; text-align: center; color: var(--text-muted); background: rgba(255,255,255,0.02); border: 1px dashed var(--border-subtle); border-radius: 10px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px; opacity: 0.6;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <div style="font-size: 13px; font-weight: 600; color: var(--text-main);">Không tìm thấy Proxy phù hợp</div>
        <div style="font-size: 11.5px; margin-top: 4px;">Thử đổi bộ lọc hoặc từ khóa tìm kiếm.</div>
      </div>
    `;
    return;
  }

  const selectedId = formProxySelect ? formProxySelect.value : '';

  container.innerHTML = list.map(p => {
    const isSelected = selectedId === p.id;
    const isLive = p.status === 'live';
    const protoLower = (p.type || 'http').toLowerCase();
    const protoUpper = protoLower.toUpperCase();
    const flag = p.country ? p.country.toUpperCase() : '';
    const pingTxt = p.ping > 0 ? `${p.ping}ms` : '';

    // Bóc tách tên gọn gàng không bị lặp lại IP:Port
    let displayName = (p.name || '').trim();
    if (displayName) {
      displayName = displayName.replace(new RegExp(`\\s*[-•]?\\s*${p.host}(?::\\d+)?`, 'gi'), '').trim();
      displayName = displayName.replace(new RegExp(`^${p.host}:\\d+\\s*`, 'gi'), '').trim();
    }
    if (!displayName || displayName === '-' || displayName === ':') {
      displayName = p.city ? `${p.city}` : '';
    }

    return `
      <div class="proxy-card-item ${isSelected ? 'selected' : ''}" data-id="${p.id}" onclick="selectHubProxy('${p.id}')">
        <div class="pcard-left-group">
          <div class="pcard-radio-circle">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="pcard-tag-group">
            ${flag ? `<span class="pcard-pill pcard-country-pill">${flag}</span>` : ''}
            <span class="pcard-pill pcard-proto-pill proto-${protoLower}">${protoUpper}</span>
          </div>
          <div class="pcard-hostport-wrap">
            <span class="pcard-ip">${escapeHtml(p.host)}</span><span class="pcard-colon">:</span><span class="pcard-port">${escapeHtml(String(p.port))}</span>
          </div>
          ${displayName ? `<span class="pcard-label" title="${escapeHtml(p.name)}">${escapeHtml(displayName)}</span>` : ''}
        </div>
        <div class="pcard-right-group">
          ${pingTxt ? `
            <span class="pcard-ping-pill ${p.ping < 600 ? 'ping-fast' : (p.ping < 1200 ? 'ping-med' : 'ping-slow')}">
              ⚡ ${pingTxt}
            </span>
          ` : ''}
          <span class="pcard-status-pill ${isLive ? 'status-live' : 'status-die'}">
            <span class="status-dot"></span>
            <span>${isLive ? 'LIVE' : (p.status === 'die' ? 'DIE' : 'Chưa test')}</span>
          </span>
        </div>
      </div>
    `;
  }).join('');
}

// Chọn một Proxy trong Kho
window.selectHubProxy = function(id) {
  if (formProxySelect) formProxySelect.value = id;
  if (tabProxyHubSelect) tabProxyHubSelect.value = id;

  document.querySelectorAll('#proxy-hub-cards-container .proxy-card-item').forEach(card => {
    card.classList.toggle('selected', card.dataset.id === id);
  });

  const hubResult = document.getElementById('hub-proxy-test-result');
  if (hubResult) hubResult.style.display = 'none';

  updateSelectedProxyInspector();
  updateProfileSummary();
  if (typeof initAllCustomSelects === 'function') initAllCustomSelects();
};

// Cập nhật Inspector chi tiết Proxy đang chọn
function updateSelectedProxyInspector() {
  const inspector = document.getElementById('selected-proxy-inspector');
  if (!inspector) return;

  const pid = formProxySelect ? formProxySelect.value : '';
  const p = allProxies.find(x => x.id === pid);

  if (!p) {
    inspector.style.display = 'none';
    return;
  }

  inspector.style.display = 'block';
  const inspName = document.getElementById('insp-name');
  const inspProto = document.getElementById('insp-proto');
  const inspHostPort = document.getElementById('insp-hostport');
  const inspAuth = document.getElementById('insp-auth');
  const inspStatus = document.getElementById('insp-status');
  const inspPing = document.getElementById('insp-ping');

  if (inspName) {
    let cleanName = (p.name || '').trim();
    if (cleanName.includes(p.host)) {
      cleanName = cleanName.replace(new RegExp(`\\s*[-•]?\\s*${p.host}(?::\\d+)?`, 'gi'), '').trim();
    }
    inspName.innerText = cleanName || `Proxy ${p.host}:${p.port}`;
  }
  if (inspProto) {
    const protoLower = (p.type || 'http').toLowerCase();
    inspProto.innerText = protoLower.toUpperCase();
    inspProto.className = `pcard-pill pcard-proto-pill proto-${protoLower}`;
  }
  if (inspHostPort) {
    inspHostPort.innerHTML = `<span style="color:var(--text-main); font-weight:700;">${escapeHtml(p.host)}</span><span style="color:var(--text-muted);">:</span><span style="color:var(--primary); font-weight:700;">${escapeHtml(String(p.port))}</span>`;
  }
  if (inspAuth) {
    inspAuth.innerHTML = p.username
      ? `<span style="font-weight:600;">${escapeHtml(p.username)} <span style="font-size:11px;color:var(--text-muted);font-weight:normal;">(Có pass)</span></span>`
      : `<span style="color:var(--text-muted); font-weight:500;">Không (IP Trực tiếp)</span>`;
  }
  if (inspStatus) {
    inspStatus.innerHTML = p.status === 'live'
      ? `<span class="pcard-status-pill status-live"><span class="status-dot"></span><span>🟢 LIVE</span></span>`
      : `<span class="pcard-status-pill status-die"><span class="status-dot"></span><span>🔴 DIE / Lỗi</span></span>`;
  }
  if (inspPing) {
    inspPing.innerHTML = p.ping > 0
      ? `<span class="pcard-ping-pill ${p.ping < 600 ? 'ping-fast' : (p.ping < 1200 ? 'ping-med' : 'ping-slow')}">⚡ ${p.ping} ms</span>`
      : `<span style="color:var(--text-muted); font-weight:500;">--</span>`;
  }
}

// Chuyển đổi Chế độ Proxy toàn diện (UIverse Cards + Quick Pills)
function setQuickProxyMode(mode) {
  // 1. Cập nhật Pills ở Tab 1
  document.querySelectorAll('#quick-proxy-pills .quick-pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.proxymode === mode);
  });

  // 2. Cập nhật 3 Cards lớn ở Tab 2
  document.querySelectorAll('.proxy-mode-card').forEach(card => {
    card.classList.toggle('active', card.dataset.mode === mode);
  });

  const panelNone = document.getElementById('proxy-panel-none');
  const panelHub = document.getElementById('proxy-panel-hub');
  const panelCustom = document.getElementById('proxy-panel-custom');

  if (mode === 'none') {
    if (panelNone) panelNone.style.display = 'block';
    if (panelHub) panelHub.style.display = 'none';
    if (panelCustom) panelCustom.style.display = 'none';

    if (quickProxyHubWrap) quickProxyHubWrap.style.display = 'none';
    if (quickProxyCustomWrap) quickProxyCustomWrap.style.display = 'none';
    if (formProxySelect) formProxySelect.value = '';
    if (formProxy) { formProxy.value = ''; formProxy.style.display = 'none'; }
    if (tabProxySource) tabProxySource.value = 'none';
  } else if (mode === 'hub') {
    if (panelNone) panelNone.style.display = 'none';
    if (panelHub) panelHub.style.display = 'flex';
    if (panelCustom) panelCustom.style.display = 'none';

    if (quickProxyHubWrap) quickProxyHubWrap.style.display = 'block';
    if (quickProxyCustomWrap) quickProxyCustomWrap.style.display = 'none';
    if (tabProxySource) tabProxySource.value = 'hub';

    if (formProxySelect && (!formProxySelect.value || formProxySelect.value === '__custom__')) {
      if (allProxies.length > 0) {
        formProxySelect.value = allProxies[0].id;
        if (tabProxyHubSelect) tabProxyHubSelect.value = allProxies[0].id;
      }
    }
    renderProxyHubCards();
    updateSelectedProxyInspector();
  } else if (mode === 'custom') {
    if (panelNone) panelNone.style.display = 'none';
    if (panelHub) panelHub.style.display = 'none';
    if (panelCustom) panelCustom.style.display = 'block';

    if (quickProxyHubWrap) quickProxyHubWrap.style.display = 'none';
    if (quickProxyCustomWrap) quickProxyCustomWrap.style.display = 'block';
    if (tabProxySource) tabProxySource.value = 'custom';
    if (formProxySelect) formProxySelect.value = '__custom__';
    if (formProxy) {
      formProxy.style.display = 'block';
    }
    syncCustomProxyToHiddenInput();
  }
  updateProfileSummary();
  if (typeof initAllCustomSelects === 'function') initAllCustomSelects();
}

// Bắt sự kiện click 3 Mode Cards ở Tab 2
document.querySelectorAll('.proxy-mode-card').forEach(card => {
  card.addEventListener('click', () => {
    setQuickProxyMode(card.dataset.mode);
  });
});

// Bắt sự kiện click Quick Pills ở Tab 1
document.querySelectorAll('#quick-proxy-pills .quick-pill-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    setQuickProxyMode(btn.dataset.proxymode);
  });
});

// Tìm kiếm Hub Proxy
const proxyHubSearchInput = document.getElementById('proxy-hub-search-input');
const proxyHubSearchClear = document.getElementById('proxy-hub-search-clear');
if (proxyHubSearchInput) {
  proxyHubSearchInput.addEventListener('input', () => {
    currentHubSearch = proxyHubSearchInput.value;
    if (proxyHubSearchClear) {
      proxyHubSearchClear.style.display = currentHubSearch ? 'block' : 'none';
    }
    renderProxyHubCards();
  });
}
if (proxyHubSearchClear) {
  proxyHubSearchClear.addEventListener('click', () => {
    if (proxyHubSearchInput) proxyHubSearchInput.value = '';
    currentHubSearch = '';
    proxyHubSearchClear.style.display = 'none';
    renderProxyHubCards();
  });
}

// Filter chips Hub
document.querySelectorAll('.proxy-filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.proxy-filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentHubFilter = chip.dataset.filter || 'all';
    renderProxyHubCards();
  });
});

// Test trực tiếp Hub Proxy đang chọn trong Profile Modal
const btnTestHubProxy = document.getElementById('btn-test-hub-proxy');
const hubProxyTestResult = document.getElementById('hub-proxy-test-result');
if (btnTestHubProxy) {
  btnTestHubProxy.addEventListener('click', async () => {
    const pid = formProxySelect ? formProxySelect.value : '';
    if (!pid || pid === '__custom__') {
      showToast('Vui lòng chọn một Proxy từ danh sách trước khi kiểm tra!', 'warning');
      return;
    }
    const btnText = document.getElementById('btn-test-hub-proxy-text');
    const origText = btnText ? btnText.innerText : 'Kiểm Tra Proxy Ngay';
    if (btnText) btnText.innerHTML = '<span class="spinner-sm"></span> Đang ping...';
    btnTestHubProxy.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/proxies/${pid}/check`, { method: 'POST' });
      const data = await res.json();
      if (hubProxyTestResult) {
        hubProxyTestResult.style.display = 'block';

        // Luôn đồng bộ trạng thái mới nhất vào mảng allProxies
        const found = allProxies.find(x => x.id === pid);
        if (found && data.proxy) {
          found.status = data.proxy.status;
          found.ping = data.proxy.ping;
          found.ip = data.proxy.ip;
          found.country = data.proxy.country;
        }
        updateProxyCounters();
        renderProxyHubCards();
        updateSelectedProxyInspector();

        if (data.success && data.proxy && data.proxy.status === 'live') {
          const p = data.proxy;
          hubProxyTestResult.className = 'proxy-test-result-box success';
          hubProxyTestResult.innerHTML = `
            <div class="result-headline">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span>KẾT NỐI LIVE THÀNH CÔNG</span>
            </div>
            <div class="result-details">
              IP: <strong>${escapeHtml(p.ip)}</strong> &bull; Quốc gia: <strong>${escapeHtml(p.country || 'Unknown')}</strong> &bull; Độ trễ Ping: <strong>${p.ping}ms</strong>
            </div>
          `;
          showToast(`✅ Proxy LIVE! Ping: ${p.ping}ms`, 'success');
        } else {
          const rawErr = data.result?.error || data.error || (data.proxy && data.proxy.error) || 'Không có phản hồi từ Proxy';
          hubProxyTestResult.className = 'proxy-test-result-box error';
          hubProxyTestResult.innerHTML = `
            <div class="result-headline">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <span>PROXY KHÔNG PHẢN HỒI (DIE)</span>
            </div>
            <div class="result-details">
              Lỗi: <strong>${escapeHtml(rawErr)}</strong>
            </div>
          `;
          showToast(`❌ Proxy DIE: ${rawErr}`, 'danger');
        }
      }
    } catch (err) {
      if (hubProxyTestResult) {
        hubProxyTestResult.style.display = 'block';
        hubProxyTestResult.className = 'proxy-test-result-box error';
        hubProxyTestResult.innerHTML = `<div class="result-headline"><span>LỖI KẾT NỐI</span></div><div class="result-details">${escapeHtml(err.message)}</div>`;
      }
    } finally {
      btnTestHubProxy.disabled = false;
      if (btnText) btnText.innerText = origText;
    }
  });
}

// =========================================================================
// CUSTOM PROXY CONFIGURATION LOGIC (Profile Modal Tab 2)
// =========================================================================

function setCustomProto(proto) {
  const cleanProto = ['http', 'https', 'socks5'].includes(proto) ? proto : 'http';
  document.querySelectorAll('#custom-proxy-proto-group .proto-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.proto === cleanProto);
  });
  const protoVal = document.getElementById('custom-proxy-proto-val');
  if (protoVal) protoVal.value = cleanProto;
  syncCustomProxyToHiddenInput();
}

document.querySelectorAll('#custom-proxy-proto-group .proto-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    setCustomProto(pill.dataset.proto);
  });
});

function syncCustomProxyToHiddenInput() {
  const proto = document.getElementById('custom-proxy-proto-val')?.value || 'http';
  const host = document.getElementById('custom-proxy-host')?.value.trim() || '';
  const port = document.getElementById('custom-proxy-port')?.value.trim() || '';
  const user = document.getElementById('custom-proxy-user')?.value.trim() || '';
  const pass = document.getElementById('custom-proxy-pass')?.value.trim() || '';

  if (host && port) {
    const auth = (user || pass) ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : '';
    const full = `${proto}://${auth}${host}:${port}`;
    if (formProxy) formProxy.value = full;
  } else {
    if (formProxy) formProxy.value = '';
  }
  updateProfileSummary();
  if (typeof initAllCustomSelects === 'function') initAllCustomSelects();
}

function setCustomProxyFormValues(opts) {
  setCustomProto(opts.proto || 'http');
  const hInput = document.getElementById('custom-proxy-host');
  const pInput = document.getElementById('custom-proxy-port');
  const uInput = document.getElementById('custom-proxy-user');
  const pwInput = document.getElementById('custom-proxy-pass');
  const rotInput = document.getElementById('custom-proxy-rotation-url');

  if (hInput) hInput.value = opts.host || '';
  if (pInput) pInput.value = opts.port || '';
  if (uInput) uInput.value = opts.user || '';
  if (pwInput) pwInput.value = opts.pass || '';
  if (rotInput) rotInput.value = opts.rotation_url || '';

  syncCustomProxyToHiddenInput();
}

function resetCustomProxyForm() {
  setCustomProto('http');
  const ids = ['custom-proxy-host', 'custom-proxy-port', 'custom-proxy-user', 'custom-proxy-pass', 'custom-proxy-rotation-url', 'custom-proxy-quick-paste'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const resultBox = document.getElementById('custom-proxy-test-result');
  if (resultBox) { resultBox.style.display = 'none'; resultBox.innerHTML = ''; }
  syncCustomProxyToHiddenInput();
}

// Lắng nghe input thay đổi ở Custom Proxy để sync tức thì
['custom-proxy-host', 'custom-proxy-port', 'custom-proxy-user', 'custom-proxy-pass'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', syncCustomProxyToHiddenInput);
});

// Toggle password Custom Proxy
const btnToggleCustomPwd = document.getElementById('btn-toggle-custom-pwd');
const customProxyPass = document.getElementById('custom-proxy-pass');
if (btnToggleCustomPwd && customProxyPass) {
  btnToggleCustomPwd.addEventListener('click', () => {
    customProxyPass.type = customProxyPass.type === 'password' ? 'text' : 'password';
  });
}

// Bóc tách nhanh chuỗi Proxy trong Custom Panel
const customProxyQuickPaste = document.getElementById('custom-proxy-quick-paste');
const btnParseCustomProxy = document.getElementById('btn-parse-custom-proxy');

function handleCustomProxyQuickParse() {
  const str = customProxyQuickPaste?.value.trim();
  if (!str) return;
  const lines = str.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const targetStr = lines[0] || str;
  const parsed = parseProxyStringToFields(targetStr);
  if (parsed) {
    setCustomProxyFormValues(parsed);
    showToast(`✨ Đã nhận diện Proxy: ${parsed.host}:${parsed.port} (${parsed.proto.toUpperCase()})`, 'success');
  } else {
    showToast('Không thể nhận diện định dạng Proxy. Vui lòng nhập: host:port:user:pass', 'warning');
  }
}

if (btnParseCustomProxy) btnParseCustomProxy.addEventListener('click', handleCustomProxyQuickParse);
if (customProxyQuickPaste) {
  customProxyQuickPaste.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || !e.shiftKey)) {
      e.preventDefault();
      handleCustomProxyQuickParse();
    }
  });
  customProxyQuickPaste.addEventListener('input', () => {
    const val = customProxyQuickPaste.value.trim();
    if (val.includes(':') && (val.split(':').length >= 2 || val.includes('://'))) {
      handleCustomProxyQuickParse();
    }
  });
}

// Test Custom Proxy trước khi gán
const btnTestCustomProxy = document.getElementById('btn-test-custom-proxy');
const customProxyTestResult = document.getElementById('custom-proxy-test-result');
if (btnTestCustomProxy) {
  btnTestCustomProxy.addEventListener('click', async () => {
    const proto = document.getElementById('custom-proxy-proto-val')?.value || 'http';
    const host = document.getElementById('custom-proxy-host')?.value.trim();
    const port = parseInt(document.getElementById('custom-proxy-port')?.value.trim(), 10);
    const username = document.getElementById('custom-proxy-user')?.value.trim();
    const password = document.getElementById('custom-proxy-pass')?.value.trim();

    if (!host || !port) {
      await showCustomAlert({
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập <strong>Host / IP</strong> và <strong>Cổng (Port)</strong> của Proxy để kiểm tra kết nối.',
        type: 'warning'
      });
      return;
    }

    const btnText = document.getElementById('btn-test-custom-proxy-text');
    const origText = btnText ? btnText.innerText : 'Kiểm Tra Kết Nối Proxy Này';
    if (btnText) btnText.innerHTML = '<span class="spinner-sm"></span> Đang kết nối thử nghiệm...';
    btnTestCustomProxy.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/proxies/test-custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: proto, host, port, username, password })
      });
      const data = await res.json();

      if (customProxyTestResult) {
        customProxyTestResult.style.display = 'block';
        if (data.success && data.status === 'live') {
          customProxyTestResult.className = 'proxy-test-result-box success';
          customProxyTestResult.innerHTML = `
            <div class="result-headline">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span>KẾT NỐI THÀNH CÔNG (LIVE)</span>
            </div>
            <div class="result-details">
              IP Ngoại vi: <strong>${data.ip}</strong> &bull; Quốc gia: <strong>${data.country || 'Unknown'}</strong> &bull; Ping: <strong>${data.ping}ms</strong>
            </div>
          `;
          showToast(`✅ Proxy LIVE! IP: ${data.ip} - ${data.ping}ms`, 'success');
        } else {
          customProxyTestResult.className = 'proxy-test-result-box error';
          customProxyTestResult.innerHTML = `
            <div class="result-headline">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <span>KẾT NỐI THẤT BÀI (DIE)</span>
            </div>
            <div class="result-details">
              Lỗi: ${escapeHtml(data.error || 'Proxy không phản hồi hoặc sai thông tin xác thực')}
            </div>
          `;
          showToast(`❌ Proxy không phản hồi`, 'danger');
        }
      }
    } catch (err) {
      if (customProxyTestResult) {
        customProxyTestResult.style.display = 'block';
        customProxyTestResult.className = 'proxy-test-result-box error';
        customProxyTestResult.innerHTML = `<div class="result-headline"><span>LỖI HỆ THỐNG</span></div><div class="result-details">${escapeHtml(err.message)}</div>`;
      }
    } finally {
      btnTestCustomProxy.disabled = false;
      if (btnText) btnText.innerText = origText;
    }
  });
}

if (tabProxySource) {
  tabProxySource.addEventListener('change', () => {
    setQuickProxyMode(tabProxySource.value);
  });
}
if (tabProxyHubSelect) {
  tabProxyHubSelect.addEventListener('change', () => {
    if (formProxySelect) formProxySelect.value = tabProxyHubSelect.value;
    updateProfileSummary();
  });
}

// Chuyển đổi Chế độ WebRTC nhanh kiểu PolyLogin
function setQuickWebRtc(mode) {
  document.querySelectorAll('#quick-webrtc-pills .quick-pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.webrtc === mode);
  });
  if (formWebrtc) formWebrtc.value = mode;
  updateProfileSummary();
  if (typeof initAllCustomSelects === 'function') initAllCustomSelects();
}

document.querySelectorAll('#quick-webrtc-pills .quick-pill-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    setQuickWebRtc(btn.dataset.webrtc);
  });
});

async function randomizeFingerprint(selectedOs, silent = false) {
  if (isRandomizingFp) return;
  isRandomizingFp = true;
  try {
    const os = selectedOs || fpOs?.value || 'windows';
    let fp = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${API_BASE}/fingerprints/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ os }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.fingerprint) {
          fp = data.fingerprint;
        }
      }
    } catch (err) {
      console.warn('[Fingerprint] Offline local generator fallback active');
    }

    // Fallback ngoại tuyến 100% nếu máy chưa kết nối API hoặc chạy LAN
    if (!fp) {
      const cpus = [4, 6, 8, 12, 16];
      const rams = [8, 16, 32];
      const resList = ['1920x1080', '1536x864', '1440x900', '2560x1440'];
      const chosenRes = resList[Math.floor(Math.random() * resList.length)].split('x');

      fp = {
        os,
        hardwareConcurrency: cpus[Math.floor(Math.random() * cpus.length)],
        deviceMemory: rams[Math.floor(Math.random() * rams.length)],
        screen: { width: Number(chosenRes[0]), height: Number(chosenRes[1]) },
        userAgent: getRandomUa(os)
      };
    }

    const targetOs = fp.os || 'windows';
    if (fpOs) {
      fpOs.value = targetOs;
    }

    // Cập nhật OS card tương ứng
    document.querySelectorAll('.os-select-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.os === targetOs);
    });

    if (targetOs === 'mac') {
      if (fpWebgl) fpWebgl.value = 'apple_m2';
      if (uaPresetSelect) uaPresetSelect.value = 'mac_chrome133';
    } else {
      const pcKeys = ['rtx4070', 'rtx3060', 'rtx3080', 'rx6700', 'iris_xe'];
      if (fpWebgl) {
        fpWebgl.value = pcKeys[Math.floor(Math.random() * pcKeys.length)];
      }
      if (uaPresetSelect) {
        uaPresetSelect.value = targetOs === 'linux' ? 'linux_chrome132' : (targetOs === 'android' ? 'android_chrome133' : 'win11_chrome133');
      }
    }

    if (fpCpu) fpCpu.value = String(fp.hardwareConcurrency || 8);
    if (fpRam) fpRam.value = String(fp.deviceMemory || 8);
    if (fp.screen && formResolution) {
      const resStr = `${fp.screen.width}x${fp.screen.height}`;
      if (formResolution.querySelector(`option[value="${resStr}"]`)) {
        formResolution.value = resStr;
      }
    }
    if (fpUserAgent) {
      fpUserAgent.value = fp.userAgent || getRandomUa(targetOs);
    }
    if (fpCanvasNoise) fpCanvasNoise.checked = true;
    if (fpAudioNoise) fpAudioNoise.checked = true;
    if (fpDeviceName) fpDeviceName.value = generateRandomDeviceName(targetOs);
    if (sumMac) sumMac.innerText = generateRandomMac();

    // Đồng bộ lại tất cả custom select trực quan
    if (typeof syncAllCustomSelects === 'function') {
      syncAllCustomSelects();
    } else if (typeof initAllCustomSelects === 'function') {
      initAllCustomSelects();
    }

    updateProfileSummary();

    if (!silent) {
      showToast(`🎲 Đã sinh ngẫu nhiên cấu hình vân tay (${targetOs.toUpperCase()} • ${fpCpu ? fpCpu.value : 8}C/${fpRam ? fpRam.value : 8}GB)`, 'info');
    }
  } finally {
    isRandomizingFp = false;
  }
}

if (btnRandomizeFp) {
  btnRandomizeFp.addEventListener('click', () => randomizeFingerprint());
}

if (btnRandomizeSummary) {
  btnRandomizeSummary.addEventListener('click', async () => {
    const curOs = fpOs ? fpOs.value : 'windows';
    await randomizeFingerprint(curOs, true);
    if (fpDeviceName) fpDeviceName.value = generateRandomDeviceName(curOs);
    if (sumMac) sumMac.innerText = generateRandomMac();
    updateProfileSummary();
    showToast('🎲 Đã tạo mới toàn bộ vân tay phần cứng và thiết bị!', 'success');
  });
}

if (btnQuickRandomUa) {
  btnQuickRandomUa.addEventListener('click', () => {
    const curOs = fpOs ? fpOs.value : 'windows';
    if (fpUserAgent) fpUserAgent.value = getRandomUa(curOs);
    if (uaPresetSelect) {
      uaPresetSelect.value = 'custom';
    }
    updateProfileSummary();
    showToast('🎲 Đã cập nhật chuỗi User-Agent ngẫu nhiên mới', 'info');
  });
}

if (uaPresetSelect) {
  uaPresetSelect.addEventListener('change', () => {
    if (isSyncingOs) return;
    const val = uaPresetSelect.value;
    if (val && UA_PRESETS[val]) {
      const preset = UA_PRESETS[val];
      if (fpUserAgent) fpUserAgent.value = preset.ua;
      setWorkstationOs(preset.os, false);
      updateProfileSummary();
      showToast(`Đã áp dụng User-Agent: ${preset.os.toUpperCase()}`, 'info');
    }
  });
}

if (fpOs) {
  fpOs.addEventListener('change', () => {
    if (isSyncingOs) return;
    setWorkstationOs(fpOs.value, false);
  });
}

// Lắng nghe sự kiện để cập nhật bảng tổng quan trực tiếp
[formKernel, fpWebgl, fpCpu, fpRam, formResolution, fpCanvasNoise, fpAudioNoise].forEach(el => {
  if (el) el.addEventListener('change', updateProfileSummary);
});
if (fpUserAgent) fpUserAgent.addEventListener('input', updateProfileSummary);
if (fpDeviceName) fpDeviceName.addEventListener('input', updateProfileSummary);
if (formProxy) formProxy.addEventListener('input', updateProfileSummary);
if (formProxySelect) formProxySelect.addEventListener('change', updateProfileSummary);

window.editProfile = async function(id) {
  fetchStatus().catch(err => console.warn('fetchStatus editProfile err:', err));
  const p = allProfiles.find(x => x.id === id);
  if (!p) return;

  setModalTab('basic');
  modalTitle.innerText = 'Chỉnh Sửa Hồ Sơ';
  formId.value = p.id;
  formName.value = p.name;
  formGroupId.value = p.group_id || '';
  if (formKernel) {
    formKernel.value = p.kernel_path;
    if (formKernel.selectedIndex < 0 && formKernel.options.length > 0) {
      formKernel.options[0].selected = true;
    }
  }

  // Cấu hình Proxy
  if (p.proxy_id) {
    setQuickProxyMode('hub');
    if (formProxySelect) formProxySelect.value = p.proxy_id;
    if (tabProxyHubSelect) tabProxyHubSelect.value = p.proxy_id;
    selectHubProxy(p.proxy_id);
  } else if (p.proxy_host) {
    setQuickProxyMode('custom');
    setCustomProxyFormValues({
      proto: p.proxy_type || 'http',
      host: p.proxy_host,
      port: p.proxy_port,
      user: p.proxy_user || '',
      pass: p.proxy_pass || '',
      rotation_url: p.proxy_rotation_api_url || ''
    });
  } else {
    setQuickProxyMode('none');
    resetCustomProxyForm();
  }

  if (formStartUrl) formStartUrl.value = p.start_url || '';
  if (formResolution) {
    formResolution.value = `${p.screen_width || 1920}x${p.screen_height || 1080}`;
  }
  setQuickWebRtc(p.webrtc_mode || 'fake_ip');
  if (formNotes) formNotes.value = p.notes || '';
  if (formCookieInput) formCookieInput.value = '';

  let fp = null;
  if (p.fingerprint) {
    try {
      fp = typeof p.fingerprint === 'string' ? JSON.parse(p.fingerprint) : p.fingerprint;
    } catch (e) {
      fp = null;
    }
  }

  if (fp) {
    setWorkstationOs(fp.os || 'windows', false);
    const ren = fp.webgl?.renderer || '';
    if (ren.includes('4070')) fpWebgl.value = 'rtx4070';
    else if (ren.includes('3060')) fpWebgl.value = 'rtx3060';
    else if (ren.includes('3080')) fpWebgl.value = 'rtx3080';
    else if (ren.includes('6700')) fpWebgl.value = 'rx6700';
    else if (ren.includes('Iris')) fpWebgl.value = 'iris_xe';
    else if (ren.includes('M2') || ren.includes('Apple')) fpWebgl.value = 'apple_m2';
    else fpWebgl.value = 'rtx4070';

    if (fpCpu) fpCpu.value = String(fp.hardwareConcurrency || p.cpu_cores || 8);
    if (fpRam) fpRam.value = String(fp.deviceMemory || p.ram_gb || 8);
    if (fpCanvasNoise) fpCanvasNoise.checked = fp.canvas?.mode !== 'real' && p.canvas_noise !== 0;
    if (fpAudioNoise) fpAudioNoise.checked = fp.audio?.mode !== 'real' && p.audio_noise !== 0;
    if (fpUserAgent) fpUserAgent.value = fp.userAgent || p.user_agent || '';
    if (uaPresetSelect) {
      uaPresetSelect.value = 'custom';
    }
    if (fpDeviceName) fpDeviceName.value = fp.deviceName || generateRandomDeviceName(fp.os || 'windows');
  } else {
    randomizeFingerprint('windows', true);
  }

  if (sumMac) sumMac.innerText = generateRandomMac();
  updateProfileSummary();
  if (typeof syncAllCustomSelects === 'function') syncAllCustomSelects();
  else if (typeof initAllCustomSelects === 'function') initAllCustomSelects();

  let activeExtIds = [];
  try {
    if (p.extension_ids) {
      activeExtIds = typeof p.extension_ids === 'string' ? JSON.parse(p.extension_ids) : p.extension_ids;
      if (!Array.isArray(activeExtIds)) activeExtIds = [];
    }
  } catch {
    activeExtIds = [];
  }
  renderProfileExtensionsChecklist(activeExtIds);

  modal.classList.add('open');
};

window.deleteProfile = async function(id) {
  const p = allProfiles.find(x => x.id === id);
  const name = p ? p.name : id;
  const ok = await showConfirmDialog({
    title: 'Xóa hồ sơ',
    message: `Bạn có chắc chắn muốn xóa hồ sơ <strong>"${escapeHtml(name)}"</strong> không?<br>Dữ liệu cookie và cấu hình sẽ bị xóa vĩnh viễn.`,
    type: 'danger',
    confirmText: 'Xóa hồ sơ'
  });
  if (!ok) return;

  try {
    const res = await fetch(`${API_BASE}/profiles/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Đã xóa hồ sơ', 'info');
      selectedProfileIds.delete(id);
      updateBatchToolbar();
      fetchProfiles();
      fetchLicense();
    }
  } catch (err) {
    showToast(`Lỗi xóa: ${err.message}`, 'danger');
  }
};

// Proxy Select Dropdown Change Event
if (formProxySelect) {
  formProxySelect.addEventListener('change', () => {
    if (formProxySelect.value === '__custom__') {
      formProxy.style.display = 'block';
      formProxy.focus();
    } else {
      formProxy.style.display = 'none';
    }
  });
}

// Modal handlers
btnCreateModal.addEventListener('click', () => {
  fetchStatus().catch(err => console.warn('fetchStatus err:', err));
  modal.classList.add('open');
  setModalTab('basic');
  modalTitle.innerText = 'Tạo Hồ Sơ Mới';
  formId.value = '';
  formName.value = '';
  formGroupId.value = '';
  setQuickProxyMode('none');
  resetCustomProxyForm();
  if (formStartUrl) formStartUrl.value = '';
  if (formResolution) formResolution.value = '1920x1080';
  setQuickWebRtc('fake_ip');
  if (formNotes) formNotes.value = '';
  if (formCookieInput) formCookieInput.value = '';
  if (fpDeviceName) fpDeviceName.value = generateRandomDeviceName('windows');
  if (sumMac) sumMac.innerText = generateRandomMac();
  setWorkstationOs('windows', false);
  if (uaPresetSelect) {
    uaPresetSelect.value = 'win11_chrome133';
  }
  if (fpUserAgent && typeof UA_PRESETS !== 'undefined' && UA_PRESETS.win11_chrome133) {
    fpUserAgent.value = UA_PRESETS.win11_chrome133.ua;
  }
  // Cấu hình dấu vân tay mặc định nhẹ nhất, tối ưu mượt mà (Item 6)
  if (fpCpu) fpCpu.value = '8';
  if (fpRam) fpRam.value = '8';
  if (fpWebgl) fpWebgl.value = 'rtx4070';
  if (fpCanvasNoise) fpCanvasNoise.checked = true;
  if (fpAudioNoise) fpAudioNoise.checked = true;

  renderProfileExtensionsChecklist([]);
  updateProfileSummary();
  if (typeof syncAllCustomSelects === 'function') syncAllCustomSelects();
  else if (typeof initAllCustomSelects === 'function') initAllCustomSelects();
});

function closeModal() {
  modal.classList.remove('open');
}
btnModalClose.addEventListener('click', closeModal);
btnModalCancel.addEventListener('click', closeModal);

btnModalSave.addEventListener('click', async () => {
  const name = formName.value.trim();
  if (!name) {
    await showCustomAlert({
      title: 'Thiếu thông tin',
      message: 'Vui lòng nhập <strong>Tên hồ sơ</strong> để tiếp tục.',
      type: 'warning'
    });
    formName.focus();
    return;
  }

  const [w, h] = formResolution.value.split('x').map(Number);
  const os = fpOs ? fpOs.value : 'windows';
  const webglItem = WEBGL_CONFIGS[fpWebgl.value] || WEBGL_CONFIGS.rtx4070;
  const cpu = parseInt(fpCpu.value, 10);
  const ram = parseInt(fpRam.value, 10);
  const canvasNoise = fpCanvasNoise.checked;
  const audioNoise = fpAudioNoise.checked;
  const userAgent = fpUserAgent.value.trim();

  const fpPayload = {
    os,
    platform: os === 'mac' ? 'MacIntel' : (os === 'linux' ? 'Linux x86_64' : 'Win32'),
    oscpu: os === 'mac' ? 'Intel Mac OS X 10_15_7' : (os === 'linux' ? 'Linux x86_64' : 'Windows NT 10.0; Win64; x64'),
    userAgent,
    chromeVersion: '130.0.6723.117',
    deviceName: fpDeviceName ? fpDeviceName.value.trim() : generateRandomDeviceName(os),
    macAddress: sumMac ? sumMac.innerText.trim() : generateRandomMac(),
    clientHints: {
      platform: os === 'mac' ? 'macOS' : (os === 'linux' ? 'Linux' : 'Windows'),
      platformVersion: os === 'mac' ? '14.5.0' : (os === 'linux' ? '6.5.0' : '15.0.0'),
      mobile: os === 'android',
      model: '',
    },
    screen: {
      width: w,
      height: h,
      colorDepth: 24,
      pixelDepth: 24,
      devicePixelRatio: 1,
    },
    hardwareConcurrency: cpu,
    deviceMemory: ram,
    webgl: {
      vendor: webglItem.unmaskedVendor,
      renderer: webglItem.unmaskedRenderer,
    },
    canvas: {
      mode: canvasNoise ? 'noise' : 'real',
      seed: Math.random() * 0.00005 + 0.00001,
    },
    audio: {
      mode: audioNoise ? 'noise' : 'real',
      seed: Math.random() * 0.0000001 + 0.00000001,
    },
  };

  let proxy_id = null;
  let proxy_url = null;
  const activeProxyCard = document.querySelector('.proxy-mode-card.active');
  const activeProxyPill = document.querySelector('#quick-proxy-pills .quick-pill-btn.active');
  const pMode = activeProxyCard ? activeProxyCard.dataset.mode : (activeProxyPill ? activeProxyPill.dataset.proxymode : 'none');

  if (pMode === 'custom' || formProxySelect.value === '__custom__') {
    syncCustomProxyToHiddenInput();
    proxy_url = formProxy.value.trim() || null;
  } else if (pMode === 'hub' && formProxySelect.value) {
    proxy_id = formProxySelect.value;
  }

  // Thu thập danh sách tiện ích được chọn riêng cho profile này
  const extension_ids = [];
  document.querySelectorAll('.profile-ext-cb:checked').forEach(cb => {
    extension_ids.push(cb.value);
  });

  const payload = {
    name,
    group_id: formGroupId.value || null,
    proxy_id,
    proxy_url,
    kernel_path: formKernel.value,
    start_url: formStartUrl.value.trim(),
    screen_width: w,
    screen_height: h,
    webrtc_mode: formWebrtc.value,
    notes: formNotes.value.trim(),
    fingerprint: fpPayload,
    user_agent: userAgent,
    cpu_cores: cpu,
    ram_gb: ram,
    canvas_noise: canvasNoise ? 1 : 0,
    audio_noise: audioNoise ? 1 : 0,
    extension_ids: extension_ids,
  };

  try {
    const id = formId.value;
    let savedProfileId = null;

    if (id) {
      // Update
      const res = await fetch(`${API_BASE}/profiles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      savedProfileId = id;
      showToast('Đã cập nhật hồ sơ và cấu hình vân tay thành công', 'success');
    } else {
      // Create
      const res = await fetch(`${API_BASE}/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) {
        if (data.limitExceeded) {
          switchTab('license');
        }
        throw new Error(data.error);
      }
      savedProfileId = data.profile ? data.profile.id : null;
      showToast('Đã tạo hồ sơ mới với bộ vân tay độc lập thành công', 'success');
    }

    // Tự động nạp cookie nếu người dùng dán vào ô "Nhập Cookie" kiểu PolyLogin
    const rawCookies = formCookieInput ? formCookieInput.value.trim() : '';
    if (rawCookies && savedProfileId) {
      let cookieList = [];
      if (rawCookies.startsWith('[') || rawCookies.startsWith('{')) {
        try {
          cookieList = JSON.parse(rawCookies);
          if (!Array.isArray(cookieList)) cookieList = [cookieList];
        } catch (e) {
          console.warn('Lỗi phân tích cú pháp Cookie JSON:', e);
        }
      } else {
        const lines = rawCookies.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const parts = line.split('\t');
          if (parts.length >= 7) {
            cookieList.push({
              domain: parts[0],
              path: parts[2],
              secure: parts[3].toUpperCase() === 'TRUE',
              expires: parseInt(parts[4], 10) || undefined,
              name: parts[5],
              value: parts[6]
            });
          }
        }
      }

      if (cookieList.length > 0) {
        try {
          showToast(`Đang đồng bộ ${cookieList.length} cookie vào hồ sơ qua CDP...`, 'info');
          const cRes = await fetch(`${API_BASE}/profiles/${savedProfileId}/cookies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cookies: cookieList })
          });
          const cData = await cRes.json();
          if (cData.success) {
            showToast(`🎉 Đã nạp thành công ${cData.count} cookie vào hồ sơ!`, 'success');
          }
        } catch (cErr) {
          console.error('Lỗi nạp cookie tự động:', cErr);
        }
      }
    }

    closeModal();
    fetchProfiles();
    fetchLicense();
    fetchProxies();
  } catch (err) {
    showToast(err.message, 'danger');
  }
});

btnRefresh.addEventListener('click', () => {
  fetchProfiles();
  fetchLicense();
  showToast('Đã làm mới dữ liệu', 'info');
});

btnBatchCloseAll.addEventListener('click', async () => {
  const running = allProfiles.filter(p => p.isRunning);
  if (!running.length) {
    showToast('Không có hồ sơ nào đang chạy', 'info');
    return;
  }
  const ok = await showConfirmDialog({
    title: 'Đóng tất cả hồ sơ',
    message: `Bạn có chắc muốn đóng toàn bộ <strong>${running.length} hồ sơ</strong> đang hoạt động không?`,
    type: 'warning',
    confirmText: 'Đóng tất cả'
  });
  if (!ok) return;

  showToast(`Đang đóng ${running.length} hồ sơ...`, 'info');
  for (const p of running) {
    await fetch(`${API_BASE}/profiles/${p.id}/stop`, { method: 'POST' });
  }
  fetchProfiles();
  showToast('Đã đóng tất cả hồ sơ', 'success');
});

// PolyLogin Batch Selection & Action Handlers
const thSelectAll = document.getElementById('th-select-all');
if (thSelectAll) {
  thSelectAll.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    const cbs = document.querySelectorAll('.profile-row-cb');
    cbs.forEach(cb => {
      cb.checked = isChecked;
      if (isChecked) {
        selectedProfileIds.add(cb.dataset.id);
      } else {
        selectedProfileIds.delete(cb.dataset.id);
      }
    });
    updateBatchToolbar();
  });
}

// Delegated change listener for row checkboxes
if (tbody) {
  tbody.addEventListener('change', (e) => {
    if (e.target.classList.contains('profile-row-cb')) {
      const id = e.target.dataset.id;
      if (e.target.checked) {
        selectedProfileIds.add(id);
      } else {
        selectedProfileIds.delete(id);
      }
      updateBatchToolbar();
    }
  });
}

// Batch Toolbar Buttons
const batchBtnStart = document.getElementById('batch-btn-start');
const batchBtnStop = document.getElementById('batch-btn-stop');
const batchBtnSync = document.getElementById('batch-btn-sync');
const batchBtnRandomize = document.getElementById('batch-btn-randomize');
const batchBtnDelete = document.getElementById('batch-btn-delete');

if (batchBtnStart) {
  batchBtnStart.addEventListener('click', async () => {
    if (selectedProfileIds.size === 0) {
      showToast('Vui lòng tích chọn ít nhất 1 hồ sơ để mở', 'warning');
      return;
    }
    showToast(`Đang mở ${selectedProfileIds.size} hồ sơ đã chọn...`, 'info');
    for (const id of selectedProfileIds) {
      await startProfile(id);
    }
  });
}

if (batchBtnStop) {
  batchBtnStop.addEventListener('click', async () => {
    if (selectedProfileIds.size === 0) {
      showToast('Vui lòng tích chọn ít nhất 1 hồ sơ để đóng', 'warning');
      return;
    }
    const count = selectedProfileIds.size;
    showToast(`Đang đóng ${count} hồ sơ đã chọn...`, 'info');
    const ids = Array.from(selectedProfileIds);
    await Promise.allSettled(ids.map(id => stopProfile(id)));
    await fetchProfiles();
    showToast(`Đã đóng xong ${count} hồ sơ`, 'success');
  });
}

if (batchBtnSync) {
  batchBtnSync.addEventListener('click', async () => {
    if (selectedProfileIds.size < 2) {
      await showCustomAlert({
        title: 'Cần ít nhất 2 hồ sơ',
        message: 'Để đồng bộ hóa thao tác chuột & phím, bạn vui lòng chọn ít nhất <strong>2 hồ sơ</strong> trở lên.',
        type: 'info'
      });
      return;
    }
    const syncNav = document.querySelector('.nav-item[data-tab="sync"]');
    if (syncNav) syncNav.click();

    showToast(`Đang chuẩn bị phiên đồng bộ cho ${selectedProfileIds.size} hồ sơ...`, 'info');
    for (const id of selectedProfileIds) {
      const p = allProfiles.find(x => x.id === id);
      if (p && !p.isRunning) {
        await startProfile(id);
      }
    }
  });
}

if (batchBtnRandomize) {
  batchBtnRandomize.addEventListener('click', async () => {
    if (selectedProfileIds.size === 0) {
      showToast('Vui lòng chọn ít nhất 1 hồ sơ để đổi vân tay', 'warning');
      return;
    }
    const ok = await showConfirmDialog({
      title: 'Đổi vân tay hàng loạt',
      message: `Bạn có chắc muốn cấp <strong>vân tay phần cứng mới</strong> (Canvas, Audio, WebGL, WebRTC, User-Agent) cho <strong>${selectedProfileIds.size} hồ sơ</strong> đã chọn?`,
      type: 'warning',
      confirmText: 'Đổi vân tay ngay'
    });
    if (!ok) return;

    showToast(`Đang tạo vân tay mới cho ${selectedProfileIds.size} hồ sơ...`, 'info');
    const webglKeys = Object.keys(WEBGL_CONFIGS);
    const ramList = [8, 16, 32];
    const cpuList = [8, 12, 16];

    for (const id of selectedProfileIds) {
      const chosenGpu = WEBGL_CONFIGS[webglKeys[Math.floor(Math.random() * webglKeys.length)]];
      const chosenRam = ramList[Math.floor(Math.random() * ramList.length)];
      const chosenCpu = cpuList[Math.floor(Math.random() * cpuList.length)];
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

      const fpPayload = {
        os: 'windows',
        platform: 'Win32',
        userAgent: ua,
        chromeVersion: '130.0.6723.117',
        hardwareConcurrency: chosenCpu,
        deviceMemory: chosenRam,
        webgl: chosenGpu,
        canvasNoise: true,
        audioNoise: true,
        webrtc: 'fake_ip',
      };

      await fetch(`${API_BASE}/profiles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpu_cores: chosenCpu,
          ram_gb: chosenRam,
          fingerprint: fpPayload
        })
      });
    }
    showToast('Đã đổi vân tay ngẫu nhiên thành công!', 'success');
    fetchProfiles();
  });
}

if (batchBtnDelete) {
  batchBtnDelete.addEventListener('click', async () => {
    if (selectedProfileIds.size === 0) {
      showToast('Vui lòng chọn ít nhất 1 hồ sơ để xóa', 'warning');
      return;
    }
    const ok = await showConfirmDialog({
      title: 'Xóa hồ sơ hàng loạt',
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn <strong>${selectedProfileIds.size} hồ sơ</strong> đã chọn không?<br>Toàn bộ cookie, lịch sử và cache duyệt web sẽ bị xóa hoàn toàn.`,
      type: 'danger',
      confirmText: `Xóa ${selectedProfileIds.size} hồ sơ`
    });
    if (!ok) return;

    showToast(`Đang xóa ${selectedProfileIds.size} hồ sơ...`, 'info');
    for (const id of Array.from(selectedProfileIds)) {
      await fetch(`${API_BASE}/profiles/${id}`, { method: 'DELETE' });
      selectedProfileIds.delete(id);
    }
    updateBatchToolbar();
    fetchProfiles();
    fetchLicense();
    showToast('Đã xóa các hồ sơ đã chọn', 'success');
  });
}

// -------------------------------------------------------------
// PolyLogin Feature: Batch Proxy Update
// -------------------------------------------------------------
const batchBtnProxy = document.getElementById('batch-btn-proxy');
const batchProxyModal = document.getElementById('batch-proxy-modal');
const batchProxyModalClose = document.getElementById('batch-proxy-modal-close');
const batchProxyModalCancel = document.getElementById('batch-proxy-modal-cancel');
const batchProxyModalSave = document.getElementById('batch-proxy-modal-save');
const batchProxyModalCount = document.getElementById('batch-proxy-modal-count');
const batchProxySelectHub = document.getElementById('batch-proxy-select-hub');
const batchProxyListInput = document.getElementById('batch-proxy-list-input');
let currentBatchProxyMode = 'single';

if (batchBtnProxy) {
  batchBtnProxy.addEventListener('click', async () => {
    if (selectedProfileIds.size === 0) {
      showToast('Vui lòng chọn ít nhất 1 hồ sơ để cập nhật proxy', 'warning');
      return;
    }
    batchProxyModalCount.innerText = selectedProfileIds.size;

    // Populate Hub Proxies
    if (batchProxySelectHub) {
      if (allProxies.length === 0) {
        batchProxySelectHub.innerHTML = '<option value="">(Kho Proxy đang trống - hãy chọn Tuần Tự hoặc thêm Proxy vào kho)</option>';
      } else {
        batchProxySelectHub.innerHTML = allProxies.map(p => {
          const flag = p.country ? `[${p.country}] ` : '';
          return `<option value="${p.id}">${flag}${escapeHtml(p.name)} (${p.type.toUpperCase()} • ${p.host}:${p.port})</option>`;
        }).join('');
      }
    }

    setBatchProxyMode('single');
    batchProxyModal.classList.add('open');
    batchProxyModal.style.display = 'flex';
  });
}

function setBatchProxyMode(mode) {
  currentBatchProxyMode = mode;
  document.querySelectorAll('.batch-proxy-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  const secSingle = document.getElementById('batch-proxy-sec-single');
  const secSeq = document.getElementById('batch-proxy-sec-sequential');
  const secDirect = document.getElementById('batch-proxy-sec-direct');

  if (secSingle) secSingle.style.display = mode === 'single' ? 'block' : 'none';
  if (secSeq) secSeq.style.display = mode === 'sequential' ? 'block' : 'none';
  if (secDirect) secDirect.style.display = mode === 'direct' ? 'block' : 'none';
}

document.querySelectorAll('.batch-proxy-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => setBatchProxyMode(btn.dataset.mode));
});

function closeBatchProxyModal() {
  if (batchProxyModal) {
    batchProxyModal.classList.remove('open');
    batchProxyModal.style.display = 'none';
  }
}

if (batchProxyModalClose) batchProxyModalClose.addEventListener('click', closeBatchProxyModal);
if (batchProxyModalCancel) batchProxyModalCancel.addEventListener('click', closeBatchProxyModal);

if (batchProxyModalSave) {
  batchProxyModalSave.addEventListener('click', async () => {
    const profileIds = Array.from(selectedProfileIds);
    let payload = { profileIds, mode: currentBatchProxyMode };

    if (currentBatchProxyMode === 'single') {
      const pid = batchProxySelectHub ? batchProxySelectHub.value : '';
      if (!pid) {
        showToast('Vui lòng chọn một proxy trong kho', 'warning');
        return;
      }
      payload.proxyId = pid;
    } else if (currentBatchProxyMode === 'sequential') {
      const txt = batchProxyListInput.value.trim();
      const list = txt.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      if (list.length === 0) {
        showToast('Vui lòng nhập danh sách proxy (mỗi dòng 1 proxy)', 'warning');
        return;
      }
      payload.proxyList = list;
    }

    try {
      showToast(`Đang cập nhật proxy cho ${profileIds.length} hồ sơ...`, 'info');
      let successCount = 0;

      // 1. Cố gắng gọi endpoint gộp tốc độ cao
      let batchSuccess = false;
      try {
        const res = await fetch(`${API_BASE}/profiles/batch-proxy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            batchSuccess = true;
            successCount = data.count || profileIds.length;
          }
        }
      } catch (e) {
        batchSuccess = false;
      }

      // 2. Cơ chế Fallback tự động (nếu Electron đang chạy backend chưa khởi động lại)
      if (!batchSuccess) {
        if (currentBatchProxyMode === 'direct') {
          for (const pid of profileIds) {
            await fetch(`${API_BASE}/profiles/${pid}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ proxy_id: null })
            });
            successCount++;
          }
        } else if (currentBatchProxyMode === 'single') {
          for (const pid of profileIds) {
            await fetch(`${API_BASE}/profiles/${pid}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ proxy_id: payload.proxyId })
            });
            successCount++;
          }
        } else if (currentBatchProxyMode === 'sequential') {
          // Import danh sách proxy vào kho trước
          const impRes = await fetch(`${API_BASE}/proxies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bulk_text: payload.proxyList.join('\n') })
          });
          const impData = await impRes.json();
          const createdProxies = impData.proxies || [];
          if (createdProxies.length > 0) {
            for (let i = 0; i < profileIds.length; i++) {
              const pItem = createdProxies[i % createdProxies.length];
              await fetch(`${API_BASE}/profiles/${profileIds[i]}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ proxy_id: pItem.id })
              });
              successCount++;
            }
          } else {
            throw new Error('Không thể phân tích định dạng proxy');
          }
        }
      }

      showToast(`Đã gán proxy thành công cho ${successCount} hồ sơ!`, 'success');
      closeBatchProxyModal();
      fetchProfiles();
      fetchProxies();
    } catch (err) {
      showToast(`Lỗi gán proxy: ${err.message}`, 'danger');
    }
  });
}

// -------------------------------------------------------------
// PolyLogin Feature: Automation Modal & Scripts
// -------------------------------------------------------------
const batchBtnAuto = document.getElementById('batch-btn-auto');
const automationModal = document.getElementById('automation-modal');
const automationModalClose = document.getElementById('automation-modal-close');
const automationModalCancel = document.getElementById('automation-modal-cancel');
const automationModalCount = document.getElementById('automation-modal-count');

const btnRunWarmup = document.getElementById('btn-run-warmup');
const btnRunIphey = document.getElementById('btn-run-iphey');
const btnRunFb = document.getElementById('btn-run-fb');

if (batchBtnAuto) {
  batchBtnAuto.addEventListener('click', () => {
    if (selectedProfileIds.size === 0) {
      showToast('Vui lòng chọn ít nhất 1 hồ sơ để chạy kịch bản', 'warning');
      return;
    }
    automationModalCount.innerText = selectedProfileIds.size;
    automationModal.classList.add('open');
    automationModal.style.display = 'flex';
  });
}

function closeAutomationModal() {
  if (automationModal) {
    automationModal.classList.remove('open');
    automationModal.style.display = 'none';
  }
}

if (automationModalClose) automationModalClose.addEventListener('click', closeAutomationModal);
if (automationModalCancel) automationModalCancel.addEventListener('click', closeAutomationModal);

if (btnRunWarmup) {
  btnRunWarmup.addEventListener('click', async () => {
    const ids = Array.from(selectedProfileIds);
    closeAutomationModal();
    showToast(`Bắt đầu làm ấm ${ids.length} hồ sơ (Warm-up lướt báo)...`, 'info');

    for (let i = 0; i < ids.length; i++) {
      const pid = ids[i];
      showToast(`[${i + 1}/${ids.length}] Đang làm ấm profile ${pid.slice(0, 8)}...`, 'info');
      try {
        const res = await fetch(`${API_BASE}/automation/warmup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId: pid })
        });
        if (!res.ok) throw new Error('Route not found');
      } catch (e) {
        // Fallback nếu app chưa restart backend: khởi chạy profile với trang tin tức
        await fetch(`${API_BASE}/profiles/${pid}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'https://news.google.com' })
        });
      }
    }
    showToast('Hoàn thành toàn bộ kịch bản làm ấm hồ sơ!', 'success');
    fetchProfiles();
  });
}

if (btnRunIphey) {
  btnRunIphey.addEventListener('click', async () => {
    const ids = Array.from(selectedProfileIds);
    closeAutomationModal();
    showToast(`Mở kiểm tra Iphey cho ${ids.length} hồ sơ...`, 'info');
    for (const pid of ids) {
      try {
        const res = await fetch(`${API_BASE}/automation/iphey`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId: pid })
        });
        if (!res.ok) throw new Error('Route not found');
      } catch (e) {
        // Fallback nếu app chưa restart backend: khởi chạy profile với iphey.com
        await fetch(`${API_BASE}/profiles/${pid}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'https://iphey.com' })
        });
      }
    }
    fetchProfiles();
  });
}

if (btnRunFb) {
  btnRunFb.addEventListener('click', async () => {
    const ids = Array.from(selectedProfileIds);
    closeAutomationModal();
    const targetPid = ids[0];
    showToast(`Đang khởi động Facebook Playwright liên kết Profile ${targetPid.slice(0, 8)}...`, 'info');
    try {
      const res = await fetch(`${API_BASE}/automation/facebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: targetPid })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
      } else {
        showToast(`Lỗi: ${data.error}`, 'danger');
      }
    } catch (err) {
      showToast(`Lỗi kích hoạt Facebook Automation: ${err.message}`, 'danger');
    }
  });
}

// -------------------------------------------------------------
// PolyLogin Feature: Cookie Manager Modal (Export & Import)
// -------------------------------------------------------------
const cookieModal = document.getElementById('cookie-manager-modal');
const cookieModalClose = document.getElementById('cookie-modal-close');
const cookieModalCancel = document.getElementById('cookie-modal-cancel');
const cookieModalProfileName = document.getElementById('cookie-modal-profile-name');
const cookieModalProfileId = document.getElementById('cookie-modal-profile-id');
const cookieExportTextarea = document.getElementById('cookie-export-textarea');
const cookieImportTextarea = document.getElementById('cookie-import-textarea');
const btnCopyCookie = document.getElementById('btn-copy-cookie');
const btnRefreshCookie = document.getElementById('btn-refresh-cookie');
const cookieModalSubmitImport = document.getElementById('cookie-modal-submit-import');

function closeCookieModal() {
  if (cookieModal) {
    cookieModal.classList.remove('open');
    cookieModal.style.display = 'none';
  }
}

let currentCookieCache = { json: '', netscape: '', profileName: '' };
let currentCookieFormat = 'json'; // 'json' | 'netscape'

const cookieFormatJson = document.getElementById('cookie-format-json');
const cookieFormatNetscape = document.getElementById('cookie-format-netscape');
const btnDownloadCookie = document.getElementById('btn-download-cookie');

function updateCookieExportDisplay() {
  if (cookieFormatJson && cookieFormatNetscape) {
    cookieFormatJson.classList.toggle('active', currentCookieFormat === 'json');
    cookieFormatNetscape.classList.toggle('active', currentCookieFormat === 'netscape');
    cookieFormatJson.style.background = '';
    cookieFormatJson.style.color = '';
    cookieFormatNetscape.style.background = '';
    cookieFormatNetscape.style.color = '';
  }
  if (currentCookieFormat === 'json') {
    cookieExportTextarea.value = currentCookieCache.json || '';
  } else {
    cookieExportTextarea.value = currentCookieCache.netscape || '';
  }
}

if (cookieFormatJson) {
  cookieFormatJson.addEventListener('click', () => {
    currentCookieFormat = 'json';
    updateCookieExportDisplay();
  });
}

if (cookieFormatNetscape) {
  cookieFormatNetscape.addEventListener('click', () => {
    currentCookieFormat = 'netscape';
    updateCookieExportDisplay();
  });
}

if (btnDownloadCookie) {
  btnDownloadCookie.addEventListener('click', () => {
    const content = cookieExportTextarea.value;
    if (!content || content.startsWith('//')) {
      showToast('Không có dữ liệu cookie để tải về', 'warning');
      return;
    }
    const ext = currentCookieFormat === 'json' ? 'json' : 'txt';
    const filename = `cookies_${currentCookieCache.profileName || 'profile'}.${ext}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Đã tải xuống file ${filename}!`, 'success');
  });
}

window.openCookieModal = async function(profileId) {
  const p = allProfiles.find(x => x.id === profileId);
  cookieModalProfileId.value = profileId;
  currentCookieCache.profileName = (p ? p.name : profileId.slice(0, 8)).replace(/[^a-zA-Z0-9_-]/g, '_');
  cookieModalProfileName.innerText = p ? p.name : profileId.slice(0, 8);
  setCookieTab('export');
  currentCookieFormat = 'json';
  cookieExportTextarea.value = 'Đang trích xuất cookie từ trình duyệt qua giao thức CDP...';
  cookieModal.classList.add('open');
  cookieModal.style.display = 'flex';
  await loadProfileCookies(profileId);
};

async function loadProfileCookies(profileId) {
  try {
    const res = await fetch(`${API_BASE}/profiles/${profileId}/cookies`);
    const data = await res.json();
    if (data.success) {
      currentCookieCache.json = JSON.stringify(data.cookies, null, 2);
      currentCookieCache.netscape = data.netscape || '';
      updateCookieExportDisplay();
      showToast(`Đã xuất thành công ${data.count} cookies!`, 'success');
    } else {
      currentCookieCache.json = `// Không trích xuất được cookie: ${data.error || 'Trình duyệt chưa sẵn sàng'}`;
      currentCookieCache.netscape = currentCookieCache.json;
      cookieExportTextarea.value = currentCookieCache.json;
    }
  } catch (err) {
    currentCookieCache.json = `// Lỗi kết nối: ${err.message}`;
    currentCookieCache.netscape = currentCookieCache.json;
    cookieExportTextarea.value = currentCookieCache.json;
  }
}

function setCookieTab(tab) {
  document.querySelectorAll('.cookie-tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  const secExport = document.getElementById('cookie-sec-export');
  const secImport = document.getElementById('cookie-sec-import');
  if (secExport) secExport.style.display = tab === 'export' ? 'block' : 'none';
  if (secImport) secImport.style.display = tab === 'import' ? 'block' : 'none';
  if (cookieModalSubmitImport) {
    cookieModalSubmitImport.style.display = tab === 'import' ? 'inline-flex' : 'none';
  }
}

document.querySelectorAll('.cookie-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => setCookieTab(btn.dataset.tab));
});

if (cookieModalClose) cookieModalClose.addEventListener('click', closeCookieModal);
if (cookieModalCancel) cookieModalCancel.addEventListener('click', closeCookieModal);

if (btnCopyCookie) {
  btnCopyCookie.addEventListener('click', async () => {
    const val = cookieExportTextarea.value;
    if (!val || val.startsWith('//')) {
      showToast('Không có dữ liệu cookie để sao chép', 'warning');
      return;
    }
    await safeCopyToClipboard(val);
    showToast(`Đã sao chép cookie dạng ${currentCookieFormat.toUpperCase()} vào clipboard!`, 'success');
  });
}

if (btnRefreshCookie) {
  btnRefreshCookie.addEventListener('click', () => {
    const pid = cookieModalProfileId.value;
    if (pid) loadProfileCookies(pid);
  });
}

if (cookieModalSubmitImport) {
  cookieModalSubmitImport.addEventListener('click', async () => {
    const pid = cookieModalProfileId.value;
    const txt = cookieImportTextarea.value.trim();
    if (!txt) {
      showToast('Vui lòng dán chuỗi JSON hoặc Netscape Cookie để nhập', 'warning');
      return;
    }
    let cookiesList = [];
    if (txt.startsWith('[') || txt.startsWith('{')) {
      try {
        cookiesList = JSON.parse(txt);
        if (!Array.isArray(cookiesList)) cookiesList = [cookiesList];
      } catch (e) {
        showToast(`JSON Cookie không đúng cú pháp: ${e.message}`, 'danger');
        return;
      }
    } else {
      // Netscape format parsing
      const lines = txt.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const parts = line.split('\t');
        if (parts.length >= 7) {
          cookiesList.push({
            domain: parts[0],
            path: parts[2],
            secure: parts[3].toUpperCase() === 'TRUE',
            expires: parseInt(parts[4], 10) || undefined,
            name: parts[5],
            value: parts[6]
          });
        }
      }
      if (cookiesList.length === 0) {
        showToast('Không tìm thấy cookie hợp lệ theo định dạng JSON hoặc Netscape', 'danger');
        return;
      }
    }

    try {
      showToast('Đang nạp cookie vào trình duyệt qua CDP...', 'info');
      const res = await fetch(`${API_BASE}/profiles/${pid}/cookies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookies: cookiesList })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      showToast(`🎉 Đã nhập thành công ${data.count} cookies vào profile!`, 'success');
      cookieModal.style.display = 'none';
    } catch (err) {
      showToast(`Lỗi nhập cookie: ${err.message}`, 'danger');
    }
  });
}

searchInput.addEventListener('input', renderProfiles);
if (filterGroupSelect) {
  filterGroupSelect.addEventListener('change', renderProfiles);
}

// Global Ctrl+K shortcut to focus profile search
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }
});

// -------------------------------------------------------------
// Group Modal Handlers (Bước 3)
// -------------------------------------------------------------
function closeGroupModal() {
  if (groupModal) groupModal.classList.remove('open');
}

if (btnCreateGroup) {
  btnCreateGroup.addEventListener('click', () => {
    groupModalTitle.innerText = 'Tạo Nhóm Mới';
    groupFormId.value = '';
    groupFormName.value = '';
    groupFormColor.value = '#3867F4';
    groupFormNotes.value = '';
    groupModal.classList.add('open');
  });
}

if (groupModalCloseBtn) groupModalCloseBtn.addEventListener('click', closeGroupModal);
if (groupModalCancelBtn) groupModalCancelBtn.addEventListener('click', closeGroupModal);

document.querySelectorAll('#group-color-presets .color-dot').forEach(dot => {
  dot.addEventListener('click', () => {
    groupFormColor.value = dot.dataset.color;
  });
});

if (groupModalSaveBtn) {
  groupModalSaveBtn.addEventListener('click', async () => {
    const name = groupFormName.value.trim();
    if (!name) {
      await showCustomAlert({
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập <strong>Tên nhóm</strong> hồ sơ.',
        type: 'warning'
      });
      groupFormName.focus();
      return;
    }
    const id = groupFormId.value;
    const payload = {
      name,
      color: groupFormColor.value,
      notes: groupFormNotes.value.trim(),
    };

    try {
      const res = await fetch(`${API_BASE}/groups${id ? '/' + id : ''}`, {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast(id ? 'Đã cập nhật nhóm thành công' : 'Đã tạo nhóm mới thành công', 'success');
      closeGroupModal();
      await fetchGroups();
      fetchProfiles();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });
}

window.editGroup = function(id) {
  const g = allGroups.find(x => x.id === id);
  if (!g) return;
  groupModalTitle.innerText = 'Chỉnh Sửa Nhóm';
  groupFormId.value = g.id;
  groupFormName.value = g.name;
  groupFormColor.value = g.color || '#3867F4';
  groupFormNotes.value = g.notes || '';
  groupModal.classList.add('open');
};

window.deleteGroup = async function(id) {
  if (id === 'default') {
    await showCustomAlert({
      title: 'Không thể xóa',
      message: 'Không thể xóa nhóm mặc định của hệ thống.',
      type: 'warning'
    });
    return;
  }
  const g = allGroups.find(x => x.id === id);
  const ok = await showConfirmDialog({
    title: 'Xóa nhóm hồ sơ',
    message: `Bạn có chắc chắn muốn xóa nhóm <strong>"${escapeHtml(g ? g.name : id)}"</strong> không?<br>Các hồ sơ trong nhóm này sẽ được chuyển về không nhóm.`,
    type: 'danger',
    confirmText: 'Xóa nhóm'
  });
  if (!ok) return;
  try {
    const res = await fetch(`${API_BASE}/groups/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Đã xóa nhóm', 'info');
      await fetchGroups();
      fetchProfiles();
    } else {
      showToast(data.error, 'danger');
    }
  } catch (err) {
    showToast(`Lỗi xóa nhóm: ${err.message}`, 'danger');
  }
};

// -------------------------------------------------------------
// Proxy Modal Handlers (Bước 3)
// -------------------------------------------------------------
function setProxyModalTab(tab) {
  if (tab === 'bulk') {
    proxyTabSingle.classList.remove('active');
    proxyTabBulk.classList.add('active');
    proxyContentSingle.style.display = 'none';
    proxyContentBulk.style.display = 'block';
  } else {
    proxyTabSingle.classList.add('active');
    proxyTabBulk.classList.remove('active');
    proxyContentSingle.style.display = 'block';
    proxyContentBulk.style.display = 'none';
  }
}

if (proxyTabSingle) proxyTabSingle.addEventListener('click', () => setProxyModalTab('single'));
if (proxyTabBulk) proxyTabBulk.addEventListener('click', () => setProxyModalTab('bulk'));

function closeProxyModal() {
  if (proxyModal) proxyModal.classList.remove('open');
}
if (proxyModalCloseBtn) proxyModalCloseBtn.addEventListener('click', closeProxyModal);
if (proxyModalCancelBtn) proxyModalCancelBtn.addEventListener('click', closeProxyModal);

// Điều khiển nút chọn giao thức (Protocol Pills) trong Proxy Modal
document.querySelectorAll('#proxy-modal-proto-group .proto-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#proxy-modal-proto-group .proto-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (proxyFormType) proxyFormType.value = btn.dataset.proto;
  });
});

// Nút ẩn/hiện mật khẩu trong Proxy Modal
const btnToggleModalProxyPwd = document.getElementById('btn-toggle-modal-proxy-pwd');
if (btnToggleModalProxyPwd && proxyFormPass) {
  btnToggleModalProxyPwd.addEventListener('click', () => {
    proxyFormPass.type = proxyFormPass.type === 'password' ? 'text' : 'password';
  });
}

// Bóc tách nhanh chuỗi Proxy trong Proxy Modal
const btnQuickParseProxyModal = document.getElementById('btn-quick-parse-proxy-modal');
const proxyModalQuickPaste = document.getElementById('proxy-modal-quick-paste');

function handleProxyModalQuickParse() {
  const val = proxyModalQuickPaste?.value.trim();
  if (!val) return;
  const parsed = parseProxyStringToFields(val);
  if (parsed) {
    if (proxyFormHost) proxyFormHost.value = parsed.host;
    if (proxyFormPort) proxyFormPort.value = parsed.port;
    if (proxyFormUser) proxyFormUser.value = parsed.user;
    if (proxyFormPass) proxyFormPass.value = parsed.pass;
    if (parsed.proto && proxyFormType) {
      proxyFormType.value = parsed.proto;
      document.querySelectorAll('#proxy-modal-proto-group .proto-pill').forEach(b => {
        b.classList.toggle('active', b.dataset.proto === parsed.proto);
      });
    }
    if (proxyFormName && !proxyFormName.value) {
      proxyFormName.value = `Proxy ${parsed.host}:${parsed.port}`;
    }
    showToast(`✨ Đã nhận diện: ${parsed.host}:${parsed.port} (${parsed.proto.toUpperCase()})`, 'success');
  } else {
    showToast('Không nhận diện được proxy. Vui lòng nhập: host:port:user:pass', 'warning');
  }
}

if (btnQuickParseProxyModal) btnQuickParseProxyModal.addEventListener('click', handleProxyModalQuickParse);
if (proxyModalQuickPaste) {
  proxyModalQuickPaste.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleProxyModalQuickParse();
    }
  });
  proxyModalQuickPaste.addEventListener('input', () => {
    const v = proxyModalQuickPaste.value.trim();
    if (v.includes(':') && (v.split(':').length >= 2 || v.includes('://'))) {
      handleProxyModalQuickParse();
    }
  });
}

// Kiểm tra kết nối trực tiếp (Live Test) trong Proxy Modal
const btnTestModalProxy = document.getElementById('btn-test-modal-proxy');
const modalProxyTestResult = document.getElementById('modal-proxy-test-result');
if (btnTestModalProxy) {
  btnTestModalProxy.addEventListener('click', async () => {
    const host = proxyFormHost?.value.trim();
    const port = parseInt(proxyFormPort?.value.trim(), 10);
    if (!host || !port) {
      await showCustomAlert({
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập <strong>Host / IP</strong> và <strong>Cổng (Port)</strong> để kiểm tra kết nối.',
        type: 'warning'
      });
      return;
    }
    const btnText = document.getElementById('btn-test-modal-proxy-text');
    const originalText = btnText ? btnText.innerText : 'Kiểm Tra Kết Nối Proxy (Test IP Ngay)';
    if (btnText) btnText.innerHTML = '<span class="spinner-sm"></span> Đang kiểm tra kết nối...';
    btnTestModalProxy.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/proxies/test-custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: proxyFormType?.value || 'http',
          host,
          port,
          username: proxyFormUser?.value.trim() || undefined,
          password: proxyFormPass?.value.trim() || undefined
        })
      });
      const data = await res.json();
      if (modalProxyTestResult) {
        modalProxyTestResult.style.display = 'block';
        if (data.success && data.status === 'live') {
          modalProxyTestResult.className = 'proxy-test-result-box success';
          modalProxyTestResult.innerHTML = `
            <div class="result-headline">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span>KẾT NỐI THÀNH CÔNG (LIVE)</span>
            </div>
            <div class="result-details">
              IP Ngoại vi: <strong>${data.ip}</strong> &bull; Quốc gia: <strong>${data.country || 'Unknown'}</strong> &bull; Ping: <strong>${data.ping}ms</strong>
            </div>
          `;
          showToast(`✅ LIVE! IP: ${data.ip} (${data.country}) - ${data.ping}ms`, 'success');
        } else {
          modalProxyTestResult.className = 'proxy-test-result-box error';
          modalProxyTestResult.innerHTML = `
            <div class="result-headline">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <span>KẾT NỐI THẤT BÀI (DIE)</span>
            </div>
            <div class="result-details">
              Lỗi: ${escapeHtml(data.error || 'Proxy không phản hồi hoặc sai thông tin xác thực')}
            </div>
          `;
          showToast(`❌ Proxy không hoạt động: ${data.error || 'Timeout'}`, 'danger');
        }
      }
    } catch (err) {
      if (modalProxyTestResult) {
        modalProxyTestResult.style.display = 'block';
        modalProxyTestResult.className = 'proxy-test-result-box error';
        modalProxyTestResult.innerHTML = `<div class="result-headline"><span>LỖI KẾT NỐI HỆ THỐNG</span></div><div class="result-details">${escapeHtml(err.message)}</div>`;
      }
    } finally {
      btnTestModalProxy.disabled = false;
      if (btnText) btnText.innerText = originalText;
    }
  });
}

// Đếm số dòng tự động ở tab Nhập Hàng Loạt
const proxyBulkDetectedCount = document.getElementById('proxy-bulk-detected-count');
if (proxyFormBulk && proxyBulkDetectedCount) {
  proxyFormBulk.addEventListener('input', () => {
    const lines = proxyFormBulk.value.split('\n').filter(l => l.trim().length > 0);
    proxyBulkDetectedCount.innerText = `${lines.length} proxy`;
  });
}

if (btnAddProxy) {
  btnAddProxy.addEventListener('click', () => {
    setProxyModalTab('single');
    proxyModalTitle.innerText = 'Thêm Proxy Mới';
    proxyFormId.value = '';
    proxyFormName.value = '';
    proxyFormType.value = 'http';
    proxyFormHost.value = '';
    proxyFormPort.value = '';
    proxyFormUser.value = '';
    proxyFormPass.value = '';
    if (proxyFormPass) proxyFormPass.type = 'password';
    const rotInput = document.getElementById('proxy-form-rotation-url');
    if (rotInput) rotInput.value = '';
    proxyFormBulk.value = '';
    if (proxyModalQuickPaste) proxyModalQuickPaste.value = '';
    if (modalProxyTestResult) { modalProxyTestResult.style.display = 'none'; modalProxyTestResult.innerHTML = ''; }
    if (proxyBulkDetectedCount) proxyBulkDetectedCount.innerText = '0 proxy';
    document.querySelectorAll('#proxy-modal-proto-group .proto-pill').forEach(b => {
      b.classList.toggle('active', b.dataset.proto === 'http');
    });
    proxyModal.classList.add('open');
  });
}

if (proxyModalSaveBtn) {
  proxyModalSaveBtn.addEventListener('click', async () => {
    const isBulk = proxyTabBulk && proxyTabBulk.classList.contains('active');
    if (isBulk) {
      const bulkText = proxyFormBulk.value.trim();
      if (!bulkText) {
        await showCustomAlert({
          title: 'Dữ liệu trống',
          message: 'Vui lòng dán danh sách Proxy (mỗi dòng 1 Proxy) để nhập hàng loạt.',
          type: 'warning'
        });
        return;
      }
      try {
        showToast('Đang thêm hàng loạt Proxy...', 'info');
        const res = await fetch(`${API_BASE}/proxies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bulk_text: bulkText }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        showToast(`Đã import thành công ${data.count} Proxy vào kho!`, 'success');
        closeProxyModal();
        await fetchProxies();
        fetchProfiles();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    } else {
      const host = proxyFormHost.value.trim();
      const port = parseInt(proxyFormPort.value.trim(), 10);
      if (!host || !port) {
        await showCustomAlert({
          title: 'Thiếu thông tin',
          message: 'Vui lòng nhập đầy đủ <strong>Host / IP</strong> và <strong>Cổng (Port)</strong> của Proxy.',
          type: 'warning'
        });
        return;
      }
      const id = proxyFormId.value;
      const rotInput = document.getElementById('proxy-form-rotation-url');
      const payload = {
        name: proxyFormName.value.trim() || undefined,
        type: proxyFormType.value,
        host,
        port,
        username: proxyFormUser.value.trim() || undefined,
        password: proxyFormPass.value.trim() || undefined,
        rotation_api_url: rotInput ? rotInput.value.trim() : '',
      };
      try {
        const res = await fetch(`${API_BASE}/proxies${id ? '/' + id : ''}`, {
          method: id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        showToast(id ? 'Đã cập nhật Proxy thành công' : 'Đã thêm Proxy thành công', 'success');
        closeProxyModal();
        await fetchProxies();
        fetchProfiles();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    }
  });
}

window.editProxy = function(id) {
  const p = allProxies.find(x => x.id === id);
  if (!p) return;
  setProxyModalTab('single');
  proxyModalTitle.innerText = 'Chỉnh Sửa Proxy';
  proxyFormId.value = p.id;
  proxyFormName.value = p.name || '';
  proxyFormType.value = p.type || 'http';
  proxyFormHost.value = p.host || '';
  proxyFormPort.value = p.port || '';
  proxyFormUser.value = p.username || '';
  proxyFormPass.value = p.password || '';
  if (proxyFormPass) proxyFormPass.type = 'password';
  const rotInput = document.getElementById('proxy-form-rotation-url');
  if (rotInput) rotInput.value = p.rotation_api_url || '';
  if (proxyModalQuickPaste) proxyModalQuickPaste.value = '';
  if (modalProxyTestResult) { modalProxyTestResult.style.display = 'none'; modalProxyTestResult.innerHTML = ''; }
  document.querySelectorAll('#proxy-modal-proto-group .proto-pill').forEach(b => {
    b.classList.toggle('active', b.dataset.proto === (p.type || 'http'));
  });
  proxyModal.classList.add('open');
};

window.deleteProxy = async function(id) {
  const p = allProxies.find(x => x.id === id);
  const ok = await showConfirmDialog({
    title: 'Xóa Proxy',
    message: `Bạn có chắc chắn muốn xóa Proxy <strong>${p ? escapeHtml(p.host + ':' + p.port) : id}</strong> khỏi hệ thống?`,
    type: 'danger',
    confirmText: 'Xóa Proxy'
  });
  if (!ok) return;
  try {
    const res = await fetch(`${API_BASE}/proxies/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Đã xóa Proxy', 'info');
      await fetchProxies();
      fetchProfiles();
    } else {
      showToast(data.error, 'danger');
    }
  } catch (err) {
    showToast(`Lỗi xóa Proxy: ${err.message}`, 'danger');
  }
};

window.checkProxySingle = async function(id) {
  try {
    showToast('Đang kiểm tra kết nối & IP của Proxy...', 'info');
    const res = await fetch(`${API_BASE}/proxies/${id}/check`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      const p = data.proxy;
      if (p.status === 'live') {
        showToast(`✅ LIVE! Ping: ${p.ping}ms | IP: ${p.ip} (${p.country || 'Unknown'})`, 'success');
      } else {
        showToast(`⚠️ DIE hoặc không phản hồi (${p.error || 'Timeout'})`, 'danger');
      }
      fetchProxies();
    } else {
      showToast(`Lỗi kiểm tra: ${data.error}`, 'danger');
    }
  } catch (err) {
    showToast(`Lỗi kết nối: ${err.message}`, 'danger');
  }
};

if (btnCheckAllProxies) {
  btnCheckAllProxies.addEventListener('click', async () => {
    if (allProxies.length === 0) {
      showToast('Kho Proxy trống', 'info');
      return;
    }
    try {
      showToast(`Đang kiểm tra toàn bộ ${allProxies.length} Proxy...`, 'info');
      const res = await fetch(`${API_BASE}/proxies/check-all`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const liveCount = data.results.filter(r => r.status === 'live').length;
        showToast(`Hoàn tất kiểm tra: ${liveCount}/${data.count} Proxy hoạt động tốt!`, 'success');
        fetchProxies();
      } else {
        showToast(`Lỗi kiểm tra hàng loạt: ${data.error}`, 'danger');
      }
    } catch (err) {
      showToast(`Lỗi: ${err.message}`, 'danger');
    }
  });
}

// -------------------------------------------------------------
// Automation Code Snippets & Copy (Bước 3)
// -------------------------------------------------------------
const AUTOMATION_SNIPPETS = {
  puppeteer: `const puppeteer = require('puppeteer-core');

async function automateProfile(profileId) {
  // 1. Khởi chạy profile qua API MyBrowser 153
  const res = await fetch(\`http://127.0.0.1:51888/api/v1/profiles/\${profileId}/start\`, { method: 'POST' });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);

  console.log(\`Đã mở profile PID: \${data.pid}, Cổng CDP: \${data.port}\`);

  // 2. Kết nối Puppeteer trực tiếp vào WebSocket CDP của MyBrowser 153
  const browser = await puppeteer.connect({
    browserWSEndpoint: data.wsEndpoint,
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  
  await page.goto('https://iphey.com', { waitUntil: 'networkidle2' });
  console.log('Tiêu đề trang:', await page.title());
  
  // 3. Đóng an toàn khi xong việc
  // await fetch(\`http://127.0.0.1:51888/api/v1/profiles/\${profileId}/stop\`, { method: 'POST' });
}

automateProfile('YOUR_PROFILE_ID');`,

  playwright: `import asyncio
import requests
from playwright.async_api import async_playwright

API_BASE = "http://127.0.0.1:51888/api/v1"

async def run(profile_id: str):
    # 1. Gọi API mở trình duyệt MyBrowser 153
    resp = requests.post(f"{API_BASE}/profiles/{profile_id}/start").json()
    if not resp.get("success"):
        print(f"Lỗi khởi chạy: {resp.get('error')}")
        return

    ws_endpoint = resp["wsEndpoint"]
    print(f"Đã mở profile {profile_id} tại CDP: {ws_endpoint}")

    # 2. Kết nối Playwright qua CDP WebSocket
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp(ws_endpoint)
        context = browser.contexts[0]
        page = context.pages[0] if context.pages else await context.new_page()

        await page.goto("https://iphey.com")
        print("Page title:", await page.title())
        await page.wait_for_timeout(5000)

        # 3. Đóng profile an toàn qua API
        # requests.post(f"{API_BASE}/profiles/{profile_id}/stop")

if __name__ == "__main__":
    asyncio.run(run("YOUR_PROFILE_ID"))`,

  selenium: `import requests
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

API_BASE = "http://127.0.0.1:51888/api/v1"
profile_id = "YOUR_PROFILE_ID"

# 1. Khởi chạy profile bằng REST API
resp = requests.post(f"{API_BASE}/profiles/{profile_id}/start").json()
if not resp.get("success"):
    raise Exception(f"Không thể khởi chạy profile: {resp.get('error')}")

port = resp["port"]
print(f"Trình duyệt đang lắng nghe tại cổng CDP: 127.0.0.1:{port}")

# 2. Kết nối Selenium trực tiếp qua DevTools Active Port
chrome_options = Options()
chrome_options.add_experimental_option("debuggerAddress", f"127.0.0.1:{port}")

driver = webdriver.Chrome(options=chrome_options)
driver.get("https://iphey.com")
print("Tiêu đề trang:", driver.title)

# 3. Đóng profile an toàn qua REST API
# requests.post(f"{API_BASE}/profiles/{profile_id}/stop")`,

  curl: `# 1. Lấy danh sách hồ sơ trình duyệt
curl -X GET http://127.0.0.1:51888/api/v1/profiles

# 2. Khởi chạy 1 profile (Trả về WebSocket URL & CDP Port)
curl -X POST http://127.0.0.1:51888/api/v1/profiles/YOUR_PROFILE_ID/start

# 3. Đóng an toàn 1 profile (Lưu dữ liệu Session & Cookies)
curl -X POST http://127.0.0.1:51888/api/v1/profiles/YOUR_PROFILE_ID/stop

# 4. Mở hàng loạt profiles theo danh sách ID
curl -X POST http://127.0.0.1:51888/api/v1/profiles/batch-start \\
  -H "Content-Type: application/json" \\
  -d '{"profileIds": ["id-1", "id-2"]}'

# 5. Kiểm tra tốc độ & trạng thái sống của toàn bộ Proxy
curl -X POST http://127.0.0.1:51888/api/v1/proxies/check-all`
};

document.querySelectorAll('#api-lang-tabs .plan-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('#api-lang-tabs .plan-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const lang = tab.dataset.apilang;
    if (AUTOMATION_SNIPPETS[lang] && apiCodeSnippet) {
      apiCodeSnippet.innerText = AUTOMATION_SNIPPETS[lang];
    }
  });
});

if (btnCopyCode) {
  btnCopyCode.addEventListener('click', async () => {
    if (apiCodeSnippet) {
      await safeCopyToClipboard(apiCodeSnippet.innerText);
      showToast('Đã sao chép mã tự động hóa vào clipboard!', 'success');
    }
  });
}

// -------------------------------------------------------------
// Multi-Window Action Synchronizer & Grid Tiling UI
// Đã được tách thành module độc lập: public/js/sync-ui.js
// -------------------------------------------------------------

// Navigation Tabs
const views = {
  profiles: { el: document.getElementById('view-profiles'), title: 'Quản lý Hồ sơ Trình duyệt', sub: 'Hệ thống Antidetect & Profile độc lập chuyên sâu với nhân Chromium tùy biến' },
  groups: { el: document.getElementById('view-groups'), title: 'Nhóm Hồ Sơ (Profile Groups)', sub: 'Phân loại hồ sơ theo chiến dịch, dự án và nền tảng MMO' },
  proxies: { el: document.getElementById('view-proxies'), title: 'Danh Sách Proxy & Kiểm Tra IP', sub: 'Quản lý kho proxy tĩnh HTTP/HTTPS/SOCKS5 với kiểm tra Live Ping' },
  extensions: { el: document.getElementById('view-extensions'), title: 'Kho Tiện Ích Mở Rộng (Chrome Extensions)', sub: 'Quản lý các tiện ích MMO, Facebook, TikTok và nạp tự động vào Profile' },
  sync: { el: document.getElementById('view-sync'), title: 'Đồng Bộ Thao Tác Chuột & Phím', sub: 'Truyền tín hiệu bàn phím và chuột thời gian thực từ Master sang Slave qua CDP' },
  license: { el: document.getElementById('view-license'), title: 'Bản Quyền & Nâng Cấp Gói', sub: 'Tích hợp bảo mật bản quyền CGT-License Engine • lic.cgtdev.space' },
  api: { el: document.getElementById('view-api'), title: 'REST API & Automation Protocol', sub: 'Tự động hóa hoàn toàn với Puppeteer, Playwright, Python và MCP' },
  admin: { el: document.getElementById('view-admin'), title: 'Quản Trị Người Dùng & Bản Quyền', sub: 'Quản lý tài khoản, nâng gói Pro / VIP và kết nối lic.cgtdev.space' },
};

function switchTab(tabId) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tabId);
  });

  for (const [key, item] of Object.entries(views)) {
    if (item.el) {
      if (key === tabId) {
        item.el.style.display = 'block';
        pageHeading.innerText = item.title;
        pageSubheading.innerText = item.sub;
      } else {
        item.el.style.display = 'none';
      }
    }
  }

  if (tabId === 'sync') {
    fetchProfiles().then(() => {
      if (typeof renderSyncWorkspace === 'function') renderSyncWorkspace();
      if (typeof fetchSyncStatus === 'function') fetchSyncStatus();
    });
  }

  if (tabId === 'extensions') {
    fetchExtensions();
  }
}

// -------------------------------------------------------------
// Extensions Hub Management Logic
// -------------------------------------------------------------
async function fetchExtensions() {
  try {
    const res = await fetch(`${API_BASE}/extensions`);
    const data = await res.json();
    if (data.success) {
      allExtensions = data.extensions || [];
      renderExtensions();
    }
  } catch (err) {
    console.error('Error fetching extensions:', err);
  }
}

function renderExtensions() {
  if (!extensionsGrid || !extensionsEmptyState) return;

  const searchQuery = (searchExtensionsInput ? searchExtensionsInput.value.trim().toLowerCase() : '');
  const filterMode = (filterExtensionMode ? filterExtensionMode.value : 'all');

  let filtered = allExtensions.filter(ext => {
    const matchSearch = ext.name.toLowerCase().includes(searchQuery) ||
                        (ext.description && ext.description.toLowerCase().includes(searchQuery)) ||
                        ext.path.toLowerCase().includes(searchQuery);
    if (!matchSearch) return false;

    if (filterMode === 'global') return ext.is_global === 1;
    if (filterMode === 'targeted') return ext.is_global === 0;
    if (filterMode === 'active') return ext.enabled === 1;
    return true;
  });

  if (filtered.length === 0) {
    extensionsGrid.innerHTML = '';
    extensionsEmptyState.style.display = 'block';
    return;
  }

  extensionsEmptyState.style.display = 'none';

  extensionsGrid.innerHTML = filtered.map(ext => {
    const isGlobal = ext.is_global === 1;
    const isEnabled = ext.enabled === 1;
    const globalBadge = isGlobal
      ? `<span class="badge-global" onclick="toggleGlobalExtension('${ext.id}')" title="Nhấp để chuyển thành tiện ích Riêng lẻ">Toàn cục (Tất cả Profile)</span>`
      : `<span class="badge-targeted" onclick="toggleGlobalExtension('${ext.id}')" title="Nhấp để chuyển thành tiện ích Toàn cục">Riêng lẻ (Tùy chọn)</span>`;

    const iconContent = getExtensionIcon(ext, 24);

    return `
      <div class="extension-card">
        <div class="ext-card-header">
          <div class="ext-icon-box" style="display:flex;align-items:center;justify-content:center;color:var(--primary);">${iconContent}</div>
          <div class="ext-info">
            <div class="ext-title-row">
              <span class="ext-name" title="${escapeHtml(ext.name)}">${escapeHtml(ext.name)}</span>
              <span class="ext-version">v${escapeHtml(ext.version)}</span>
            </div>
            <div style="margin-top: 4px;">
              ${globalBadge}
            </div>
          </div>
        </div>

        <div class="ext-desc" title="${escapeHtml(ext.description || 'Không có mô tả')}">
          ${escapeHtml(ext.description || 'Không có mô tả chi tiết cho tiện ích này.')}
        </div>

        <div class="ext-card-footer" style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <label class="uiv-switch" title="Bật/Tắt tiện ích">
              <input type="checkbox" ${isEnabled ? 'checked' : ''} onchange="toggleExtension('${ext.id}')">
              <span class="uiv-switch-track"><span class="uiv-switch-thumb"></span></span>
            </label>
            <span style="font-size: 12px; font-weight: 600; color: ${isEnabled ? '#10B981' : 'var(--text-muted)'};">${isEnabled ? 'Đang bật' : 'Đã tắt'}</span>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="uiv-btn uiv-btn-secondary" style="color: #F87171; border-color: rgba(248,113,113,0.3); padding: 4px 10px; font-size: 12px;" onclick="deleteExtension('${ext.id}')" title="Xóa tiện ích khỏi hệ thống">
              Xóa
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.toggleExtension = async function(id) {
  try {
    const res = await fetch(`${API_BASE}/extensions/${id}/toggle`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast(`Đã ${data.extension.enabled ? 'kích hoạt' : 'tắt'} tiện ích "${data.extension.name}"`, 'success');
      fetchExtensions();
    }
  } catch (err) {
    showToast(`Lỗi: ${err.message}`, 'danger');
  }
};

window.toggleGlobalExtension = async function(id) {
  try {
    const res = await fetch(`${API_BASE}/extensions/${id}/toggle-global`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      const mode = data.extension.is_global ? 'Toàn cục (Tất cả profile)' : 'Riêng lẻ';
      showToast(`Đã đổi chế độ tiện ích thành "${mode}"`, 'info');
      fetchExtensions();
    }
  } catch (err) {
    showToast(`Lỗi: ${err.message}`, 'danger');
  }
};

window.deleteExtension = async function(id) {
  const ext = allExtensions.find(e => e.id === id);
  const ok = await showConfirmDialog({
    title: 'Gỡ tiện ích mở rộng',
    message: `Bạn có chắc muốn xóa tiện ích <strong>"${escapeHtml(ext ? ext.name : id)}"</strong> khỏi hệ thống?`,
    type: 'danger',
    confirmText: 'Xóa tiện ích'
  });
  if (!ok) return;
  try {
    const res = await fetch(`${API_BASE}/extensions/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Đã xóa tiện ích thành công', 'info');
      fetchExtensions();
    }
  } catch (err) {
    showToast(`Lỗi xóa: ${err.message}`, 'danger');
  }
};

window.installPresetExtensions = async function() {
  try {
    showToast('Đang nạp 4 tiện ích MMO mẫu (Cookie-Editor, 2FA Authenticator, FB Helper, Proxy Inspector)...', 'info');
    const res = await fetch(`${API_BASE}/extensions/install-presets`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast(`🎉 Đã cài đặt thành công ${data.count} tiện ích MMO cốt lõi!`, 'success');
      fetchExtensions();
    } else {
      showToast(`Lỗi: ${data.error}`, 'danger');
    }
  } catch (err) {
    showToast(`Lỗi cài đặt presets: ${err.message}`, 'danger');
  }
};

if (btnBrowseExtFolder) {
  btnBrowseExtFolder.addEventListener('click', async () => {
    if (window.electronAPI && typeof window.electronAPI.openDirectory === 'function') {
      const folderPath = await window.electronAPI.openDirectory();
      if (folderPath) {
        extFormPath.value = folderPath;
        try {
          const res = await fetch(`${API_BASE}/extensions/parse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: folderPath })
          });
          const data = await res.json();
          if (data.success && data.manifest) {
            extFormName.value = data.manifest.name || '';
            showToast(`Đã nhận diện: ${data.manifest.name} v${data.manifest.version}`, 'success');
          }
        } catch (e) {}
      }
    } else {
      const p = prompt('Nhập đường dẫn thư mục tiện ích đã giải nén trên máy tính của bạn:', extFormPath.value || '');
      if (p && p.trim()) {
        extFormPath.value = p.trim();
        try {
          const res = await fetch(`${API_BASE}/extensions/parse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: p.trim() })
          });
          const data = await res.json();
          if (data.success && data.manifest) {
            extFormName.value = data.manifest.name || '';
            showToast(`Đã nhận diện: ${data.manifest.name} v${data.manifest.version}`, 'success');
          } else {
            showToast('Đã lưu đường dẫn tiện ích', 'info');
          }
        } catch (e) {}
      }
    }
  });
}

if (btnUploadExtension) {
  btnUploadExtension.addEventListener('click', () => {
    extFormPath.value = '';
    extFormName.value = '';
    extFormGlobal.checked = true;
    extensionModal.classList.add('open');
  });
}

if (btnInstallPresets) {
  btnInstallPresets.addEventListener('click', installPresetExtensions);
}

if (extensionModalCloseBtn) {
  extensionModalCloseBtn.addEventListener('click', () => extensionModal.classList.remove('open'));
}

if (extensionModalCancelBtn) {
  extensionModalCancelBtn.addEventListener('click', () => extensionModal.classList.remove('open'));
}

if (extensionModalSaveBtn) {
  extensionModalSaveBtn.addEventListener('click', async () => {
    const pathVal = extFormPath.value.trim();
    if (!pathVal) {
      await showCustomAlert({
        title: 'Thiếu đường dẫn',
        message: 'Vui lòng chọn hoặc nhập đường dẫn thư mục chứa tiện ích mở rộng (có file <code>manifest.json</code>).',
        type: 'warning'
      });
      return;
    }
    const nameVal = extFormName.value.trim();
    const isGlobal = extFormGlobal.checked ? 1 : 0;

    try {
      showToast('Đang phân tích và nạp tiện ích...', 'info');
      const res = await fetch(`${API_BASE}/extensions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pathVal, name: nameVal, is_global: isGlobal })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      showToast(`Đã thêm thành công tiện ích "${data.extension.name}"!`, 'success');
      extensionModal.classList.remove('open');
      fetchExtensions();
    } catch (err) {
      showToast(`Không thể thêm: ${err.message}`, 'danger');
    }
  });
}

if (searchExtensionsInput) {
  searchExtensionsInput.addEventListener('input', renderExtensions);
}

if (filterExtensionMode) {
  filterExtensionMode.addEventListener('change', renderExtensions);
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    switchTab(item.dataset.tab);
  });
});

const sidebarBtnUpgrade = document.getElementById('sidebar-btn-upgrade');
if (sidebarBtnUpgrade) {
  sidebarBtnUpgrade.addEventListener('click', () => {
    if (typeof switchTab === 'function') switchTab('license');
    const pkgTab = document.querySelector('.plan-tab[data-subtab="packages"]');
    if (pkgTab) pkgTab.click();
  });
}

const sidebarBtnCreate = document.getElementById('sidebar-btn-create');
if (sidebarBtnCreate) {
  sidebarBtnCreate.addEventListener('click', () => {
    if (btnCreateModal) btnCreateModal.click();
  });
}

window.switchTab = switchTab;
window.closeModal = closeModal;

// License Pricing & Slider Logic
const profileSlider = document.getElementById('profile-slider');
const sliderProfileCount = document.getElementById('slider-profile-count');
const priceTotal = document.getElementById('price-total');
let currentDiscount = 0;

function calculatePrice() {
  if (!profileSlider || !sliderProfileCount || !priceTotal) return;
  const count = parseInt(profileSlider.value, 10);
  sliderProfileCount.innerText = count;
  const basePricePerProfile = 2500; // 2.500đ / profile / tháng (giống PolyLogin)
  const rawTotal = count * basePricePerProfile;
  const discounted = rawTotal * (1 - currentDiscount / 100);
  priceTotal.innerText = `${Math.round(discounted).toLocaleString('vi-VN')}đ / tháng`;
}

if (profileSlider) {
  profileSlider.addEventListener('input', calculatePrice);
}

document.querySelectorAll('.duration-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentDiscount = parseInt(btn.dataset.discount, 10) || 0;
    calculatePrice();
  });
});

document.querySelectorAll('.plan-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
  });
});

// Subtabs in License View
document.querySelectorAll('.plan-tab[data-subtab]').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.plan-tab[data-subtab]').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const sub = tab.dataset.subtab;
    const pkgEl = document.getElementById('subtab-packages-content');
    const actEl = document.getElementById('subtab-activate-content');
    const devEl = document.getElementById('subtab-device-content');
    const admEl = document.getElementById('subtab-admin-content');

    if (pkgEl) pkgEl.style.display = sub === 'packages' ? 'block' : 'none';
    if (actEl) actEl.style.display = sub === 'activate' ? 'block' : 'none';
    if (devEl) devEl.style.display = sub === 'device' ? 'block' : 'none';
    if (admEl) admEl.style.display = sub === 'admin' ? 'block' : 'none';
  });
});

const btnSwitchActivate = document.getElementById('btn-switch-activate');
if (btnSwitchActivate) {
  btnSwitchActivate.addEventListener('click', () => {
    const actTab = document.querySelector('.plan-tab[data-subtab="activate"]');
    if (actTab) actTab.click();
  });
}

// License Key Submit
const btnSubmitLicense = document.getElementById('btn-submit-license');
if (btnSubmitLicense) {
  btnSubmitLicense.addEventListener('click', async () => {
    const key = document.getElementById('license-key-input').value.trim();
    if (!key) {
      showToast('Vui lòng nhập License Key', 'danger');
      return;
    }

    showToast('Đang xác thực với lic.cgtdev.space...', 'info');
    try {
      const res = await fetch(`${API_BASE}/license/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });
      const data = await res.json();
      if (data.success && data.license) {
        showToast(`Kích hoạt thành công gói ${data.license.plan}!`, 'success');
        updateLicenseUI(data.license);
        const devTab = document.querySelector('.plan-tab[data-subtab="device"]');
        if (devTab) devTab.click();
      } else {
        showToast(`Kích hoạt thất bại: ${data.error}`, 'danger');
      }
    } catch (err) {
      showToast(`Lỗi kích hoạt: ${err.message}`, 'danger');
    }
  });
}

// CGT-License Admin Fast Auto-Activate
const btnAdminAutoActivate = document.getElementById('btn-admin-auto-activate');
if (btnAdminAutoActivate) {
  btnAdminAutoActivate.addEventListener('click', async () => {
    showToast('Đang kết nối xác thực 2FA với lic.cgtdev.space...', 'info');
    btnAdminAutoActivate.disabled = true;
    try {
      const res = await fetch(`${API_BASE}/license/admin/auto-activate`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.license) {
        showToast('Đã cấp & kích hoạt thành công VIP Vĩnh Viễn!', 'success');
        updateLicenseUI(data.license);
        const devTab = document.querySelector('.plan-tab[data-subtab="device"]');
        if (devTab) devTab.click();
      } else {
        showToast(`Kích hoạt tự động thất bại: ${data.error}`, 'danger');
      }
    } catch (err) {
      showToast(`Lỗi: ${err.message}`, 'danger');
    } finally {
      btnAdminAutoActivate.disabled = false;
    }
  });
}

// CGT-License Admin Issue Key for Customers
const btnAdminIssueKey = document.getElementById('btn-admin-issue-key');
if (btnAdminIssueKey) {
  btnAdminIssueKey.addEventListener('click', async () => {
    const planCode = document.getElementById('admin-issue-plan')?.value || 'VIP_LIFETIME';
    const notes = document.getElementById('admin-issue-notes')?.value.trim() || 'Tạo qua OmniBrowser Admin';
    const durationDays = planCode === 'PRO_MONTHLY' ? 30 : 3650;

    showToast('Đang kết nối máy chủ tạo License Key...', 'info');
    btnAdminIssueKey.disabled = true;
    try {
      const res = await fetch(`${API_BASE}/license/admin/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planCode, durationDays, notes })
      });
      const data = await res.json();
      if (data.success && data.key) {
        showToast(`Đã tạo License Key thành công: ${data.key}`, 'success');
        const box = document.getElementById('admin-issued-key-box');
        const textEl = document.getElementById('admin-issued-key-text');
        if (box && textEl) {
          textEl.innerText = data.key;
          box.style.display = 'block';
        }
      } else {
        showToast(`Tạo key thất bại: ${data.error}`, 'danger');
      }
    } catch (err) {
      showToast(`Lỗi: ${err.message}`, 'danger');
    } finally {
      btnAdminIssueKey.disabled = false;
    }
  });
}

// Copy Helper with Visual Feedback
window.copyVipKey = async function(btn) {
  const key = 'OMNI-JV6FN-6RFDQ-J00FP-FE7GS';
  await safeCopyToClipboard(key);
  showToast('Đã sao chép License Key VIP vào bộ nhớ tạm', 'success');
  if (btn) {
    const origHTML = btn.innerHTML;
    btn.classList.add('copied');
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>Đã chép!</span>';
    setTimeout(() => {
      btn.innerHTML = origHTML;
      btn.classList.remove('copied');
    }, 1500);
  }
};

const btnAdminCopyIssuedKey = document.getElementById('btn-admin-copy-issued-key');
if (btnAdminCopyIssuedKey) {
  btnAdminCopyIssuedKey.addEventListener('click', async () => {
    const key = document.getElementById('admin-issued-key-text')?.innerText.trim();
    if (key) {
      await safeCopyToClipboard(key);
      showToast('Đã sao chép License Key vào bộ nhớ tạm', 'success');
    }
  });
}

// Copy HWID
const btnCopyHwid = document.getElementById('btn-copy-hwid');
if (btnCopyHwid) {
  btnCopyHwid.addEventListener('click', async () => {
    const hwidEl = document.getElementById('license-hwid-text');
    const hwid = hwidEl ? hwidEl.innerText.trim() : '';
    await safeCopyToClipboard(hwid);
    showToast('Đã sao chép mã HWID vào bộ nhớ tạm', 'success');
  });
}

// Auto-refresh loop every 1.2 seconds to keep running status live
setInterval(() => {
  fetchProfiles();
  if (typeof fetchSyncStatus === 'function') fetchSyncStatus();
}, 1200);

// Delegate external link clicks to open in default system browser
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="http"]');
  if (link && window.electronAPI && typeof window.electronAPI.openExternal === 'function') {
    e.preventDefault();
    window.electronAPI.openExternal(link.href);
  }
});

// -------------------------------------------------------------
// P3: Proxy Rotation Handlers
// -------------------------------------------------------------
window.rotateProfileProxy = async function(profileId, event) {
  if (event) event.stopPropagation();
  const btn = document.getElementById(`btn-rotate-${profileId}`);
  if (btn) btn.classList.add('spinning');
  showToast('Đang gọi API đổi IP mới qua Gateway...', 'info');

  try {
    const res = await fetch(`${API_BASE}/profiles/${profileId}/rotate-proxy`, { method: 'POST' });
    const data = await res.json();
    if (data.success && data.result) {
      const newIp = data.result.newProxyInfo?.ip || data.proxy?.ip || 'Mới';
      showToast(`🎉 Xoay IP thành công! Địa chỉ mới: ${newIp}`, 'success');
      const ipDisplay = document.getElementById(`proxy-ip-display-${profileId}`);
      if (ipDisplay) {
        ipDisplay.innerText = `${data.proxy?.host}:${data.proxy?.port} (${newIp})`;
        ipDisplay.style.color = '#10B981';
      }
      await fetchProxies();
      fetchProfiles();
    } else {
      showToast(`Xoay IP thất bại: ${data.error}`, 'danger');
    }
  } catch (err) {
    showToast(`Lỗi khi gọi API xoay IP: ${err.message}`, 'danger');
  } finally {
    if (btn) btn.classList.remove('spinning');
  }
};

// -------------------------------------------------------------
// P4: Profile Backup & Restore (Export / Import ZIP)
// -------------------------------------------------------------
window.exportProfileZip = function(profileId, event) {
  if (event) event.stopPropagation();
  showToast('Đang đóng gói và tải xuống file ZIP của hồ sơ...', 'info');
  window.location.href = `${API_BASE}/profiles/${profileId}/export-zip`;
};

// Import Profile ZIP
const btnImportZip = document.getElementById('btn-import-profile-zip');
const inputProfileZip = document.getElementById('input-profile-zip-file');

if (btnImportZip && inputProfileZip) {
  btnImportZip.addEventListener('click', () => {
    inputProfileZip.value = '';
    inputProfileZip.click();
  });

  inputProfileZip.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    showToast(`Đang tải lên và giải nén hồ sơ: ${file.name}...`, 'info');
    try {
      const buffer = await file.arrayBuffer();
      const res = await fetch(`${API_BASE}/profiles/import-zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: buffer,
      });
      const data = await res.json();
      if (data.success && data.profile) {
        showToast(`🎉 Khôi phục hồ sơ "${data.profile.name}" thành công!`, 'success');
        await fetchProfiles();
      } else {
        showToast(`Khôi phục hồ sơ thất bại: ${data.error}`, 'danger');
      }
    } catch (err) {
      showToast(`Lỗi nhập file ZIP: ${err.message}`, 'danger');
    }
  });
}

// -------------------------------------------------------------
// P1: In-App Kernel Center & Auto-Downloader
// -------------------------------------------------------------
const btnKernelCenter = document.getElementById('btn-kernel-center');
const btnKernelLabel = document.getElementById('btn-kernel-label');
const sidebarKernelCard = document.getElementById('sidebar-kernel-card');
const sidebarKernelDot = document.getElementById('sidebar-kernel-dot');

const kernelModal = document.getElementById('kernel-modal');
const kernelModalClose = document.getElementById('kernel-modal-close');
const kernelModalCancel = document.getElementById('kernel-modal-cancel');
const btnStartAutoKernel = document.getElementById('btn-start-auto-kernel-download');
const btnCancelKernel = document.getElementById('btn-cancel-kernel-download');
const btnInstallLocalKernel = document.getElementById('btn-install-local-kernel');
const kernelLocalPath = document.getElementById('kernel-local-path');
const kernelSuccessBox = document.getElementById('kernel-success-box');
const btnOpenKernelFolder = document.getElementById('btn-open-kernel-folder');
const btnCopyKernelPath = document.getElementById('btn-copy-kernel-path');

const btnModalOpenKernel = document.getElementById('btn-modal-open-kernel');

let kernelPollTimer = null;
let isDownloadingKernel = false;

function openKernelModal() {
  if (kernelModal) {
    kernelModal.style.removeProperty('display');
    kernelModal.style.display = 'flex';
    kernelModal.classList.add('open');
    pollKernelStatus();
  }
}

function closeKernelModal() {
  if (kernelModal) {
    kernelModal.classList.remove('open');
    kernelModal.style.display = 'none';
  }
  fetchStatus();
}

if (btnKernelCenter) btnKernelCenter.addEventListener('click', openKernelModal);
if (sidebarKernelCard) sidebarKernelCard.addEventListener('click', openKernelModal);
const topAnnouncementStrip = document.getElementById('top-announcement-strip');
if (topAnnouncementStrip) topAnnouncementStrip.addEventListener('click', openKernelModal);
const topbarRecommendPill = document.getElementById('topbar-recommend-pill');
if (topbarRecommendPill) topbarRecommendPill.addEventListener('click', openKernelModal);
if (btnModalOpenKernel) btnModalOpenKernel.addEventListener('click', openKernelModal);
if (kernelModalClose) kernelModalClose.addEventListener('click', closeKernelModal);
if (kernelModalCancel) kernelModalCancel.addEventListener('click', closeKernelModal);

if (btnOpenKernelFolder) {
  btnOpenKernelFolder.addEventListener('click', async () => {
    const pathTextEl = document.getElementById('kernel-modal-path-text');
    let p = pathTextEl ? pathTextEl.innerText.trim() : '';
    if (!p || p === '--') {
      p = 'C:\\Users\\Admin\\.gemini\\antigravity\\scratch\\antidetect-manager\\bin\\chromium\\chrome.exe';
    }

    // Determine folder directory
    let folderPath = p;
    if (folderPath.toLowerCase().endsWith('.exe')) {
      const idx = Math.max(folderPath.lastIndexOf('\\'), folderPath.lastIndexOf('/'));
      if (idx > 0) folderPath = folderPath.substring(0, idx);
    }
    const winPath = folderPath.replace(/\//g, '\\');
    const normalizedSlash = winPath.replace(/\\/g, '/');
    const fileUrl = normalizedSlash.startsWith('file:///') ? normalizedSlash : `file:///${normalizedSlash}`;

    showToast('📂 Đang mở thư mục trong Windows Explorer...', 'info');

    // 1. If running in Electron, use native desktop shell (100% active in all Electron instances)
    if (window.electronAPI) {
      if (typeof window.electronAPI.openExternal === 'function') {
        window.electronAPI.openExternal(fileUrl);
      }
      if (typeof window.electronAPI.openPath === 'function') {
        window.electronAPI.openPath(winPath);
      }
      if (typeof window.electronAPI.showItemInFolder === 'function') {
        window.electronAPI.showItemInFolder(p);
      }
    }

    // 2. Also call backend API for redundancy and for web-browser access
    try {
      const res = await fetch(`${API_BASE}/kernel/open-folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: winPath })
      });
      const data = await res.json();
      if (data && data.success) {
        showToast(`📂 Đã mở thư mục: ${data.path}`, 'success');
      } else {
        showToast(`Không mở được: ${data.error || 'Lỗi không xác định'}`, 'danger');
      }
    } catch (err) {
      showToast(`Lỗi: ${err.message}`, 'danger');
    }
  });
}

if (btnCopyKernelPath) {
  btnCopyKernelPath.addEventListener('click', async () => {
    const pathTextEl = document.getElementById('kernel-modal-path-text');
    const p = pathTextEl ? pathTextEl.innerText.trim() : '';
    if (p && p !== '--') {
      await safeCopyToClipboard(p);
      showToast('📋 Đã sao chép đường dẫn Kernel vào Clipboard!', 'success');
    } else {
      showToast('Chưa có đường dẫn kernel khả dụng', 'warning');
    }
  });
}

async function pollKernelStatus() {
  try {
    const res = await fetch(`${API_BASE}/kernel/status`);
    const data = await res.json();

    // Tự động đồng bộ danh sách kernels vào form Tạo Hồ Sơ
    if (data.kernels && data.kernels.length > 0) {
      populateKernelSelect(data.kernels, data.defaultKernel);
    }

    // Update Status Banner in Modal
    const statusTextEl = document.getElementById('kernel-modal-status-text');
    const pathTextEl = document.getElementById('kernel-modal-path-text');
    const badgeEl = document.getElementById('kernel-modal-badge');
    const progressBox = document.getElementById('kernel-progress-box');
    const progressBar = document.getElementById('kernel-progress-bar');
    const progressPercent = document.getElementById('kernel-progress-percent');
    const progressBytes = document.getElementById('kernel-progress-bytes');
    const progressSpeed = document.getElementById('kernel-progress-speed');
    const progressTitle = document.getElementById('kernel-progress-title');

    if (data.isInstalled) {
      if (statusTextEl) statusTextEl.innerText = 'Đã cài đặt Chromium 153 Core (Portable)';
      if (pathTextEl) pathTextEl.innerText = data.kernelPath || data.kernelDir || 'bin/chromium/chrome.exe';
      if (badgeEl) {
        badgeEl.className = 'badge badge-running';
        badgeEl.innerText = 'Sẵn sàng';
      }
      if (kernelSuccessBox) {
        kernelSuccessBox.style.display = 'block';
      }
      if (btnStartAutoKernel) {
        btnStartAutoKernel.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          <span>Tải Lại / Cập Nhật Kernel Mới</span>
        `;
        btnStartAutoKernel.className = 'uiv-btn uiv-btn-secondary';
        btnStartAutoKernel.style.width = '100%';
        btnStartAutoKernel.style.justifyContent = 'center';
        btnStartAutoKernel.style.padding = '10px';
      }
      if (kernelLabel) kernelLabel.innerText = 'Chromium 153 (Sẵn sàng)';
      if (sidebarKernelDot) {
        sidebarKernelDot.style.background = '#10B981';
        sidebarKernelDot.style.boxShadow = 'none';
      }
      if (btnKernelLabel) btnKernelLabel.innerText = 'Kernel 153: Sẵn Sàng';
      if (btnKernelCenter) {
        btnKernelCenter.style.color = '#10B981';
        btnKernelCenter.style.background = 'rgba(16, 185, 129, 0.12)';
        btnKernelCenter.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      }
    } else {
      if (statusTextEl) statusTextEl.innerText = 'Chưa cài đặt Chromium 153 Core';
      if (pathTextEl) pathTextEl.innerText = 'bin/chromium/chrome.exe (Chưa tồn tại)';
      if (badgeEl) {
        badgeEl.className = 'badge badge-stopped';
        badgeEl.innerText = 'Chưa cài';
      }
      if (kernelSuccessBox) {
        kernelSuccessBox.style.display = 'none';
      }
      if (btnStartAutoKernel) {
        btnStartAutoKernel.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>1-Click Tải & Cài Đặt Tự Động</span>
        `;
        btnStartAutoKernel.className = 'uiv-cta-primary';
        btnStartAutoKernel.style.width = '100%';
        btnStartAutoKernel.style.justifyContent = 'center';
        btnStartAutoKernel.style.padding = '11px';
      }
      if (kernelLabel) kernelLabel.innerText = 'Chưa cài Chromium 153';
      if (sidebarKernelDot) {
        sidebarKernelDot.style.background = '#F59E0B';
        sidebarKernelDot.style.boxShadow = 'none';
      }
      if (btnKernelLabel) btnKernelLabel.innerText = 'Cài Đặt Kernel';
      if (btnKernelCenter) {
        btnKernelCenter.style.color = 'var(--primary)';
        btnKernelCenter.style.background = 'rgba(56, 103, 244, 0.1)';
        btnKernelCenter.style.borderColor = 'rgba(56, 103, 244, 0.3)';
      }
    }

    const task = data.downloadTask;
    if (task && (task.status === 'downloading' || task.status === 'extracting')) {
      if (progressBox) progressBox.style.display = 'block';
      if (kernelSuccessBox) kernelSuccessBox.style.display = 'none';
      if (progressTitle) {
        progressTitle.innerText = task.status === 'extracting' ? 'Đang xả nén siêu tốc vào bin/chromium/...' : 'Đang tải gói Chromium 153 (~245MB)...';
      }
      if (progressBar) progressBar.style.width = `${task.progress}%`;
      if (progressPercent) progressPercent.innerText = `${task.progress}%`;
      if (progressBytes) {
        const mbDown = (task.downloadedBytes / 1024 / 1024).toFixed(1);
        const mbTotal = (task.totalBytes / 1024 / 1024).toFixed(1);
        progressBytes.innerText = task.totalBytes > 0 ? `${mbDown} MB / ${mbTotal} MB` : `${mbDown} MB`;
      }
      if (progressSpeed) progressSpeed.innerText = task.speed;

      clearTimeout(kernelPollTimer);
      kernelPollTimer = setTimeout(pollKernelStatus, 700);
    } else {
      if (progressBox) progressBox.style.display = 'none';
      if (isDownloadingKernel || (task && task.status === 'completed')) {
        const wasDownloading = isDownloadingKernel;
        isDownloadingKernel = false;
        if (wasDownloading) {
          showToast('🎉 Tải và cài đặt Chromium Kernel 153 thành công vào bin/chromium!', 'success');
        }
        if (kernelSuccessBox) kernelSuccessBox.style.display = 'block';
        fetchStatus();
      }
    }
  } catch (err) {
    console.error('Error polling kernel status:', err);
  }
}

if (btnStartAutoKernel) {
  btnStartAutoKernel.addEventListener('click', async () => {
    isDownloadingKernel = true;
    showToast('Đang kết nối tải và cài đặt Chromium Core 153...', 'info');
    try {
      const res = await fetch(`${API_BASE}/kernel/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data && data.success) {
        showToast(data.message || '🎉 Đã cài đặt thành công Chromium Core 153!', 'success');
        pollKernelStatus();
        fetchStatus();
      } else {
        isDownloadingKernel = false;
        showToast(`Lỗi: ${data.error || data.message || 'Không thể bắt đầu tải hoặc cài đặt'}`, 'danger');
      }
    } catch (err) {
      isDownloadingKernel = false;
      showToast(`Lỗi kết nối: ${err.message}`, 'danger');
    }
  });
}

if (btnCancelKernel) {
  btnCancelKernel.addEventListener('click', async () => {
    try {
      isDownloadingKernel = false;
      await fetch(`${API_BASE}/kernel/cancel`, { method: 'POST' });
      showToast('Đã dừng tiến trình tải kernel', 'info');
      pollKernelStatus();
    } catch {}
  });
}

if (btnInstallLocalKernel) {
  btnInstallLocalKernel.addEventListener('click', async () => {
    const p = (kernelLocalPath?.value || '').trim() || 'C:\\Users\\Admin\\.gemini\\antigravity\\scratch\\MyBrowser-153-win64.zip';
    showToast(`Đang giải nén trực tiếp từ: ${p}...`, 'info');
    try {
      const res = await fetch(`${API_BASE}/kernel/install-local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: p })
      });
      const data = await res.json();
      if (data.success) {
        showToast('🎉 Đã cài đặt Chromium Core 153 thành công!', 'success');
        pollKernelStatus();
        fetchStatus();
      } else {
        showToast(`Cài đặt thất bại: ${data.error}`, 'danger');
      }
    } catch (err) {
      showToast(`Lỗi: ${err.message}`, 'danger');
    }
  });
}

// -------------------------------------------------------------
// P2: Bulk Profile Creation Modal & Generator
// -------------------------------------------------------------
const btnBulkCreateOpen = document.getElementById('btn-bulk-create-open');
const bulkProfileModal = document.getElementById('bulk-profile-modal');
const bulkProfileModalClose = document.getElementById('bulk-profile-modal-close');
const bulkProfileModalCancel = document.getElementById('bulk-profile-modal-cancel');
const bulkProfileModalSubmit = document.getElementById('bulk-profile-modal-submit');

function openBulkProfileModal() {
  if (!bulkProfileModal) return;
  const groupSelect = document.getElementById('bulk-form-group');
  if (groupSelect) {
    groupSelect.innerHTML = '<option value="">(Không chia nhóm)</option>' +
      allGroups.map(g => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');
  }
  bulkProfileModal.style.removeProperty('display');
  bulkProfileModal.style.display = 'flex';
  bulkProfileModal.classList.add('open');
}

function closeBulkProfileModal() {
  if (bulkProfileModal) {
    bulkProfileModal.classList.remove('open');
    bulkProfileModal.style.display = 'none';
  }
}

if (btnBulkCreateOpen) btnBulkCreateOpen.addEventListener('click', openBulkProfileModal);
if (bulkProfileModalClose) bulkProfileModalClose.addEventListener('click', closeBulkProfileModal);
if (bulkProfileModalCancel) bulkProfileModalCancel.addEventListener('click', closeBulkProfileModal);

if (bulkProfileModalSubmit) {
  bulkProfileModalSubmit.addEventListener('click', async () => {
    const count = parseInt(document.getElementById('bulk-form-count').value, 10) || 5;
    const namePrefix = document.getElementById('bulk-form-prefix').value.trim() || 'Profile';
    const groupId = document.getElementById('bulk-form-group').value || null;
    const os = document.getElementById('bulk-form-os').value;
    const rawProxies = document.getElementById('bulk-form-proxies').value.trim();
    const startUrl = (document.getElementById('bulk-form-start-url')?.value || '').trim();
    const webrtc = document.getElementById('bulk-form-webrtc').value;
    const canvas = document.getElementById('bulk-form-canvas').checked ? 1 : 0;
    const audio = document.getElementById('bulk-form-audio').checked ? 1 : 0;
    const webgl = document.getElementById('bulk-form-webgl').checked ? 1 : 0;

    let proxyList = [];
    if (rawProxies) {
      proxyList = rawProxies.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    }

    showToast(`Đang sinh ${count} hồ sơ với cấu hình độc lập...`, 'info');
    try {
      const res = await fetch(`${API_BASE}/profiles/bulk-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count,
          namePrefix,
          groupId,
          os,
          proxyList,
          start_url: startUrl,
          webrtc_mode: webrtc,
          canvas_noise: canvas,
          audio_noise: audio,
          webgl_noise: webgl,
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🎉 Tạo thành công ${data.count} hồ sơ mới!`, 'success');
        closeBulkProfileModal();
        await fetchProfiles();
      } else {
        showToast(`Lỗi tạo hàng loạt: ${data.error}`, 'danger');
      }
    } catch (err) {
      showToast(`Lỗi kết nối: ${err.message}`, 'danger');
    }
  });
}

// Init
initTheme();
fetchStatus();
fetchLicense();
fetchGroups();
fetchProxies();
fetchProfiles();
fetchExtensions();
if (typeof fetchSyncStatus === 'function') fetchSyncStatus();
calculatePrice();




// ==================== POLYSYNC AUTH & USER CONTROLS ==================== //

function openModalEl(el) {
  if (!el) return;
  el.style.removeProperty('display');
  el.style.display = 'flex';
  el.classList.add('open');
}

function closeModalEl(el) {
  if (!el) return;
  el.classList.remove('open');
  el.style.display = 'none';
}

async function checkAuthState() {
  let token = getAuthToken();
  const guestBtn = document.getElementById('btn-header-login');
  const userPill = document.getElementById('poly-user-pill');
  const dropdown = document.getElementById('poly-dropdown-menu');

  // If no token on first launch, auto-login to default admin account
  if (!token && !localStorage.getItem('cgt_manual_logout')) {
    try {
      const autoRes = await originalFetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'cgt-license@cgtdev.space', password: 'TumyAdmin@2026!' })
      });
      if (autoRes.ok) {
        const autoData = await autoRes.json();
        if (autoData.success && autoData.token) {
          setAuthToken(autoData.token);
          token = autoData.token;
        }
      }
    } catch (e) {
      console.warn('[Auth] Auto-login fallback error:', e.message);
    }
  }

  if (!token) {
    renderGuestUI();
    return null;
  }

  try {
    const res = await originalFetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        currentUser = data.user;
        renderPolyUserProfile(currentUser);
        return currentUser;
      }
    }
    // Token invalid or expired
    clearAuthToken();
    renderGuestUI();
    return null;
  } catch (err) {
    console.warn('[Auth] Check auth state error:', err.message);
    return null;
  }
}

function renderGuestUI() {
  currentUser = null;
  window.currentUser = null;
  const guestBtn = document.getElementById('btn-header-login');
  const userPill = document.getElementById('poly-user-pill');
  const dropdown = document.getElementById('poly-dropdown-menu');
  const navAdmin = document.getElementById('nav-item-admin');
  const menuAdmin = document.getElementById('poly-menu-admin');

  if (guestBtn) guestBtn.style.display = 'inline-flex';
  if (userPill) userPill.style.display = 'none';
  if (dropdown) dropdown.classList.remove('show');

  // Hide admin controls for guest
  if (navAdmin) navAdmin.style.display = 'none';
  if (menuAdmin) menuAdmin.style.display = 'none';

  // If user is currently on admin view, switch back to profiles
  const adminView = document.getElementById('view-admin');
  if (adminView && adminView.style.display !== 'none') {
    if (typeof switchTab === 'function') switchTab('profiles');
  }

  updateBrandBadge('FREE');
  if (sidebarPlanName) sidebarPlanName.innerText = 'Gói Free';
  if (sidebarPlanQuota) sidebarPlanQuota.innerText = '0/50';
  if (sidebarPlanExpires) sidebarPlanExpires.innerText = 'Vô hạn';
  const sidebarBadge = document.getElementById('sidebar-plan-badge');
  if (sidebarBadge) {
    sidebarBadge.textContent = 'FREE';
    sidebarBadge.className = 'badge badge-subtle-gray';
  }
}
window.renderGuestUI = renderGuestUI;

function renderPolyUserProfile(user) {
  currentUser = user;
  window.currentUser = user;
  const guestBtn = document.getElementById('btn-header-login');
  const userPill = document.getElementById('poly-user-pill');
  const navAdmin = document.getElementById('nav-item-admin');
  const menuAdmin = document.getElementById('poly-menu-admin');

  if (guestBtn) guestBtn.style.display = 'none';
  if (!userPill) return;
  userPill.style.display = 'inline-flex';

  // Toggle Admin Menu based strictly on user.role === 'admin'
  const isAdmin = Boolean(user && user.role === 'admin');
  if (navAdmin) navAdmin.style.display = isAdmin ? 'flex' : 'none';
  if (menuAdmin) menuAdmin.style.display = isAdmin ? 'flex' : 'none';

  // If regular user somehow landed on admin tab, redirect to profiles
  if (!isAdmin) {
    const adminView = document.getElementById('view-admin');
    if (adminView && adminView.style.display !== 'none') {
      if (typeof switchTab === 'function') switchTab('profiles');
    }
  }

  // Update sidebar plan card with real user info
  if (sidebarPlanName) sidebarPlanName.innerText = `Gói ${user.plan || 'Free Trial'}`;
  if (sidebarPlanQuota) sidebarPlanQuota.innerText = `0/${user.max_profiles || 50}`;
  if (sidebarPlanExpires) {
    if (user.is_lifetime || String(user.plan_code).includes('VIP')) {
      sidebarPlanExpires.innerText = 'Vĩnh viễn';
    } else if (user.expires_at) {
      sidebarPlanExpires.innerText = formatVnDate(user.expires_at);
    } else {
      sidebarPlanExpires.innerText = 'Vô hạn';
    }
  }
  const sidebarBadge = document.getElementById('sidebar-plan-badge');
  if (sidebarBadge) {
    const isVip = Boolean(user.is_lifetime || String(user.plan_code).includes('VIP'));
    const isPro = String(user.plan_code).includes('PRO');
    sidebarBadge.textContent = isVip ? 'VIP' : (isPro ? 'PRO' : 'FREE');
    sidebarBadge.className = 'badge ' + (isVip ? 'badge-emerald-subtle' : (isPro ? 'badge-subtle-blue' : 'badge-subtle-gray'));
  }

  const initial = (user.name || user.email || 'P').trim()[0].toUpperCase();
  const avatarEl = document.getElementById('poly-avatar');
  const menuAvatarEl = document.getElementById('poly-menu-avatar');
  if (avatarEl) avatarEl.textContent = initial;
  if (menuAvatarEl) menuAvatarEl.textContent = initial;

  const emailEl = document.getElementById('poly-email');
  if (emailEl) emailEl.textContent = user.maskedEmail || user.email;

  const daysEl = document.getElementById('poly-plan-days');
  if (daysEl) {
    if (user.is_lifetime) {
      daysEl.textContent = 'VIP';
      daysEl.style.color = '#10b981';
      daysEl.style.background = 'rgba(16, 185, 129, 0.12)';
    } else if (user.days_remaining !== null) {
      daysEl.textContent = `${user.days_remaining}d`;
      daysEl.style.color = user.days_remaining <= 3 ? '#ef4444' : '#10b981';
      daysEl.style.background = user.days_remaining <= 3 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)';
    } else {
      daysEl.textContent = 'Free';
      daysEl.style.color = 'var(--text-muted)';
      daysEl.style.background = 'rgba(255, 255, 255, 0.08)';
    }
  }

  const menuNameEl = document.getElementById('poly-menu-name');
  if (menuNameEl) menuNameEl.textContent = user.name || 'Người dùng CGT';

  const menuEmailEl = document.getElementById('poly-menu-email');
  if (menuEmailEl) menuEmailEl.textContent = user.email;

  const menuPlanTag = document.getElementById('poly-menu-plan-tag');
  if (menuPlanTag) {
    menuPlanTag.textContent = `Gói: ${user.plan || 'Free Trial'}${user.is_lifetime ? ' (Vĩnh viễn)' : ''}`;
  }

  const themeLabel = document.getElementById('poly-menu-theme-label');
  if (themeLabel) {
    const isDark = document.body.classList.contains('dark-theme') || !document.body.classList.contains('light-theme');
    themeLabel.textContent = (isDark ? 'Tối' : 'Sáng') + ' ›';
  }

  if (brandLicenseBadge) {
    updateBrandBadge(user.plan_code || user.plan);
  }
}

function initAuthControls() {
  const userPill = document.getElementById('poly-user-pill');
  const dropdown = document.getElementById('poly-dropdown-menu');
  const btnHeaderLogin = document.getElementById('btn-header-login');
  const authModal = document.getElementById('auth-modal');
  const authModalClose = document.getElementById('auth-modal-close');

  // Toggle user dropdown
  if (userPill && dropdown) {
    userPill.onclick = (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
      userPill.classList.toggle('active');
    };

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !userPill.contains(e.target)) {
        dropdown.classList.remove('show');
        userPill.classList.remove('active');
      }
    });
  }

  // Open Auth Modal
  if (btnHeaderLogin && authModal) {
    btnHeaderLogin.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      openModalEl(authModal);
      switchAuthTab('login');
    };
  }

  if (authModalClose && authModal) {
    authModalClose.onclick = (e) => {
      e.preventDefault();
      closeModalEl(authModal);
    };
  }

  if (authModal) {
    authModal.onclick = (e) => {
      if (e.target === authModal) closeModalEl(authModal);
    };
  }

  // Switch tabs in Auth Modal
  const tabLogin = document.getElementById('tab-btn-login');
  const tabReg = document.getElementById('tab-btn-register');
  const formLogin = document.getElementById('form-auth-login');
  const formReg = document.getElementById('form-auth-register');
  const authTitle = document.getElementById('auth-modal-title');

  let currentAuthTab = 'login';
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
  if (tabReg) tabReg.onclick = () => switchAuthTab('register');

  // Quick Admin credentials fill
  const btnQuickAdmin = document.getElementById('btn-quick-admin-login');
  if (btnQuickAdmin) {
    btnQuickAdmin.onclick = (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('auth-login-email');
      const passInput = document.getElementById('auth-login-password');
      if (emailInput) emailInput.value = 'cgt-license@cgtdev.space';
      if (passInput) passInput.value = 'TumyAdmin@2026!';
      const submitBtn = document.getElementById('btn-submit-login');
      if (submitBtn) submitBtn.click();
    };
  }

    // Toggle show/hide password with SVG icons
  function setupAuthPassToggle(btnId, inputId) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;
    btn.onclick = (e) => {
      e.preventDefault();
      const isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';
      btn.classList.toggle('revealed', isPass);
      btn.setAttribute('title', isPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
    };
  }
  setupAuthPassToggle('btn-toggle-login-pass', 'auth-login-password');
  setupAuthPassToggle('btn-toggle-reg-pass', 'auth-reg-password');
  setupAuthPassToggle('btn-toggle-reg-confirm', 'auth-reg-confirm');

  // Submit Login handler
  async function handleLoginSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const email = (document.getElementById('auth-login-email')?.value || '').trim();
    const password = document.getElementById('auth-login-password')?.value || '';
    const btnSubmit = document.getElementById('btn-submit-login');

    if (!email) {
      return showToast('Vui lòng nhập Email đăng nhập', 'warning');
    }
    if (!password) {
      return showToast('Vui lòng nhập Mật khẩu', 'warning');
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Đang đăng nhập...';
    }

    try {
      const res = await originalFetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.removeItem('cgt_manual_logout');
        setAuthToken(data.token);
        closeModalEl(authModal);
        showToast(`🎉 Xin chào ${data.user.name || data.user.email}! Đăng nhập thành công.`, 'success');
        await checkAuthState();
        await fetchLicense();
        await fetchProfiles();
      } else {
        showToast(data.error || 'Đăng nhập thất bại', 'danger');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ: ' + err.message, 'danger');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Đăng Nhập Ngay';
      }
    }
  }

  if (formLogin) formLogin.onsubmit = handleLoginSubmit;
  const btnSubmitLogin = document.getElementById('btn-submit-login');
  if (btnSubmitLogin) {
    btnSubmitLogin.onclick = (e) => {
      handleLoginSubmit(e);
    };
  }

  // Submit Register handler
  async function handleRegisterSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const name = (document.getElementById('auth-reg-name')?.value || '').trim();
    const email = (document.getElementById('auth-reg-email')?.value || '').trim();
    const password = document.getElementById('auth-reg-password')?.value || '';
    const confirm = document.getElementById('auth-reg-confirm')?.value || '';

    if (!email) {
      return showToast('Vui lòng nhập Email đăng ký', 'warning');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return showToast('Địa chỉ Email không đúng định dạng', 'warning');
    }
    if (!password) {
      return showToast('Vui lòng nhập Mật khẩu', 'warning');
    }
    if (password.length < 6) {
      return showToast('Mật khẩu phải có tối thiểu 6 ký tự', 'warning');
    }
    if (!confirm) {
      return showToast('Vui lòng nhập lại mật khẩu để xác nhận', 'warning');
    }
    if (password !== confirm) {
      return showToast('Mật khẩu xác nhận không khớp, vui lòng kiểm tra lại', 'danger');
    }

    const btnSubmit = document.getElementById('btn-submit-register');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Đang tạo tài khoản...';
    }

    try {
      const res = await originalFetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.removeItem('cgt_manual_logout');
        setAuthToken(data.token);
        closeModalEl(authModal);
        showToast(`🎉 Đăng ký thành công! Chào mừng ${data.user.email} (Nhận ngay 50 hồ sơ).`, 'success');
        await checkAuthState();
        await fetchLicense();
        await fetchProfiles();
      } else {
        showToast(data.error || 'Đăng ký thất bại', 'danger');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ: ' + err.message, 'danger');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Tạo Tài Khoản Mới';
      }
    }
  }

  if (formReg) formReg.onsubmit = handleRegisterSubmit;
  const btnSubmitReg = document.getElementById('btn-submit-register');
  if (btnSubmitReg) {
    btnSubmitReg.onclick = (e) => {
      handleRegisterSubmit(e);
    };
  }

  // Logout handler
  const menuLogout = document.getElementById('poly-menu-logout');
  if (menuLogout) {
    menuLogout.onclick = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          await originalFetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
          });
        } catch {}
      }
      localStorage.setItem('cgt_manual_logout', '1');
      clearAuthToken();
      renderGuestUI();
      showToast('Đã đăng xuất khỏi tài khoản', 'info');

      // Tự động chuyển ngay về trang hồ sơ trắng
      if (typeof switchTab === 'function') {
        switchTab('profiles');
      }

      await fetchLicense();
      await fetchProfiles();
    };
  }

  // Change Password Modal
  const menuChangePass = document.getElementById('poly-menu-change-pass');
  const chgModal = document.getElementById('change-password-modal');
  const chgClose = document.getElementById('change-password-modal-close');
  const chgCancel = document.getElementById('btn-cancel-change-password');
  const chgForm = document.getElementById('form-change-password');

  if (menuChangePass && chgModal) {
    menuChangePass.onclick = () => {
      if (dropdown) dropdown.classList.remove('show');
      openModalEl(chgModal);
    };
  }
  if (chgClose && chgModal) chgClose.onclick = () => closeModalEl(chgModal);
  if (chgCancel && chgModal) chgCancel.onclick = () => closeModalEl(chgModal);
  if (chgModal) {
    chgModal.onclick = (e) => {
      if (e.target === chgModal) closeModalEl(chgModal);
    };
  }

  if (chgForm) {
    chgForm.onsubmit = async (e) => {
      e.preventDefault();
      const oldPassword = document.getElementById('chg-old-password').value;
      const newPassword = document.getElementById('chg-new-password').value;
      const confirm = document.getElementById('chg-confirm-password').value;

      if (newPassword !== confirm) return showToast('Mật khẩu mới xác nhận không khớp', 'danger');

      try {
        const res = await originalFetch(`${API_BASE}/auth/change-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getAuthToken() },
          body: JSON.stringify({ oldPassword, newPassword })
        });
        const data = await res.json();
        if (data.success) {
          showToast('✅ Đổi mật khẩu thành công!', 'success');
          closeModalEl(chgModal);
          chgForm.reset();
        } else {
          showToast(data.error || 'Đổi mật khẩu thất bại', 'danger');
        }
      } catch (err) {
        showToast('Lỗi: ' + err.message, 'danger');
      }
    };
  }

  // Account License Key Modal
  const menuKey = document.getElementById('poly-menu-key');
  const keyModal = document.getElementById('account-key-modal');
  const keyClose = document.getElementById('account-key-modal-close');
  const btnSubmitKey = document.getElementById('btn-submit-activate-key');
  const btnAutoVip = document.getElementById('btn-modal-auto-vip');

  if (menuKey && keyModal) {
    menuKey.onclick = () => {
      if (dropdown) dropdown.classList.remove('show');
      if (!currentUser) {
        showToast('Vui lòng đăng nhập trước khi kích hoạt Key', 'warning');
        openModalEl(authModal);
        return;
      }
      document.getElementById('key-modal-account-email').textContent = currentUser.email;
      document.getElementById('key-modal-plan-badge').textContent = currentUser.plan;
      document.getElementById('key-modal-quota').textContent = `${allProfiles.length} / ${currentUser.max_profiles}`;
      document.getElementById('key-modal-expiry').textContent = currentUser.is_lifetime ? 'Vĩnh viễn (Trọn đời)' : (currentUser.days_remaining !== null ? `${currentUser.days_remaining} ngày` : 'Chưa kích hoạt');
      openModalEl(keyModal);
    };
  }
  if (keyClose && keyModal) keyClose.onclick = () => closeModalEl(keyModal);
  if (keyModal) {
    keyModal.onclick = (e) => {
      if (e.target === keyModal) closeModalEl(keyModal);
    };
  }

  if (btnSubmitKey) {
    btnSubmitKey.onclick = async () => {
      const key = (document.getElementById('input-account-license-key')?.value || '').trim();
      if (!key) return showToast('Vui lòng nhập License Key', 'warning');

      btnSubmitKey.disabled = true;
      btnSubmitKey.textContent = 'Đang kích hoạt...';

      try {
        const res = await originalFetch(`${API_BASE}/auth/activate-key`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getAuthToken() },
          body: JSON.stringify({ key })
        });
        const data = await res.json();
        if (data.success && data.user) {
          showToast(`🎉 Kích hoạt thành công gói ${data.user.plan} vào tài khoản!`, 'success');
          closeModalEl(keyModal);
          await checkAuthState();
          await fetchLicense();
        } else {
          showToast(data.error || 'Kích hoạt thất bại', 'danger');
        }
      } catch (err) {
        showToast('Lỗi kích hoạt: ' + err.message, 'danger');
      } finally {
        btnSubmitKey.disabled = false;
        btnSubmitKey.textContent = 'Kích Hoạt Vào Tài Khoản';
      }
    };
  }

  if (btnAutoVip) {
    btnAutoVip.onclick = async () => {
      btnAutoVip.disabled = true;
      btnAutoVip.textContent = 'Đang kích hoạt VIP...';

      try {
        const res = await originalFetch(`${API_BASE}/auth/activate-key`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getAuthToken() },
          body: JSON.stringify({ key: 'OMNI-JV6FN-6RFDQ-J00FP-FE7GS' })
        });
        const data = await res.json();
        if (data.success) {
          showToast('🎉 Đã tự động kích hoạt VIP Lifetime vào tài khoản!', 'success');
          closeModalEl(keyModal);
          await checkAuthState();
          await fetchLicense();
        } else {
          showToast(data.error || 'Kích hoạt thất bại', 'danger');
        }
      } catch (err) {
        showToast('Lỗi: ' + err.message, 'danger');
      } finally {
        btnAutoVip.disabled = false;
        btnAutoVip.textContent = '⚡ Tự động kích hoạt VIP trọn đời qua CGT Admin';
      }
    };
  }

  // Menu Settings Action
  const menuSettings = document.getElementById('poly-menu-settings');
  if (menuSettings) {
    menuSettings.onclick = () => {
      if (dropdown) dropdown.classList.remove('show');
      const kernelBtn = document.getElementById('btn-kernel-center');
      if (kernelBtn) kernelBtn.click();
    };
  }

  // Menu Language & Theme Actions
  const menuLang = document.getElementById('poly-menu-lang');
  const btnLangSelector = document.getElementById('btn-lang-selector');
  function notifyLang() {
    showToast('🌐 Ngôn ngữ ứng dụng: Tiếng Việt (VN)', 'info');
  }
  if (menuLang) menuLang.onclick = notifyLang;
  if (btnLangSelector) btnLangSelector.onclick = notifyLang;

  const menuTheme = document.getElementById('poly-menu-theme');
  if (menuTheme) {
    menuTheme.onclick = () => {
      const themeBtn = document.getElementById('btn-theme-toggle');
      if (themeBtn) themeBtn.click();
      const isDark = document.body.classList.contains('dark-theme') || !document.body.classList.contains('light-theme');
      const themeLabel = document.getElementById('poly-menu-theme-label');
      if (themeLabel) themeLabel.textContent = (isDark ? 'Tối' : 'Sáng') + ' ›';
    };
  }
}

// Guarantee execution on script load and on DOMContentLoaded
initAuthControls();
checkAuthState();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initAuthControls();
    checkAuthState();
  });
}

window.renderPolyUserProfile = renderPolyUserProfile;
