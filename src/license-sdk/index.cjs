const {
  createHash,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  verify: cryptoVerify
} = require('node:crypto');
const { execSync } = require('node:child_process');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const DAY_MS = 86400000;

class LicenseSecurityError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'LicenseSecurityError';
    this.code = code;
  }
}

function deny(code, message) {
  throw new LicenseSecurityError(code, message);
}

function getHardwareId() {
  let rawId = '';
  const platform = os.platform();

  if (platform === 'win32') {
    try {
      const out = execSync(
        'reg query HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid',
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 }
      );
      const match = out.match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/i);
      if (match) rawId = match[1].trim();
    } catch {}
  } else if (platform === 'darwin') {
    try {
      const out = execSync('ioreg -rd1 -c IOPlatformExpertDevice', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 2000
      });
      const match = out.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
      if (match) rawId = match[1].trim();
    } catch {}
  } else if (platform === 'linux') {
    try {
      if (fs.existsSync('/etc/machine-id')) {
        rawId = fs.readFileSync('/etc/machine-id', 'utf8').trim();
      }
    } catch {}
  }

  if (!rawId) {
    const ifaces = os.networkInterfaces();
    let mac = '';
    for (const key of Object.keys(ifaces)) {
      for (const item of ifaces[key] || []) {
        if (!item.internal && item.mac && item.mac !== '00:00:00:00:00:00') {
          mac = item.mac;
          break;
        }
      }
      if (mac) break;
    }
    rawId = `${os.hostname()}-${os.arch()}-${os.cpus()?.[0]?.model || ''}-${mac}`;
  }

  const h = createHash('sha256')
    .update(rawId, 'utf8')
    .digest('hex')
    .slice(0, 20)
    .toUpperCase();

  return `HWID-${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}`;
}

function keyDigest(key) {
  return createHash('sha256').update(key.trim(), 'utf8').digest('hex');
}

function deriveHardwareKey(hwid) {
  const salt = 'cgt-tumy-license-anti-tamper-v1';
  return createHash('sha256').update(`${hwid}:salt:${salt}`, 'utf8').digest();
}

function encryptCache(data, hwid) {
  const key = deriveHardwareKey(hwid);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const jsonStr = JSON.stringify(data);
  const ciphertext = Buffer.concat([cipher.update(jsonStr, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ciphertext, tag]);
}

function decryptCache(buffer, hwid) {
  if (!buffer || buffer.length < 28) return null;
  try {
    const key = deriveHardwareKey(hwid);
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(buffer.length - 16);
    const ciphertext = buffer.subarray(12, buffer.length - 16);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(plaintext.toString('utf8'));
  } catch {
    return null;
  }
}

function verifyEnvelope(envelope, {
  publicKey,
  keyId,
  productId,
  productCode,
  deviceId,
  nonce,
  action,
  now = Date.now(),
  cached = false
}) {
  if (
    !envelope ||
    envelope.algorithm !== 'Ed25519' ||
    (keyId && envelope.key_id !== keyId) ||
    typeof envelope.data !== 'string' ||
    typeof envelope.signature !== 'string'
  ) {
    deny('SIGNATURE_INVALID', 'Chữ ký hoặc khóa ký không hợp lệ.');
  }

  let payload;
  try {
    const dataBuf = Buffer.from(envelope.data);
    const sigBuf = Buffer.from(envelope.signature, 'base64url');
    const validSig = cryptoVerify(null, dataBuf, publicKey, sigBuf);
    if (!validSig) {
      deny('SIGNATURE_INVALID', 'Không xác minh được chữ ký số Ed25519 của máy chủ.');
    }
    payload = JSON.parse(Buffer.from(envelope.data, 'base64url').toString('utf8'));
  } catch (err) {
    if (err instanceof LicenseSecurityError) throw err;
    deny('SIGNATURE_INVALID', 'Dữ liệu phản hồi bị hỏng hoặc chữ ký không khớp.');
  }

  if (JSON.stringify(payload) !== JSON.stringify(envelope.payload)) {
    deny('PAYLOAD_MISMATCH', 'Nội dung phản hồi không khớp dữ liệu đã ký.');
  }

  const serverTime = Date.parse(payload.server_time);
  if (!Number.isFinite(serverTime)) {
    deny('INVALID_RESPONSE', 'Thiếu thời gian máy chủ hợp lệ.');
  }

  if (!cached) {
    if (nonce && payload.nonce !== nonce) {
      deny('REPLAY_DETECTED', 'Phát hiện yêu cầu bị gửi lại (Replay attack).');
    }
    if (action && payload.request_action !== action) {
      deny('REPLAY_DETECTED', 'Hành động phản hồi không khớp yêu cầu.');
    }
    if (Math.abs(now - serverTime) > 300000) {
      deny('CLOCK_SKEW', 'Đồng hồ máy tính lệch quá 5 phút so với máy chủ. Hãy đồng bộ lại giờ.');
    }
  }

  if (payload.valid !== true) return payload;

  if (productId && payload.product?.id && payload.product.id !== productId) {
    deny('BINDING_MISMATCH', 'Bản quyền không thuộc sản phẩm này.');
  }
  if (productCode && payload.product?.code && payload.product.code.toUpperCase() !== productCode.toUpperCase()) {
    deny('BINDING_MISMATCH', 'Mã sản phẩm không khớp với bản quyền đã cấp.');
  }
  if (deviceId && payload.device?.id && payload.device.id !== deviceId) {
    deny('BINDING_MISMATCH', 'Bản quyền không thuộc về thiết bị này.');
  }

  const until = Date.parse(payload.offline_valid_until);
  const expires = payload.expires_at === null ? Infinity : Date.parse(payload.expires_at);

  if (
    !Number.isFinite(until) ||
    Number.isNaN(expires) ||
    until > serverTime + DAY_MS + 5000 ||
    until > expires ||
    until < serverTime - 5000
  ) {
    deny('INVALID_RESPONSE', 'Thời hạn ngoại tuyến (offline grace period) không hợp lệ.');
  }

  if (payload.max_devices !== 1) {
    deny('INVALID_RESPONSE', 'Chính sách số lượng thiết bị không hợp lệ.');
  }
  if (!Number.isSafeInteger(payload.generation) || payload.generation < 1) {
    deny('INVALID_RESPONSE', 'Thế hệ bản quyền (generation) không hợp lệ.');
  }
  if (typeof payload.license_id !== 'string') {
    deny('INVALID_RESPONSE', 'Thiếu định danh license_id.');
  }

  if (!Array.isArray(payload.features)) {
    deny('INVALID_FEATURES', 'Danh sách tính năng không hợp lệ.');
  }

  return payload;
}

class SecureLicenseStorage {
  constructor(productCode, customDir = null) {
    this.productCode = productCode;
    this.hwid = getHardwareId();

    if (customDir) {
      this.dirPath = path.resolve(customDir);
    } else {
      const platform = os.platform();
      let baseDir = '';
      if (platform === 'win32') {
        baseDir = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
      } else if (platform === 'darwin') {
        baseDir = path.join(os.homedir(), 'Library', 'Application Support');
      } else {
        baseDir = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
      }
      this.dirPath = path.join(baseDir, 'CGT-License', productCode);
    }

    this.encFile = path.join(this.dirPath, 'license.enc');
    this.legacyFile = path.join(this.dirPath, 'license.json');
  }

  save({ envelope, keyHash, lastWall, generation = 1, licenseKey = '' }) {
    try {
      fs.mkdirSync(this.dirPath, { recursive: true });
      const data = {
        envelope,
        key_hash: keyHash,
        license_key: licenseKey,
        last_wall: lastWall,
        generation,
        hwid: this.hwid
      };
      const encryptedBuffer = encryptCache(data, this.hwid);
      fs.writeFileSync(this.encFile, encryptedBuffer);
      if (fs.existsSync(this.legacyFile)) {
        try { fs.unlinkSync(this.legacyFile); } catch {}
      }
    } catch (err) {
      console.error(`[@tumy/license] Lỗi ghi cache: ${err.message}`);
    }
  }

  load() {
    if (!fs.existsSync(this.encFile)) return null;
    try {
      const encryptedBuffer = fs.readFileSync(this.encFile);
      const decrypted = decryptCache(encryptedBuffer, this.hwid);
      if (!decrypted || decrypted.hwid !== this.hwid) {
        this.clear();
        return null;
      }
      return decrypted;
    } catch {
      this.clear();
      return null;
    }
  }

  checkpoint(wallTime) {
    const cached = this.load();
    if (cached) {
      cached.last_wall = Math.max(cached.last_wall || 0, wallTime);
      this.save({
        envelope: cached.envelope,
        keyHash: cached.key_hash,
        lastWall: cached.last_wall,
        generation: cached.generation || 1,
        licenseKey: cached.license_key || ''
      });
    }
  }

  clear() {
    try {
      if (fs.existsSync(this.encFile)) fs.unlinkSync(this.encFile);
      if (fs.existsSync(this.legacyFile)) fs.unlinkSync(this.legacyFile);
    } catch {}
  }
}

class LicenseClient {
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
    } catch {}
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
    const lastWall = this.state.last_wall || 0;
    if (wall < lastWall - 60000) {
      deny('CLOCK_ROLLBACK', 'Phát hiện đồng hồ máy tính bị lùi lại. Vui lòng kết nối mạng để đồng bộ.');
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
    if (this.state) this.storage.checkpoint(this.clock());
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
    if (trimmedKey) this.licenseKey = trimmedKey;
    if (!this.publicKey) await this.fetchServerConfig();

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
        if (!res.allowed) this.stopHeartbeat();
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

class License {
  constructor({
    product,
    serverUrl = 'https://lic.cgtdev.space',
    publicKey = null,
    keyId = null,
    appVersion = '1.0.0',
    storageDir = null
  }) {
    this.product = product;
    this.client = new LicenseClient({
      productCode: product,
      serverUrl,
      publicKey,
      keyId,
      appVersion,
      storageDir
    });
  }

  async init() {
    await this.client.load();
    try { await this.client.sync(2500); } catch {}
    if (this.client.status().allowed) {
      this.client.startHeartbeatLoop(15);
    }
    return this.client.status();
  }

  status() {
    return this.client.status();
  }

  async activate(licenseKey) {
    const res = await this.client.request('activate', licenseKey);
    if (res.allowed) this.client.startHeartbeatLoop(15);
    return res;
  }

  async require(featureCode, amount = 1) {
    return this.client.requireFeature(featureCode, amount);
  }

  async deactivate() {
    this.client.stopHeartbeat();
    return this.client.request('deactivate');
  }
}

module.exports = {
  License,
  LicenseClient,
  SecureLicenseStorage,
  getHardwareId,
  verifyEnvelope,
  LicenseSecurityError,
  keyDigest,
  encryptCache,
  decryptCache
};
