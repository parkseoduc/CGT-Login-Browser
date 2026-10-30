import { randomBytes } from 'node:crypto';
import os from 'node:os';
import {
  getHardwareId,
  keyDigest,
  verifyEnvelope,
  LicenseSecurityError
} from './crypto.mjs';
import { SecureLicenseStorage } from './storage.mjs';

function deny(code, message) {
  throw new LicenseSecurityError(code, message);
}

export class LicenseClient {
  constructor({
    productCode,
    productId = null,
    serverUrl = 'https://lic.cgtdev.space',
    publicKey = null,
    keyId = null,
    appVersion = '1.0.0',
    storageDir = null,
    deviceId = null,
    transport = fetch,
    clock = () => Date.now()
  }) {
    this.productCode = productCode;
    this.productId = productId;
    this.serverUrl = serverUrl.replace(/\/+$/, '');
    this.publicKey = publicKey;
    this.keyId = keyId;
    this.appVersion = appVersion;
    this.deviceId = deviceId || getHardwareId();
    this.deviceName = os.hostname();
    this.os = os.platform();
    this.transport = transport;
    this.clock = clock;

    this.storage = new SecureLicenseStorage(productCode, storageDir);
    this.bootWall = clock();
    this.bootMono = performance.now();

    this.state = null;
    this.licenseKey = '';
    this.offline = false;
    this.lastError = '';
    this._heartbeatTimer = null;
  }

  async fetchServerConfig() {
    try {
      const url = `${this.serverUrl}/api/client/config?product=${encodeURIComponent(this.productCode)}`;
      const resp = await this.transport(url, {
        method: 'GET',
        headers: {
          'User-Agent': `@tumy/license (Node ${process.version}; ${this.os})`,
          Accept: 'application/json'
        },
        signal: AbortSignal.timeout(5000)
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.public_key) this.publicKey = data.public_key;
        if (data.key_id) this.keyId = data.key_id;
        return data;
      }
    } catch {
      // Bỏ qua lỗi kết nối máy chủ khi ngoại tuyến
    }
    return null;
  }

  async load() {
    this.offline = true;
    try {
      const cached = this.storage.load();
      if (cached && cached.envelope) {
        this.state = cached;
        this.licenseKey = cached.license_key || '';
      } else {
        this.state = null;
      }
    } catch {
      this.state = null;
    }
    return this.status();
  }

  check() {
    const wall = this.clock();
    const now = Math.max(wall, this.bootWall + performance.now() - this.bootMono);

    if (!this.state?.envelope) {
      deny('ACTIVATION_REQUIRED', 'Ứng dụng cần kích hoạt bản quyền trước khi sử dụng.');
    }

    if (this.state.suspended) {
      deny('LICENSE_SUSPENDED', 'Bản quyền đã bị TẠM KHÓA bởi Quản trị viên.');
    }

    // Kiểm tra lùi giờ máy tính
    const lastWall = this.state.last_wall || 0;
    if (wall < lastWall - 60000) {
      deny('CLOCK_ROLLBACK', 'Phát hiện đồng hồ máy tính bị lùi lại. Vui lòng kết nối mạng để đồng bộ.');
    }

    if (!this.publicKey) {
      // Cần có public key để kiểm tra
    }

    const payload = verifyEnvelope(this.state.envelope, {
      publicKey: this.publicKey,
      keyId: this.keyId,
      productId: this.productId,
      productCode: this.productCode,
      deviceId: this.deviceId,
      now,
      cached: true
    });

    if (!payload.valid) {
      deny(payload.status || 'LICENSE_INVALID', 'Bản quyền không còn quyền sử dụng.');
    }

    if (payload.expires_at && now >= Date.parse(payload.expires_at)) {
      deny('LICENSE_EXPIRED', 'Bản quyền đã hết hạn. Hãy gia hạn gói để tiếp tục.');
    }

    if (now >= Date.parse(payload.offline_valid_until)) {
      deny('OFFLINE_EXPIRED', 'Hạn sử dụng ngoại tuyến đã hết (24h). Hãy kết nối mạng để tiếp tục.');
    }

    return payload;
  }

  status() {
    try {
      const p = this.check();
      return {
        allowed: true,
        mode: this.offline ? 'offline' : 'online',
        status: p.status,
        expires_at: p.expires_at,
        offline_valid_until: p.offline_valid_until,
        features: p.features,
        device_id: this.deviceId,
        notice: this.lastError
      };
    } catch (e) {
      return {
        allowed: false,
        mode: 'locked',
        status: e.code || 'CLIENT_ERROR',
        message: e.message,
        device_id: this.deviceId
      };
    }
  }

  async checkpoint() {
    if (this.state) {
      this.storage.checkpoint(this.clock());
    }
    return this.status();
  }

  async request(action, key = '', timeoutMs = 8000) {
    if (!['activate', 'validate', 'heartbeat', 'deactivate'].includes(action)) {
      deny('INVALID_ACTION', 'Thao tác yêu cầu không hợp lệ.');
    }

    const trimmedKey = (key || this.licenseKey || '').trim();
    if (!trimmedKey && action === 'activate') {
      deny('KEY_REQUIRED', 'Vui lòng nhập mã bản quyền (license key).');
    }
    if (trimmedKey) {
      this.licenseKey = trimmedKey;
    }

    if (!this.publicKey) {
      await this.fetchServerConfig();
    }

    let payloadLicenseId = '';
    if (action !== 'activate' && this.state?.envelope?.payload?.license_id) {
      payloadLicenseId = this.state.envelope.payload.license_id;
    }

    const nonce = randomBytes(24).toString('hex');
    const body = {
      license_key: trimmedKey,
      license_id: payloadLicenseId,
      product_id: this.productId,
      product_code: this.productCode,
      device_id: this.deviceId,
      device_name: this.deviceName,
      os: this.os,
      app_version: this.appVersion,
      nonce
    };

    let response;
    try {
      response = await this.transport(`${this.serverUrl}/api/license/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `@tumy/license (Node ${process.version}; ${this.os})`,
          Accept: 'application/json'
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs)
      });
    } catch (err) {
      this.offline = true;
      this.lastError = `Chế độ ngoại tuyến (${err.message})`;
      if (action === 'deactivate') {
        this.storage.clear();
        this.state = null;
      }
      return this.status();
    }

    let resultJson;
    try {
      resultJson = await response.json();
    } catch {
      deny('INVALID_RESPONSE', 'Phản hồi từ máy chủ không đúng định dạng JSON.');
    }

    if (!response.ok) {
      const errCode = resultJson?.code || `HTTP_${response.status}`;
      const errMsg = resultJson?.message || 'Yêu cầu bị máy chủ từ chối.';
      if (errCode === 'LICENSE_SUSPENDED') {
        this.lastError = errMsg;
        if (this.state) this.state.suspended = true;
        deny(errCode, errMsg);
      }
      if (['LICENSE_REVOKED', 'LICENSE_NOT_FOUND', 'ACTIVATION_REQUIRED'].includes(errCode)) {
        this.storage.clear();
        this.state = null;
        this.lastError = errMsg;
        deny(errCode, errMsg);
      }
      deny(errCode, errMsg);
    }

    const envelope = resultJson;
    let payload;
    try {
      payload = verifyEnvelope(envelope, {
        publicKey: this.publicKey,
        keyId: this.keyId,
        productId: this.productId,
        productCode: this.productCode,
        deviceId: this.deviceId,
        nonce,
        action,
        now: this.clock()
      });

      if (
        this.state?.envelope?.payload?.license_id === payload.license_id &&
        payload.generation < this.state.envelope.payload.generation
      ) {
        deny('GENERATION_ROLLBACK', 'Phiên bản quyền cũ bị từ chối.');
      }
    } catch (err) {
      if (action === 'activate') {
        this.storage.clear();
        this.state = null;
      }
      throw err;
    }

    this.offline = false;
    this.lastError = '';

    if (!payload.valid) {
      this.storage.clear();
      this.state = null;
      return {
        allowed: false,
        mode: 'locked',
        status: payload.status,
        message: 'Máy chủ không cấp quyền sử dụng.',
        deviceId: this.deviceId
      };
    }

    this.state = {
      envelope,
      key_hash: keyDigest(trimmedKey),
      license_key: trimmedKey,
      last_wall: this.clock(),
      generation: payload.generation || 1
    };

    this.storage.save({
      envelope,
      keyHash: keyDigest(trimmedKey),
      lastWall: this.clock(),
      generation: payload.generation || 1,
      licenseKey: trimmedKey
    });

    return this.status();
  }

  async sync(timeoutMs = 3000) {
    if (!this.licenseKey && this.state?.license_key) {
      this.licenseKey = this.state.license_key;
    }
    if (!this.licenseKey && !this.state?.envelope) {
      return this.status();
    }
    return this.request('validate', this.licenseKey, timeoutMs);
  }

  async requireFeature(code, amount = 1) {
    const p = this.check();
    const f = p.features?.find((item) => item.code === code);

    if (!f) {
      deny('FEATURE_DENIED', `Tính năng '${code}' chỉ dành cho gói Nâng cao. Vui lòng nâng cấp bản quyền.`);
    }

    if (f.kind === 'boolean') {
      if (!f.value) {
        deny('FEATURE_DENIED', `Gói hiện tại chưa mở quyền tính năng '${code}'.`);
      }
      await this.checkpoint();
      return true;
    }

    if (f.kind === 'limit') {
      if (!Number.isSafeInteger(f.value) || f.value < amount) {
        deny('FEATURE_DENIED', `Vượt quá hạn mức cho phép của tính năng '${code}' (${amount} > ${f.value}).`);
      }
      await this.checkpoint();
      return f.value;
    }

    await this.checkpoint();
    return f.value;
  }

  startHeartbeatLoop(intervalSeconds = 15) {
    if (this._heartbeatTimer) return;
    this._heartbeatTimer = setInterval(async () => {
      try {
        const res = await this.request('heartbeat', this.licenseKey, 5000);
        if (!res.allowed) {
          this.stopHeartbeat();
        }
      } catch (err) {
        if (['LICENSE_SUSPENDED', 'LICENSE_REVOKED', 'LICENSE_NOT_FOUND'].includes(err.code)) {
          this.stopHeartbeat();
        }
      }
    }, intervalSeconds * 1000);
    this._heartbeatTimer.unref?.();
  }

  stopHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }
}
