import {
  createHash,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  verify as cryptoVerify
} from 'node:crypto';
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';

const DAY_MS = 86400000;

export class LicenseSecurityError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'LicenseSecurityError';
    this.code = code;
  }
}

function deny(code, message) {
  throw new LicenseSecurityError(code, message);
}

/**
 * Lấy Hardware ID duy nhất của máy tính (HWID-XXXX-XXXX-XXXX-XXXX)
 * Tương thích 100% với Python SDK.
 */
export function getHardwareId() {
  let rawId = '';
  const platform = os.platform();

  if (platform === 'win32') {
    try {
      const out = execSync(
        'reg query HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid',
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 }
      );
      const match = out.match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/i);
      if (match) {
        rawId = match[1].trim();
      }
    } catch {
      // Fallback nếu không có quyền đọc Registry
    }
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
    // Fallback nếu không truy vấn được máy
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

export function keyDigest(key) {
  return createHash('sha256').update(key.trim(), 'utf8').digest('hex');
}

export function base64urlEncode(buf) {
  return buf.toString('base64url');
}

export function base64urlDecode(str) {
  return Buffer.from(str, 'base64url');
}

export function deriveHardwareKey(hwid) {
  const salt = 'cgt-tumy-license-anti-tamper-v1';
  return createHash('sha256').update(`${hwid}:salt:${salt}`, 'utf8').digest();
}

/**
 * Mã hóa dữ liệu bằng AES-256-GCM dựa trên HWID máy (tương thích byte-for-byte với Python)
 */
export function encryptCache(data, hwid) {
  const key = deriveHardwareKey(hwid);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const jsonStr = JSON.stringify(data);
  const ciphertext = Buffer.concat([cipher.update(jsonStr, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ciphertext, tag]);
}

/**
 * Giải mã dữ liệu AES-256-GCM. Trả về null nếu bị sửa đổi dữ liệu hoặc sai máy.
 */
export function decryptCache(buffer, hwid) {
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

/**
 * Xác minh chữ ký số Ed25519 và tính toàn vẹn của phản hồi từ máy chủ
 */
export function verifyEnvelope(envelope, {
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

  // Kiểm tra payload bên ngoài khớp hoàn toàn payload bên trong
  if (JSON.stringify(payload) !== JSON.stringify(envelope.payload)) {
    deny('PAYLOAD_MISMATCH', 'Nội dung phản hồi không khớp dữ liệu đã ký.');
  }

  const serverTime = Date.parse(payload.server_time);
  if (!Number.isFinite(serverTime)) {
    deny('INVALID_RESPONSE', 'Thiếu thời gian máy chủ hợp lệ.');
  }

  // Kiểm tra chống tấn công Replay Attack và Clock Skew khi kết nối trực tuyến
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

  if (payload.valid !== true) {
    return payload;
  }

  // Kiểm tra ràng buộc sản phẩm & thiết bị (Binding Check)
  if (productId && payload.product?.id && payload.product.id !== productId) {
    deny('BINDING_MISMATCH', 'Bản quyền không thuộc sản phẩm này.');
  }
  if (productCode && payload.product?.code && payload.product.code.toUpperCase() !== productCode.toUpperCase()) {
    deny('BINDING_MISMATCH', 'Mã sản phẩm không khớp với bản quyền đã cấp.');
  }
  if (deviceId && payload.device?.id && payload.device.id !== deviceId) {
    deny('BINDING_MISMATCH', 'Bản quyền không thuộc về thiết bị này.');
  }

  // Kiểm tra thời hạn offline (tối đa 24h kể từ khi cấp)
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

  // Kiểm tra cấu trúc danh sách tính năng
  if (!Array.isArray(payload.features)) {
    deny('INVALID_FEATURES', 'Danh sách tính năng không hợp lệ.');
  }
  for (const f of payload.features) {
    if (
      typeof f.code !== 'string' ||
      (f.kind === 'boolean'
        ? typeof f.value !== 'boolean'
        : f.kind === 'limit'
        ? !Number.isSafeInteger(f.value) || f.value < 0
        : true)
    ) {
      deny('INVALID_FEATURES', `Cấu trúc tính năng '${f?.code}' không hợp lệ.`);
    }
  }

  return payload;
}
