const path = require('node:path');
const fs = require('node:fs');
const db = require('./db');

const SDK_PATH = 'E:/License-CGT/client-sdk/javascript/src/index.mjs';
const SERVER_URL = 'https://lic.cgtdev.space';
const PRODUCT_CODE = 'ANTIDETECT';

let _licenseInstance = null;
let _cachedStatus = null;

// Khởi tạo License SDK
async function initLicense() {
  try {
    if (!fs.existsSync('E:/License-CGT/client-sdk/javascript/src/index.mjs')) {
      console.warn('[License] License-CGT SDK not found at E:/License-CGT, running in Free mode');
      return getFallbackStatus();
    }

    const { License } = await import('file:///E:/License-CGT/client-sdk/javascript/src/index.mjs');
    _licenseInstance = new License({
      product: PRODUCT_CODE,
      serverUrl: SERVER_URL,
      storageDir: path.join(__dirname, '..', 'data', 'license')
    });

    _cachedStatus = await _licenseInstance.init();
    console.log('[License] Initialized with status:', _cachedStatus.status, 'Device ID:', _cachedStatus.device_id);
    return getLicenseStatus();
  } catch (err) {
    console.error('[License] Init error:', err.message);
    return getFallbackStatus();
  }
}

function getFallbackStatus() {
  return {
    allowed: false,
    mode: 'free',
    plan: 'Trial Dev',
    status: 'TRIAL_PLAN',
    message: 'Phiên bản thử nghiệm (Tối đa 50 hồ sơ)',
    device_id: 'HWID-LOCAL-DEV',
    max_profiles: 50,
    expires_at: null,
    server_url: SERVER_URL,
  };
}

function getLicenseStatus() {
  const profileCount = db.listProfiles().length;
  
  if (!_licenseInstance || !_cachedStatus) {
    return {
      ...getFallbackStatus(),
      current_profiles: profileCount,
    };
  }

  const raw = _licenseInstance.status();
  const isAllowed = raw.allowed === true;
  const plan = isAllowed ? (raw.plan || 'Pro Plus') : 'Trial Dev';
  const maxProfiles = isAllowed ? (raw.features?.max_profiles || 1000) : 50;

  return {
    allowed: isAllowed,
    mode: isAllowed ? 'pro' : 'free',
    plan,
    status: raw.status || 'ACTIVATION_REQUIRED',
    message: isAllowed ? `Bản quyền ${plan} hợp lệ` : 'Phiên bản miễn phí (Tối đa 5 hồ sơ)',
    device_id: raw.device_id || 'HWID-UNKNOWN',
    max_profiles: maxProfiles,
    current_profiles: profileCount,
    expires_at: raw.expires_at || null,
    server_url: SERVER_URL,
    features: raw.features || {},
  };
}

async function activateLicense(licenseKey) {
  if (!licenseKey || !licenseKey.trim()) {
    throw new Error('Vui lòng nhập License Key hợp lệ');
  }

  if (!_licenseInstance) {
    await initLicense();
  }

  if (!_licenseInstance) {
    throw new Error('Không thể kết nối với hệ thống License');
  }

  const res = await _licenseInstance.activate(licenseKey.trim());
  _cachedStatus = res;
  return getLicenseStatus();
}

async function deactivateLicense() {
  if (_licenseInstance) {
    await _licenseInstance.deactivate();
    _cachedStatus = _licenseInstance.status();
  }
  return getLicenseStatus();
}

function canCreateProfile() {
  const status = getLicenseStatus();
  const currentCount = status.current_profiles;
  if (currentCount >= status.max_profiles) {
    return {
      allowed: false,
      reason: `Bạn đã đạt giới hạn tối đa ${status.max_profiles} hồ sơ của gói ${status.plan}. Vui lòng nâng cấp gói hoặc kích hoạt License để tạo thêm.`,
      max_profiles: status.max_profiles,
      current_profiles: currentCount,
    };
  }
  return { allowed: true };
}

module.exports = {
  initLicense,
  getLicenseStatus,
  activateLicense,
  deactivateLicense,
  canCreateProfile,
  SERVER_URL,
};
