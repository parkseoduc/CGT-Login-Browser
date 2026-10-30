const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const db = require('./db');

const SERVER_URL = 'https://lic.cgtdev.space';
const PRODUCT_CODE = 'ANTIDETECT';

let _licenseInstance = null;
let _cachedStatus = null;
let _hardwareId = null;

function resolveSdkPath() {
  const localSdk = path.join(__dirname, 'license-sdk', 'src', 'index.mjs');
  if (fs.existsSync(localSdk)) {
    return pathToFileURL(localSdk).href;
  }
  const externalSdk = 'E:/License-CGT/client-sdk/javascript/src/index.mjs';
  if (fs.existsSync(externalSdk)) {
    return pathToFileURL(externalSdk).href;
  }
  return null;
}

function resolveCryptoPath() {
  const localCrypto = path.join(__dirname, 'license-sdk', 'src', 'crypto.mjs');
  if (fs.existsSync(localCrypto)) {
    return pathToFileURL(localCrypto).href;
  }
  const externalCrypto = 'E:/License-CGT/client-sdk/javascript/src/crypto.mjs';
  if (fs.existsSync(externalCrypto)) {
    return pathToFileURL(externalCrypto).href;
  }
  return null;
}

async function getOrComputeHwid() {
  if (_hardwareId) return _hardwareId;
  try {
    const cryptoUrl = resolveCryptoPath();
    if (cryptoUrl) {
      const { getHardwareId } = await import(cryptoUrl);
      if (typeof getHardwareId === 'function') {
        _hardwareId = getHardwareId();
        return _hardwareId;
      }
    }
  } catch (err) {
    console.warn('[License] Could not compute real HWID via crypto module:', err.message);
  }
  _hardwareId = 'HWID-LOCAL-MACHINE';
  return _hardwareId;
}

// Khởi tạo License SDK
async function initLicense() {
  try {
    const sdkUrl = resolveSdkPath();
    if (!sdkUrl) {
      console.warn('[License] License-CGT SDK not found, running in Free mode');
      return getFallbackStatus();
    }

    const { License } = await import(sdkUrl);
    const storageDir = path.join(__dirname, '..', 'data', 'license');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    _licenseInstance = new License({
      product: PRODUCT_CODE,
      serverUrl: SERVER_URL,
      storageDir
    });

    _cachedStatus = await _licenseInstance.init();
    if (_cachedStatus && _cachedStatus.device_id) {
      _hardwareId = _cachedStatus.device_id;
    }
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
    message: 'Phiên bản thử nghiệm (Tối đa 50 hồ sơ). Nhập License Key để kích hoạt thiết bị lên máy chủ.',
    device_id: _hardwareId || 'HWID-LOCAL-DEV',
    max_profiles: 50,
    expires_at: null,
    server_url: SERVER_URL,
    features: {},
  };
}

function getLicenseStatus() {
  const profileCount = db.listProfiles().length;
  
  if (!_licenseInstance || !_cachedStatus) {
    return {
      ...getFallbackStatus(),
      device_id: _hardwareId || 'HWID-LOCAL-DEV',
      current_profiles: profileCount,
    };
  }

  const raw = _licenseInstance.status();
  const isAllowed = raw.allowed === true;
  const plan = isAllowed ? (raw.plan || 'Pro Plus') : 'Trial Dev';
  
  // Trích xuất hạn mức profile từ features nếu có
  let maxProfiles = 50;
  if (isAllowed) {
    maxProfiles = 1000;
    if (Array.isArray(raw.features)) {
      const feat = raw.features.find(f => f.code === 'MAX_PROFILES');
      if (feat && feat.value) maxProfiles = Number(feat.value);
    } else if (raw.features?.max_profiles) {
      maxProfiles = Number(raw.features.max_profiles);
    }
  }

  return {
    allowed: isAllowed,
    mode: isAllowed ? 'pro' : 'free',
    plan,
    status: raw.status || 'ACTIVATION_REQUIRED',
    message: isAllowed ? `Bản quyền ${plan} hợp lệ trên thiết bị này` : 'Chưa kích hoạt bản quyền (Tối đa 50 hồ sơ thử nghiệm)',
    device_id: raw.device_id || _hardwareId || 'HWID-UNKNOWN',
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

function canCreateProfile(requestedCount = 1) {
  const status = getLicenseStatus();
  const currentCount = status.current_profiles;
  if (currentCount + requestedCount > status.max_profiles) {
    const available = Math.max(0, status.max_profiles - currentCount);
    return {
      allowed: false,
      reason: `Bạn đã đạt giới hạn tối đa ${status.max_profiles} hồ sơ của gói ${status.plan}. Yêu cầu tạo ${requestedCount} hồ sơ nhưng hiện chỉ còn trống ${available} vị trí. Vui lòng nâng cấp gói để tạo thêm.`,
      max_profiles: status.max_profiles,
      current_profiles: currentCount,
      available_slots: available,
    };
  }
  return { allowed: true };
}

// Tự động tính toán HWID trước
getOrComputeHwid();

module.exports = {
  initLicense,
  getLicenseStatus,
  activateLicense,
  deactivateLicense,
  canCreateProfile,
  SERVER_URL,
};
