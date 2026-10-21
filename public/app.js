const API_BASE = 'http://127.0.0.1:51888/api/v1';

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

  toast.innerHTML = `<span class="toast-icon">${iconSvg}</span><span class="toast-message">${message}</span>`;
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
      btnConfirm.className = 'btn btn-danger';
      iconEl.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    } else if (type === 'warning') {
      btnConfirm.className = 'btn btn-primary';
      iconEl.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    } else {
      btnConfirm.className = 'btn btn-primary';
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
    btnConfirm.className = 'btn btn-primary';

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

window.copyText = function(text, event) {
  if (event) event.stopPropagation();
  navigator.clipboard.writeText(text);
  showToast(`Đã sao chép ID: ${text.slice(0, 12)}...`, 'info');
};

function populateKernelSelect(kernels, defaultKernel) {
  if (!formKernel) return;
  formKernel.innerHTML = '';

  const available = kernels.filter(k => k.exists);
  const unavailable = kernels.filter(k => !k.exists);

  if (available.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.text = '⚠️ Chưa tìm thấy Google Chrome hoặc Microsoft Edge trên máy';
    formKernel.appendChild(opt);
    return;
  }

  available.forEach((k) => {
    const opt = document.createElement('option');
    opt.value = k.path;
    opt.text = `⚡ ${k.name} (Sẵn sàng)`;
    if (k.path === defaultKernel || (!defaultKernel && k.isPrimary)) {
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
    opt.text = `⚠️ ${k.name} (Chưa cài đặt)`;
    opt.disabled = true;
    formKernel.appendChild(opt);
  });

  updateProfileSummary();
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
  sidebarPlanName.innerText = `Gói ${info.plan}`;
  sidebarPlanQuota.innerText = `${info.current_profiles}/${info.max_profiles}`;
  sidebarPlanExpires.innerText = info.expires_at ? new Date(info.expires_at).toLocaleDateString() : 'Vô hạn';
  brandLicenseBadge.innerText = info.plan.toUpperCase();
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
      filterGroupSelect.innerHTML = '<option value="">📁 Tất Cả Nhóm</option>' +
        allGroups.map(g => `<option value="${g.id}">${escapeHtml(g.name)} (${g.profile_count || 0})</option>`).join('');
      if (curFilter) filterGroupSelect.value = curFilter;
    }

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
    const color = g.color || '#3867F4';
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
            <button class="btn btn-sm btn-secondary" onclick="editGroup('${g.id}')">Sửa</button>
            <button class="btn btn-sm btn-secondary" style="color: #F87171;" onclick="deleteGroup('${g.id}')">Xóa</button>
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
        <option value="__custom__">⚙️ Nhập thủ công URL Proxy...</option>
      `;
      opts += allProxies.map(p => {
        const flag = p.country ? `[${p.country}] ` : '';
        const pingTxt = p.ping > 0 ? ` - ${p.ping}ms` : '';
        return `<option value="${p.id}">🌐 ${flag}${escapeHtml(p.name)} (${p.type.toUpperCase()} • ${p.host}:${p.port}${pingTxt})</option>`;
      }).join('');
      formProxySelect.innerHTML = opts;
      if (curVal) formProxySelect.value = curVal;
    }

    if (tabProxyHubSelect) {
      const curHub = tabProxyHubSelect.value;
      let hubOpts = allProxies.map(p => {
        const flag = p.country ? `[${p.country}] ` : '';
        const pingTxt = p.ping > 0 ? ` - ${p.ping}ms` : '';
        return `<option value="${p.id}">🌐 ${flag}${escapeHtml(p.name)} (${p.type.toUpperCase()} • ${p.host}:${p.port}${pingTxt})</option>`;
      }).join('');
      tabProxyHubSelect.innerHTML = hubOpts || '<option value="">(Kho trống - chưa có proxy nào)</option>';
      if (curHub) tabProxyHubSelect.value = curHub;
    }

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

    const countryTxt = p.country ? `<span class="badge" style="background:rgba(56,103,244,0.1); color:var(--primary); font-weight:600;">${escapeHtml(p.country)}${p.city ? ` • ${escapeHtml(p.city)}` : ''}</span>` : '<span style="color:var(--text-muted); font-size:11px;">--</span>';
    const authTxt = p.username ? '<span title="Có tài khoản / mật khẩu" style="font-size:12px; margin-left:4px;">🔒</span>' : '';

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
          <div class="actions-cell" style="justify-content: flex-end;">
            <button class="btn btn-sm btn-secondary" onclick="checkProxySingle('${p.id}')">⚡ Test IP</button>
            <button class="btn btn-sm btn-secondary" onclick="editProxy('${p.id}')">Sửa</button>
            <button class="btn btn-sm btn-secondary" style="color:#F87171;" onclick="deleteProxy('${p.id}')">Xóa</button>
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
    renderProfiles();
  } catch (err) {
    console.error('Error fetching profiles:', err);
  }
}

// Selection Set for Batch Actions
const selectedProfileIds = new Set();

function updateBatchToolbar() {
  const countEl = document.getElementById('batch-selected-count');
  if (countEl) countEl.innerText = selectedProfileIds.size;

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

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
          Không có hồ sơ nào phù hợp. Bấm "Tạo Hồ sơ mới" để bắt đầu!
        </td>
      </tr>
    `;
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

    // OS detection & modern SVG
    const osType = fp?.os || 'windows';
    let osSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="#00A4EF"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.9"/></svg>`;
    let osTooltip = 'Windows 11';
    if (osType === 'mac') {
      osSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 1.01-2.87-.96.04-2.16.65-2.84 1.45-.58.68-1.1 1.76-1.01 2.81 1.07.08 2.23-.64 2.84-1.39z"/></svg>`;
      osTooltip = 'macOS Sonoma';
    } else if (osType === 'linux') {
      osSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="#FCC624"><circle cx="12" cy="12" r="10"/><path d="M12 6a3 3 0 0 0-3 3c0 2 1 3 1 5h4s1-3 1-5a3 3 0 0 0-3-3z" fill="#000"/></svg>`;
      osTooltip = 'Linux Ubuntu';
    }

    const kernelVersion = (p.kernel_path && p.kernel_path.includes('153')) || p.kernel_path.includes('Chromium_Workspace') ? '153' : '150';
    const groupColor = p.group_color || '#3867F4';
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
            <div style="font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
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
              <div style="display: flex; align-items: center; gap: 6px; font-size: 10px; color: var(--text-muted);">
                <span style="text-transform: uppercase; font-weight: 700; color: var(--accent);">${p.proxy_type || 'HTTP'}</span>
                ${p.proxy_user ? '<span>• Auth 🔒</span>' : ''}
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
          ${p.isRunning
            ? `<span class="badge badge-running" style="font-size: 11px; padding: 3px 8px;"><span class="badge-pulse"></span> Đang chạy</span>`
            : `<span class="badge badge-stopped" style="font-size: 11px; padding: 3px 8px;">Đã dừng</span>`
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
            ${p.isRunning
              ? `<button class="btn btn-sm btn-danger" style="padding: 5px 14px; font-weight: 600; border-radius: 7px;" onclick="stopProfile('${p.id}')">Đóng</button>`
              : `<button class="btn btn-sm btn-primary" style="padding: 5px 14px; font-weight: 600; border-radius: 7px;" onclick="startProfile('${p.id}')">Mở</button>`
            }
            <button class="btn-icon-action" onclick="exportProfileZip('${p.id}', event)" title="Xuất toàn bộ Profile thành file ZIP (Backup & Restore)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <button class="btn-icon-action" onclick="openCookieModal('${p.id}')" title="Quản lý / Xuất / Nhập Cookie">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/></svg>
            </button>
            <button class="btn-icon-action" onclick="editProfile('${p.id}')" title="Sửa hồ sơ">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon-action danger" onclick="deleteProfile('${p.id}')" title="Xóa hồ sơ">
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
    showToast(`Đang khởi chạy hồ sơ ${id.slice(0, 8)}...`, 'info');
    const res = await fetch(`${API_BASE}/profiles/${id}/start`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast(`Profile đã mở thành công! PID: ${data.pid} | Cổng CDP: ${data.port}`, 'success');
      fetchProfiles();
    } else {
      showToast(`Không mở được: ${data.error}`, 'danger');
    }
  } catch (err) {
    showToast(`Lỗi mở hồ sơ: ${err.message}`, 'danger');
  }
};

window.stopProfile = async function(id) {
  try {
    showToast(`Đang đóng hồ sơ an toàn qua CDP...`, 'info');
    const res = await fetch(`${API_BASE}/profiles/${id}/stop`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast(`Đã đóng êm hồ sơ (Đã lưu toàn bộ cookie)`, 'success');
      fetchProfiles();
    } else {
      showToast(`Lỗi đóng: ${data.error}`, 'danger');
    }
  } catch (err) {
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
  if (modalContentProxy) modalContentProxy.style.display = tab === 'proxy' ? 'block' : 'none';
  if (modalContentFp) modalContentFp.style.display = tab === 'fp' ? 'block' : 'none';
  if (modalContentExt) modalContentExt.style.display = tab === 'ext' ? 'block' : 'none';
}

if (modalTabBasic) modalTabBasic.addEventListener('click', () => setModalTab('basic'));
if (modalTabProxy) modalTabProxy.addEventListener('click', () => setModalTab('proxy'));
if (modalTabFp) modalTabFp.addEventListener('click', () => setModalTab('fp'));
if (modalTabExt) modalTabExt.addEventListener('click', () => setModalTab('ext'));

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
      ? `<span class="badge badge-global">🌐 Toàn cục (Luôn bật)</span>`
      : `<span class="badge badge-targeted">🎯 Riêng lẻ</span>`;

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:10px 14px; border-radius:8px; border:1px solid var(--border-subtle);">
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-size:22px;">${ext.icon_url || '🧩'}</span>
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

const MODERN_USER_AGENTS = {
  windows: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.117 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.101 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.138 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.86 Safari/537.36'
  ],
  mac: [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.117 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.101 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.86 Safari/537.36'
  ],
  linux: [
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.117 Safari/537.36',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.90 Safari/537.36'
  ],
  android: [
    'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.102 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.100 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.127 Mobile Safari/537.36'
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
    sumKernel.innerText = kText.replace('🌐 ', '').split(' (')[0].trim();
  }

  // 2. Hệ điều hành
  const activeOsBtn = document.querySelector('.os-card-btn.active');
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

// Chuyển đổi OS trên Card Buttons kiểu PolyLogin
function setWorkstationOs(os, triggerRandom = false) {
  document.querySelectorAll('.os-card-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.os === os);
  });
  if (fpOs) fpOs.value = os;

  if (os === 'mac') {
    if (fpWebgl) fpWebgl.value = 'apple_m2';
  } else if (os === 'linux') {
    if (fpWebgl && fpWebgl.value === 'apple_m2') fpWebgl.value = 'rtx3060';
  } else {
    if (fpWebgl && fpWebgl.value === 'apple_m2') fpWebgl.value = 'rtx4070';
  }

  if (fpUserAgent) fpUserAgent.value = getRandomUa(os);
  if (fpDeviceName) fpDeviceName.value = generateRandomDeviceName(os);
  if (sumMac) sumMac.innerText = generateRandomMac();

  if (triggerRandom) {
    randomizeFingerprint(os, true);
  }
  updateProfileSummary();
}

document.querySelectorAll('.os-card-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    setWorkstationOs(btn.dataset.os, false);
  });
});

// Chuyển đổi Chế độ Proxy nhanh kiểu PolyLogin
function setQuickProxyMode(mode) {
  document.querySelectorAll('#quick-proxy-pills .quick-pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.proxymode === mode);
  });

  if (mode === 'none') {
    if (quickProxyHubWrap) quickProxyHubWrap.style.display = 'none';
    if (quickProxyCustomWrap) quickProxyCustomWrap.style.display = 'none';
    if (formProxySelect) formProxySelect.value = '';
    if (formProxy) { formProxy.value = ''; formProxy.style.display = 'none'; }
    if (tabProxySource) tabProxySource.value = 'none';
  } else if (mode === 'hub') {
    if (quickProxyHubWrap) quickProxyHubWrap.style.display = 'block';
    if (quickProxyCustomWrap) quickProxyCustomWrap.style.display = 'none';
    if (tabProxySource) tabProxySource.value = 'hub';
    if (formProxySelect && (!formProxySelect.value || formProxySelect.value === '__custom__')) {
      if (allProxies.length > 0) {
        formProxySelect.value = allProxies[0].id;
        if (tabProxyHubSelect) tabProxyHubSelect.value = allProxies[0].id;
      }
    }
  } else if (mode === 'custom') {
    if (quickProxyHubWrap) quickProxyHubWrap.style.display = 'none';
    if (quickProxyCustomWrap) quickProxyCustomWrap.style.display = 'block';
    if (tabProxySource) tabProxySource.value = 'custom';
    if (formProxySelect) formProxySelect.value = '__custom__';
    if (formProxy) {
      formProxy.style.display = 'block';
      formProxy.focus();
    }
  }
  updateProfileSummary();
}

document.querySelectorAll('#quick-proxy-pills .quick-pill-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    setQuickProxyMode(btn.dataset.proxymode);
  });
});

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
}

document.querySelectorAll('#quick-webrtc-pills .quick-pill-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    setQuickWebRtc(btn.dataset.webrtc);
  });
});

async function randomizeFingerprint(selectedOs, silent = false) {
  const os = selectedOs || fpOs?.value || 'windows';
  try {
    const res = await fetch(`${API_BASE}/fingerprints/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ os })
    });
    const data = await res.json();
    if (data.success && data.fingerprint) {
      const fp = data.fingerprint;
      if (fpOs) fpOs.value = fp.os || 'windows';

      // Cập nhật OS card tương ứng
      document.querySelectorAll('.os-card-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.os === (fp.os || 'windows'));
      });

      if (fp.os === 'mac') {
        if (fpWebgl) fpWebgl.value = 'apple_m2';
      } else {
        const pcKeys = ['rtx4070', 'rtx3060', 'rtx3080', 'rx6700', 'iris_xe'];
        if (fpWebgl) fpWebgl.value = pcKeys[Math.floor(Math.random() * pcKeys.length)];
      }

      if (fpCpu) fpCpu.value = String(fp.hardwareConcurrency || 8);
      if (fpRam) fpRam.value = String(fp.deviceMemory || 8);
      if (fp.screen && formResolution) {
        const resStr = `${fp.screen.width}x${fp.screen.height}`;
        if (formResolution.querySelector(`option[value="${resStr}"]`)) {
          formResolution.value = resStr;
        }
      }
      if (fpUserAgent) fpUserAgent.value = fp.userAgent || getRandomUa(fp.os || 'windows');
      if (fpCanvasNoise) fpCanvasNoise.checked = true;
      if (fpAudioNoise) fpAudioNoise.checked = true;
      if (fpDeviceName) fpDeviceName.value = generateRandomDeviceName(fp.os || 'windows');
      if (sumMac) sumMac.innerText = generateRandomMac();

      updateProfileSummary();

      if (!silent) {
        showToast(`🎲 Đã sinh ngẫu nhiên cấu hình vân tay (${(fp.os || 'windows').toUpperCase()} • ${fpCpu ? fpCpu.value : 8}C/${fpRam ? fpRam.value : 8}GB)`, 'info');
      }
    }
  } catch (err) {
    console.error('Error generating fingerprint:', err);
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
    updateProfileSummary();
    showToast('🎲 Đã cập nhật chuỗi User-Agent ngẫu nhiên mới', 'info');
  });
}

if (fpOs) {
  fpOs.addEventListener('change', () => {
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

window.editProfile = function(id) {
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
  } else if (p.proxy_host) {
    setQuickProxyMode('custom');
    const auth = p.proxy_user ? `${p.proxy_user}:${p.proxy_pass}@` : '';
    if (formProxy) formProxy.value = `${p.proxy_type || 'http'}://${auth}${p.proxy_host}:${p.proxy_port}`;
  } else {
    setQuickProxyMode('none');
  }

  if (formStartUrl) formStartUrl.value = p.start_url || 'https://iphey.com';
  if (formResolution) formResolution.value = `${p.screen_width || 1920}x${p.screen_height || 1080}`;
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
    if (fpDeviceName) fpDeviceName.value = fp.deviceName || generateRandomDeviceName(fp.os || 'windows');
  } else {
    randomizeFingerprint('windows', true);
  }

  if (sumMac) sumMac.innerText = generateRandomMac();
  updateProfileSummary();

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
btnCreateModal.addEventListener('click', async () => {
  modal.classList.add('open');
  setModalTab('basic');
  modalTitle.innerText = 'Tạo Hồ Sơ Mới';
  formId.value = '';
  formName.value = '';
  formGroupId.value = '';
  setQuickProxyMode('none');
  if (formStartUrl) formStartUrl.value = 'https://iphey.com';
  if (formResolution) formResolution.value = '1920x1080';
  setQuickWebRtc('fake_ip');
  if (formNotes) formNotes.value = '';
  if (formCookieInput) formCookieInput.value = '';
  if (fpDeviceName) fpDeviceName.value = generateRandomDeviceName('windows');
  if (sumMac) sumMac.innerText = generateRandomMac();
  setWorkstationOs('windows', false);
  await randomizeFingerprint('windows', true);
  renderProfileExtensionsChecklist([]);
  updateProfileSummary();
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
  const activeProxyPill = document.querySelector('#quick-proxy-pills .quick-pill-btn.active');
  const pMode = activeProxyPill ? activeProxyPill.dataset.proxymode : 'none';

  if (pMode === 'custom' || formProxySelect.value === '__custom__') {
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
    showToast(`Đang đóng ${selectedProfileIds.size} hồ sơ...`, 'info');
    for (const id of selectedProfileIds) {
      await stopProfile(id);
    }
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
          return `<option value="${p.id}">🌐 ${flag}${escapeHtml(p.name)} (${p.type.toUpperCase()} • ${p.host}:${p.port})</option>`;
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
    await navigator.clipboard.writeText(val);
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
    const rotInput = document.getElementById('proxy-form-rotation-url');
    if (rotInput) rotInput.value = '';
    proxyFormBulk.value = '';
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
  const rotInput = document.getElementById('proxy-form-rotation-url');
  if (rotInput) rotInput.value = p.rotation_api_url || '';
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
  btnCopyCode.addEventListener('click', () => {
    if (apiCodeSnippet) {
      navigator.clipboard.writeText(apiCodeSnippet.innerText);
      showToast('Đã sao chép mã tự động hóa vào clipboard!', 'success');
    }
  });
}

// -------------------------------------------------------------
// Multi-Window Action Synchronizer & Grid Tiling (Bước 4)
// -------------------------------------------------------------
const syncMasterSelect = document.getElementById('sync-master-select');
const syncSlavesTbody = document.getElementById('sync-slaves-tbody');
const syncSelectAllSlaves = document.getElementById('sync-select-all-slaves');
const btnTileWindows = document.getElementById('btn-tile-windows');
const btnToggleSync = document.getElementById('btn-toggle-sync');
const syncBtnText = document.getElementById('sync-btn-text');
const syncStatMaster = document.getElementById('sync-stat-master');
const syncStatSlaves = document.getElementById('sync-stat-slaves');
const syncStatEvents = document.getElementById('sync-stat-events');
const syncStatStatus = document.getElementById('sync-stat-status');
const syncOptMouse = document.getElementById('sync-opt-mouse');
const syncOptKeyboard = document.getElementById('sync-opt-keyboard');
const syncOptScroll = document.getElementById('sync-opt-scroll');
const syncOptNav = document.getElementById('sync-opt-nav');
const syncOptJitter = document.getElementById('sync-opt-jitter');

let isSyncActive = false;

function renderSyncWorkspace() {
  if (!syncMasterSelect || !syncSlavesTbody) return;

  const running = allProfiles.filter(p => p.isRunning);
  const curMaster = syncMasterSelect.value;

  if (running.length === 0) {
    syncMasterSelect.innerHTML = '<option value="">(Chưa có profile nào mở - Bấm nút bên dưới để mở nhanh)</option>';
    syncSlavesTbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 36px 20px;">
          <div style="font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">
            ⚠️ Chưa có cửa sổ trình duyệt nào đang mở
          </div>
          <p style="font-size: 12px; color: var(--text-muted); max-width: 480px; margin: 0 auto 16px auto; line-height: 1.6;">
            Chức năng Đồng bộ thao tác cần các cửa sổ Chromium thực tế đang mở trên màn hình để truyền phím và chuột từ Master sang Slaves.
          </p>
          <div style="display:flex; justify-content:center; gap: 12px;">
            <button class="btn btn-primary btn-sm" onclick="quickStartTwoProfiles()" style="padding: 8px 16px; font-size: 13px;">
              🚀 Mở Nhanh 2 Cửa Sổ & Sắp Xếp Lưới
            </button>
            <button class="btn btn-secondary btn-sm" onclick="switchTab('profiles')" style="padding: 8px 16px; font-size: 13px;">
              📂 Xem Tab Quản Lý Hồ Sơ
            </button>
          </div>
        </td>
      </tr>
    `;
    if (syncStatMaster) syncStatMaster.innerText = 'Chưa mở profile';
    if (syncStatSlaves) syncStatSlaves.innerText = '0 Cửa sổ';
    return;
  }

  // Populate Master select
  let masterOpts = running.map(p => {
    return `<option value="${p.id}">${escapeHtml(p.name)} (${p.id.slice(0, 8)})</option>`;
  }).join('');
  syncMasterSelect.innerHTML = masterOpts;

  // Preserve previous selection if still running
  if (curMaster && running.some(p => p.id === curMaster)) {
    syncMasterSelect.value = curMaster;
  }

  const selectedMasterId = syncMasterSelect.value;
  const masterProfile = running.find(p => p.id === selectedMasterId);
  if (syncStatMaster) {
    syncStatMaster.innerText = masterProfile ? masterProfile.name : 'Chưa chọn';
  }

  // Slaves are all running profiles except master
  const slaves = running.filter(p => p.id !== selectedMasterId);

  if (slaves.length === 0) {
    syncSlavesTbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 28px 16px;">
          <div style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">
            ⚠️ Bạn mới mở 1 profile (đã chọn làm Master)
          </div>
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 14px;">
            Tính năng Đồng bộ cần ít nhất 1 cửa sổ Slave theo sau để copy thao tác chuột và phím.
          </p>
          <button class="btn btn-primary btn-sm" onclick="quickStartOneMoreSlave()" style="padding: 8px 16px; font-size: 12px;">
            ➕ Bấm vào đây để mở thêm 1 cửa sổ Slave ngay
          </button>
        </td>
      </tr>
    `;
    if (syncStatSlaves) syncStatSlaves.innerText = '0 Cửa sổ';
    return;
  }

  syncSlavesTbody.innerHTML = slaves.map(p => {
    const groupTxt = p.group_name
      ? `<span class="badge" style="background:${p.group_color || '#3867F4'}20; color:${p.group_color || '#3867F4'}; font-size:11px;">${escapeHtml(p.group_name)}</span>`
      : `<span style="color:var(--text-muted); font-size:11px;">Mặc định</span>`;

    return `
      <tr>
        <td style="text-align: center;">
          <input type="checkbox" class="sync-slave-cb" value="${p.id}" checked style="width:16px; height:16px; accent-color: var(--primary); cursor: pointer;">
        </td>
        <td>
          <span style="font-weight:600; font-size:13px; color:var(--text-main);">${escapeHtml(p.name)}</span>
        </td>
        <td>
          <span style="font-family:monospace; font-size:11px; color:var(--text-muted);">${p.id.slice(0, 13)}...</span>
        </td>
        <td>${groupTxt}</td>
      </tr>
    `;
  }).join('');

  if (syncStatSlaves && !isSyncActive) {
    syncStatSlaves.innerText = `${slaves.length} Cửa sổ`;
  }
}

async function fetchSyncStatus() {
  try {
    const res = await fetch(`${API_BASE}/sync/status`);
    const data = await res.json();
    if (!data.success) return;

    isSyncActive = data.isSyncing;

    if (syncStatEvents) {
      syncStatEvents.innerText = `${data.metrics?.eventsSent || 0} sự kiện`;
    }

    if (isSyncActive) {
      if (syncBtnText) syncBtnText.innerText = 'Dừng Đồng Bộ';
      if (btnToggleSync) {
        btnToggleSync.className = 'btn btn-danger btn-sm';
      }
      if (syncStatStatus) {
        syncStatStatus.innerHTML = '<span class="badge badge-running"><span class="badge-pulse"></span> ĐANG ĐỒNG BỘ LIVE</span>';
      }
      if (syncStatSlaves) {
        syncStatSlaves.innerText = `${data.activeSlavesCount} Cửa sổ`;
      }
      if (data.masterProfileId && syncStatMaster) {
        const m = allProfiles.find(p => p.id === data.masterProfileId);
        syncStatMaster.innerText = m ? m.name : data.masterProfileId.slice(0, 8);
      }
    } else {
      if (syncBtnText) syncBtnText.innerText = 'Bắt đầu Đồng Bộ';
      if (btnToggleSync) {
        btnToggleSync.className = 'btn btn-primary btn-sm';
      }
      if (syncStatStatus) {
        syncStatStatus.innerHTML = '<span class="badge" style="background:rgba(156,163,175,0.15); color:var(--text-muted);">Đang dừng</span>';
      }
    }
  } catch (err) {
    // ignore
  }
}

async function toggleSync() {
  if (isSyncActive) {
    try {
      showToast('Đang dừng phiên đồng bộ...', 'info');
      const res = await fetch(`${API_BASE}/sync/stop`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        isSyncActive = false;
        showToast('Đã dừng phiên đồng bộ thao tác', 'info');
        fetchSyncStatus();
      }
    } catch (err) {
      showToast(`Lỗi dừng đồng bộ: ${err.message}`, 'danger');
    }
  } else {
    const masterId = syncMasterSelect ? syncMasterSelect.value : '';
    if (!masterId) {
      await showCustomAlert({
        title: 'Chưa chọn Master',
        message: 'Vui lòng mở ít nhất <strong>2 profile</strong> và chọn 1 profile làm <strong>Master điều khiển</strong>.',
        type: 'warning'
      });
      return;
    }

    const checkedSlaves = Array.from(document.querySelectorAll('.sync-slave-cb:checked')).map(cb => cb.value);
    if (checkedSlaves.length === 0) {
      await showCustomAlert({
        title: 'Chưa chọn Slave',
        message: 'Vui lòng chọn ít nhất <strong>1 Profile Slave</strong> để nhận thao tác đồng bộ.',
        type: 'warning'
      });
      return;
    }

    const payload = {
      masterId,
      slaveIds: checkedSlaves,
      options: {
        syncMouse: syncOptMouse?.checked ?? true,
        syncKeyboard: syncOptKeyboard?.checked ?? true,
        syncScroll: syncOptScroll?.checked ?? true,
        syncNav: syncOptNav?.checked ?? true,
        humanDelay: syncOptJitter?.checked ?? true,
      }
    };

    try {
      showToast(`Đang kết nối đồng bộ tới Master và ${checkedSlaves.length} Slaves...`, 'info');
      const res = await fetch(`${API_BASE}/sync/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      isSyncActive = true;
      showToast(`🚀 ĐÃ BẬT ĐỒNG BỘ THỜI GIAN THỰC! Mọi click, gõ phím trên Master sẽ truyền sang Slaves.`, 'success');
      fetchSyncStatus();
    } catch (err) {
      showToast(`Không thể bắt đầu đồng bộ: ${err.message}`, 'danger');
    }
  }
}

async function tileWindows(layout = 'auto') {
  const running = allProfiles.filter(p => p.isRunning);
  if (running.length === 0) {
    showToast('Chưa có profile nào đang chạy để sắp xếp lưới', 'danger');
    return;
  }

  try {
    const screenWidth = window.screen.availWidth || 1920;
    const screenHeight = window.screen.availHeight || 1040;

    showToast(`Đang sắp xếp ${running.length} cửa sổ theo bố cục ${layout.toUpperCase()}...`, 'info');
    const res = await fetch(`${API_BASE}/sync/tile-grid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layout, screenWidth, screenHeight })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    showToast(`📐 Đã căn chỉnh ${data.count} cửa sổ theo lưới ${data.grid.cols}x${data.grid.rows} (${data.grid.width}x${data.grid.height}px)!`, 'success');
  } catch (err) {
    showToast(`Lỗi sắp xếp lưới: ${err.message}`, 'danger');
  }
}

window.quickStartTwoProfiles = async function() {
  if (allProfiles.length < 2) {
    showToast('Cần ít nhất 2 profile trong danh sách để đồng bộ. Vui lòng tạo thêm profile!', 'danger');
    return;
  }
  const targetProfiles = allProfiles.slice(0, 2);
  showToast(`Đang mở 2 profile: "${targetProfiles[0].name}" và "${targetProfiles[1].name}"...`, 'info');
  for (const p of targetProfiles) {
    await fetch(`${API_BASE}/profiles/${p.id}/start`, { method: 'POST' });
  }
  await fetchProfiles();
  showToast('Đang xếp 2 cửa sổ chia đôi màn hình (2x1)...', 'info');
  setTimeout(async () => {
    await tileWindows('2x1');
    setTimeout(async () => {
      try {
        const payload = {
          masterId: targetProfiles[0].id,
          slaveIds: [targetProfiles[1].id],
          options: {
            syncMouse: true,
            syncKeyboard: true,
            syncScroll: true,
            syncNav: true,
            humanDelay: true,
          }
        };
        const syncRes = await fetch(`${API_BASE}/sync/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const syncData = await syncRes.json();
        if (syncData.success) {
          isSyncActive = true;
          fetchSyncStatus();
          renderSyncWorkspace();
          showToast(`🚀 ĐỒNG BỘ ĐÃ KÍCH HOẠT! Cửa sổ bên TRÁI là Master (Điều khiển). Cửa sổ bên PHẢI là Slave. Mọi click, gõ phím, mở tab ở cửa sổ bên TRÁI sẽ truyền sang PHẢI!`, 'success');
        }
      } catch (e) {
        console.warn('Auto sync start error:', e);
      }
    }, 1000);
  }, 1500);
};

window.quickStartOneMoreSlave = async function() {
  const stoppedProfiles = allProfiles.filter(p => !p.isRunning);
  if (stoppedProfiles.length === 0) {
    showToast('Tất cả profile trong hệ thống đã được mở!', 'info');
    return;
  }
  const nextProfile = stoppedProfiles[0];
  showToast(`Đang mở thêm profile "${nextProfile.name}" làm Slave...`, 'info');
  await fetch(`${API_BASE}/profiles/${nextProfile.id}/start`, { method: 'POST' });
  await fetchProfiles();
  showToast(`Đã mở thành công profile "${nextProfile.name}" làm Slave!`, 'success');
};

if (btnToggleSync) {
  btnToggleSync.addEventListener('click', toggleSync);
}

if (btnTileWindows) {
  btnTileWindows.addEventListener('click', () => tileWindows('auto'));
}

document.querySelectorAll('.sync-tile-btn').forEach(btn => {
  btn.addEventListener('click', () => tileWindows(btn.dataset.layout));
});

if (syncMasterSelect) {
  syncMasterSelect.addEventListener('change', () => {
    const masterP = allProfiles.find(p => p.id === syncMasterSelect.value);
    if (syncStatMaster && masterP) syncStatMaster.innerText = masterP.name;
    renderSyncWorkspace();
  });
}

if (syncSelectAllSlaves) {
  syncSelectAllSlaves.addEventListener('change', () => {
    document.querySelectorAll('.sync-slave-cb').forEach(cb => {
      cb.checked = syncSelectAllSlaves.checked;
    });
  });
}

// Navigation Tabs
const views = {
  profiles: { el: document.getElementById('view-profiles'), title: 'Quản lý Hồ sơ Trình duyệt', sub: 'Hệ thống Antidetect & Profile độc lập chuyên sâu với nhân Chromium tùy biến' },
  groups: { el: document.getElementById('view-groups'), title: 'Nhóm Hồ Sơ (Profile Groups)', sub: 'Phân loại hồ sơ theo chiến dịch, dự án và nền tảng MMO' },
  proxies: { el: document.getElementById('view-proxies'), title: 'Danh Sách Proxy & Kiểm Tra IP', sub: 'Quản lý kho proxy tĩnh HTTP/HTTPS/SOCKS5 với kiểm tra Live Ping' },
  extensions: { el: document.getElementById('view-extensions'), title: 'Kho Tiện Ích Mở Rộng (Chrome Extensions)', sub: 'Quản lý các tiện ích MMO, Facebook, TikTok và nạp tự động vào Profile' },
  sync: { el: document.getElementById('view-sync'), title: 'Đồng Bộ Thao Tác Chuột & Phím', sub: 'Truyền tín hiệu bàn phím và chuột thời gian thực từ Master sang Slave qua CDP' },
  license: { el: document.getElementById('view-license'), title: 'Bản Quyền & Nâng Cấp Gói', sub: 'Tích hợp bảo mật bản quyền CGT-License Engine • lic.cgtdev.space' },
  api: { el: document.getElementById('view-api'), title: 'REST API & Automation Protocol', sub: 'Tự động hóa hoàn toàn với Puppeteer, Playwright, Python và MCP' },
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
      renderSyncWorkspace();
      fetchSyncStatus();
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
      ? `<span class="badge-global" onclick="toggleGlobalExtension('${ext.id}')" title="Nhấp để chuyển thành tiện ích Riêng lẻ">🌐 Toàn cục (Tất cả Profile)</span>`
      : `<span class="badge-targeted" onclick="toggleGlobalExtension('${ext.id}')" title="Nhấp để chuyển thành tiện ích Toàn cục">🎯 Riêng lẻ (Tùy chọn)</span>`;

    return `
      <div class="extension-card">
        <div class="ext-card-header">
          <div class="ext-icon-box">${ext.icon_url || '🧩'}</div>
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

        <div class="ext-card-footer">
          <label class="switch-label">
            <input type="checkbox" class="switch-input" ${isEnabled ? 'checked' : ''} onchange="toggleExtension('${ext.id}')">
            <span>${isEnabled ? 'Đang bật' : 'Đã tắt'}</span>
          </label>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-secondary btn-sm" style="color: #F87171; padding: 4px 10px; font-size: 11px;" onclick="deleteExtension('${ext.id}')" title="Xóa tiện ích khỏi hệ thống">
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
      showToast('Vui lòng dán trực tiếp đường dẫn thư mục vào ô bên dưới', 'info');
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

document.getElementById('sidebar-btn-upgrade').addEventListener('click', () => {
  switchTab('license');
});

// License Pricing & Slider Logic
const profileSlider = document.getElementById('profile-slider');
const sliderProfileCount = document.getElementById('slider-profile-count');
const priceTotal = document.getElementById('price-total');
let currentDiscount = 0;

function calculatePrice() {
  const count = parseInt(profileSlider.value, 10);
  sliderProfileCount.innerText = count;
  const basePricePerProfile = 2500; // 2.500đ / profile / tháng (giống PolyLogin)
  const rawTotal = count * basePricePerProfile;
  const discounted = rawTotal * (1 - currentDiscount / 100);
  priceTotal.innerText = `${Math.round(discounted).toLocaleString('vi-VN')}đ / tháng`;
}

profileSlider.addEventListener('input', calculatePrice);

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
    document.getElementById('subtab-packages-content').style.display = sub === 'packages' ? 'block' : 'none';
    document.getElementById('subtab-activate-content').style.display = sub === 'activate' ? 'block' : 'none';
    document.getElementById('subtab-device-content').style.display = sub === 'device' ? 'block' : 'none';
  });
});

document.getElementById('btn-switch-activate').addEventListener('click', () => {
  document.querySelector('.plan-tab[data-subtab="activate"]').click();
});

// License Key Submit
document.getElementById('btn-submit-license').addEventListener('click', async () => {
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
      document.querySelector('.plan-tab[data-subtab="device"]').click();
    } else {
      showToast(`Kích hoạt thất bại: ${data.error}`, 'danger');
    }
  } catch (err) {
    showToast(`Lỗi kích hoạt: ${err.message}`, 'danger');
  }
});

// Copy HWID
document.getElementById('btn-copy-hwid').addEventListener('click', () => {
  const hwid = document.getElementById('license-hwid-text').innerText;
  navigator.clipboard.writeText(hwid);
  showToast('Đã sao chép mã HWID vào bộ nhớ tạm', 'success');
});

// Auto-refresh loop every 1.2 seconds to keep running status live
setInterval(() => {
  fetchProfiles();
  fetchSyncStatus();
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
}

if (btnKernelCenter) btnKernelCenter.addEventListener('click', openKernelModal);
if (sidebarKernelCard) sidebarKernelCard.addEventListener('click', openKernelModal);
if (kernelModalClose) kernelModalClose.addEventListener('click', closeKernelModal);
if (kernelModalCancel) kernelModalCancel.addEventListener('click', closeKernelModal);

if (btnOpenKernelFolder) {
  btnOpenKernelFolder.addEventListener('click', async () => {
    const pathTextEl = document.getElementById('kernel-modal-path-text');
    let p = pathTextEl ? pathTextEl.innerText.trim() : '';
    if (!p || p === '--') p = 'bin/chromium/chrome.exe';

    // 1. If running inside Electron desktop app, use native shell API (bypasses Windows foreground lock)
    if (window.electronAPI && typeof window.electronAPI.showItemInFolder === 'function') {
      window.electronAPI.showItemInFolder(p);
      showToast('📂 Đã mở Windows Explorer và làm nổi bật chrome.exe!', 'success');
      // Also notify backend in background
      fetch(`${API_BASE}/kernel/open-folder`, { method: 'POST' }).catch(() => {});
      return;
    }

    // 2. Fallback when opened in web browser
    showToast('Đang mở thư mục chứa Kernel trong File Explorer...', 'info');
    try {
      const res = await fetch(`${API_BASE}/kernel/open-folder`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`📂 Đã mở thư mục: ${data.path}`, 'success');
      } else {
        showToast(`Không mở được: ${data.error}`, 'danger');
      }
    } catch (err) {
      showToast(`Lỗi mở thư mục: ${err.message}`, 'danger');
    }
  });
}

if (btnCopyKernelPath) {
  btnCopyKernelPath.addEventListener('click', () => {
    const pathTextEl = document.getElementById('kernel-modal-path-text');
    const p = pathTextEl ? pathTextEl.innerText.trim() : '';
    if (p && p !== '--') {
      navigator.clipboard.writeText(p);
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
      if (statusTextEl) statusTextEl.innerText = 'Đã cài đặt MyBrowser 153 Core (Portable)';
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
        btnStartAutoKernel.className = 'btn btn-secondary';
      }
      if (kernelLabel) kernelLabel.innerText = 'MyBrowser 153 (Sẵn sàng)';
      if (sidebarKernelDot) {
        sidebarKernelDot.style.background = '#10B981';
        sidebarKernelDot.style.boxShadow = '0 0 8px #10B981';
      }
      if (btnKernelLabel) btnKernelLabel.innerText = 'Kernel 153: Sẵn Sàng';
      if (btnKernelCenter) {
        btnKernelCenter.style.color = '#10B981';
        btnKernelCenter.style.background = 'rgba(16, 185, 129, 0.12)';
        btnKernelCenter.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      }
    } else {
      if (statusTextEl) statusTextEl.innerText = 'Chưa cài đặt MyBrowser 153 Core';
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
        btnStartAutoKernel.className = 'btn btn-primary';
      }
      if (kernelLabel) kernelLabel.innerText = 'Chưa cài MyBrowser 153';
      if (sidebarKernelDot) {
        sidebarKernelDot.style.background = '#F59E0B';
        sidebarKernelDot.style.boxShadow = '0 0 8px #F59E0B';
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
        progressTitle.innerText = task.status === 'extracting' ? '⚙️ Đang xả nén siêu tốc vào bin/chromium/...' : '⏳ Đang tải gói Chromium 153 (~245MB)...';
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
        if (isDownloadingKernel) {
          isDownloadingKernel = false;
          showToast('🎉 Tải và cài đặt Chromium Kernel 153 thành công vào bin/chromium!', 'success');
        }
        if (kernelSuccessBox) kernelSuccessBox.style.display = 'block';
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
    const startUrl = document.getElementById('bulk-form-start-url').value.trim() || 'https://iphey.com';
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
fetchSyncStatus();
calculatePrice();

