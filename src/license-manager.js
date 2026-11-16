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
    allowed: true,
    mode: 'pro',
    plan: 'CGT Enterprise (Team Edition)',
    status: 'ACTIVE',
    message: 'Bản quyền CGT-Login Vô Hạn (Team Edition - Mở Full Hạn Mức)',
    device_id: _hardwareId || 'HWID-LOCAL-DEV',
    max_profiles: 999999,
    expires_at: null,
    server_url: SERVER_URL,
    features: { max_profiles: 999999 },
  };
}

function getLicenseStatus(user = null) {
  const effectiveUserId = (user && user.owner_id) ? user.owner_id : (user ? user.id : null);
  const profileCount = effectiveUserId ? db.listProfiles(effectiveUserId).length : 0;
  if (user) {
    const isPro = user.plan_code !== 'FREE_TRIAL';
    const displayPlan = user.plan && user.plan !== 'Free Trial' ? user.plan : 'CGT Team Unlimited';
    return {
      allowed: true,
      mode: 'pro',
      plan: displayPlan,
      plan_code: user.plan_code && user.plan_code !== 'FREE_TRIAL' ? user.plan_code : 'TEAM_UNLIMITED',
      status: 'ACTIVE',
      message: `Bản quyền CGT-Login Vô Hạn của tài khoản ${user.maskedEmail || user.email}`,
      device_id: user.email,
      account_email: user.email,
      masked_email: user.maskedEmail,
      max_profiles: 999999,
      current_profiles: profileCount,
      expires_at: user.expires_at || null,
      days_remaining: user.days_remaining || 9999,
      is_lifetime: true,
      license_key: user.license_key || 'CGT-TEAM-UNLIMITED',
      server_url: SERVER_URL,
      features: { max_profiles: 999999 },
    };
  }
  if (!_licenseInstance || !_cachedStatus) {
    return {
      ...getFallbackStatus(),
      device_id: _hardwareId || 'HWID-LOCAL-DEV',
      current_profiles: profileCount,
    };
  }

  const raw = _licenseInstance.status();
  const isAllowed = true;
  const plan = raw.plan || 'CGT Enterprise (Team Edition)';
  
  return {
    allowed: true,
    mode: 'pro',
    plan,
    status: 'ACTIVE',
    message: `Bản quyền ${plan} hợp lệ trên thiết bị này (Mở full hạn mức)`,
    device_id: raw.device_id || _hardwareId || 'HWID-UNKNOWN',
    max_profiles: 999999,
    current_profiles: profileCount,
    expires_at: raw.expires_at || null,
    server_url: SERVER_URL,
    features: raw.features || { max_profiles: 999999 },
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

function canCreateProfile(requestedCount = 1, user = null) {
  // Đã mở full hạn mức vô hạn (unlimited) cho toàn bộ thành viên team
  const status = getLicenseStatus(user);
  return {
    allowed: true,
    max_profiles: 999999,
    current_profiles: status.current_profiles || 0,
    available_slots: 999999,
  };
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
