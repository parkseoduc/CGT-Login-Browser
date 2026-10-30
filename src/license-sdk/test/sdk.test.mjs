import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import {
  License,
  LicenseClient,
  SecureLicenseStorage,
  getHardwareId,
  verifyEnvelope,
  LicenseSecurityError,
  encryptCache,
  decryptCache
} from '../src/index.mjs';

test('1. Hardware ID detection format', () => {
  const hwid = getHardwareId();
  assert.match(hwid, /^HWID-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
});

test('2. AES-256-GCM Hardware Encrypted Cache & Anti-Tamper', () => {
  const hwid1 = getHardwareId();
  const hwid2 = 'HWID-0000-1111-2222-3333';
  const original = { hello: 'world', count: 42, active: true };

  const encrypted = encryptCache(original, hwid1);
  assert.ok(encrypted.length >= 28, 'Ciphertext should contain IV + ciphertext + tag');

  // Giải mã đúng HWID
  const decrypted = decryptCache(encrypted, hwid1);
  assert.deepEqual(decrypted, original);

  // Thử giải mã bằng HWID khác (copy sang máy khác)
  const failedOtherHwid = decryptCache(encrypted, hwid2);
  assert.equal(failedOtherHwid, null, 'Giải mã sai máy phải trả về null');

  // Thử sửa đổi dữ liệu (tampering)
  const tampered = Buffer.from(encrypted);
  tampered[tampered.length - 1] ^= 0x01; // Đảo 1 bit trong auth tag
  const failedTampered = decryptCache(tampered, hwid1);
  assert.equal(failedTampered, null, 'Dữ liệu bị sửa đổi phải bị từ chối');
});

test('3. SecureLicenseStorage file operations and tamper auto-clean', () => {
  const tempDir = path.join(os.tmpdir(), `tumy-test-${Date.now()}`);
  const storage = new SecureLicenseStorage('TEST_PROD', tempDir);

  const testPayload = {
    envelope: { test: true },
    keyHash: 'abc123hash',
    lastWall: 1000000,
    generation: 1,
    licenseKey: 'KEY-TEST-123'
  };

  storage.save(testPayload);
  assert.ok(fs.existsSync(storage.encFile));

  // Đọc lại bình thường
  const loaded = storage.load();
  assert.equal(loaded.license_key, 'KEY-TEST-123');
  assert.equal(loaded.generation, 1);

  // Cố tình sửa file trên đĩa
  const content = fs.readFileSync(storage.encFile);
  content[content.length - 5] ^= 0x55;
  fs.writeFileSync(storage.encFile, content);

  // File bị sửa phải tự hủy và trả về null
  const loadedTampered = storage.load();
  assert.equal(loadedTampered, null);
  assert.ok(!fs.existsSync(storage.encFile), 'File bị sửa phải tự động xóa');

  storage.clear();
  try { fs.rmdirSync(tempDir); } catch {}
});

test('4. Ed25519 signature verification and security defenses', () => {
  // Tạo cặp khóa Ed25519 cho test
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' });

  const now = Date.now();
  const validPayload = {
    valid: true,
    status: 'ACTIVE',
    server_time: new Date(now).toISOString(),
    nonce: 'test-nonce-123',
    request_action: 'activate',
    license_id: 'lic_abc_999',
    max_devices: 1,
    generation: 1,
    offline_valid_until: new Date(now + 86400000).toISOString(),
    expires_at: new Date(now + 86400000 * 30).toISOString(),
    product: { id: 'prod_1', code: 'TEST_PROD' },
    device: { id: 'HWID-TEST' },
    features: [
      { code: 'export_4k', kind: 'boolean', value: true },
      { code: 'max_threads', kind: 'limit', value: 8 }
    ]
  };

  const payloadJson = JSON.stringify(validPayload);
  const dataB64 = Buffer.from(payloadJson, 'utf8').toString('base64url');
  const sig = sign(null, Buffer.from(dataB64), privateKey).toString('base64url');

  const validEnvelope = {
    algorithm: 'Ed25519',
    key_id: 'test_key',
    data: dataB64,
    signature: sig,
    payload: validPayload
  };

  // Xác minh hợp lệ
  const verified = verifyEnvelope(validEnvelope, {
    publicKey: pubPem,
    keyId: 'test_key',
    productId: 'prod_1',
    productCode: 'TEST_PROD',
    deviceId: 'HWID-TEST',
    nonce: 'test-nonce-123',
    action: 'activate',
    now
  });
  assert.equal(verified.license_id, 'lic_abc_999');

  // Thử giả mạo chữ ký (chữ ký sai)
  const badSigEnvelope = { ...validEnvelope, signature: 'AAAA'.repeat(16) };
  assert.throws(
    () => verifyEnvelope(badSigEnvelope, { publicKey: pubPem, now }),
    (err) => err.code === 'SIGNATURE_INVALID'
  );

  // Thử sửa payload bên ngoài (PAYLOAD_MISMATCH)
  const tamperedPayloadEnvelope = {
    ...validEnvelope,
    payload: { ...validPayload, generation: 999 }
  };
  assert.throws(
    () => verifyEnvelope(tamperedPayloadEnvelope, { publicKey: pubPem, now }),
    (err) => err.code === 'PAYLOAD_MISMATCH'
  );

  // Thử Replay Attack (sai nonce)
  assert.throws(
    () => verifyEnvelope(validEnvelope, {
      publicKey: pubPem,
      nonce: 'wrong-nonce',
      now
    }),
    (err) => err.code === 'REPLAY_DETECTED'
  );

  // Thử Clock Skew (> 5 phút)
  assert.throws(
    () => verifyEnvelope(validEnvelope, {
      publicKey: pubPem,
      nonce: 'test-nonce-123',
      action: 'activate',
      now: now + 600000 // Lệch 10 phút
    }),
    (err) => err.code === 'CLOCK_SKEW'
  );

  // Thử Binding Mismatch (khác mã máy)
  assert.throws(
    () => verifyEnvelope(validEnvelope, {
      publicKey: pubPem,
      deviceId: 'HWID-OTHER-MACHINE',
      now
    }),
    (err) => err.code === 'BINDING_MISMATCH'
  );
});

test('5. LicenseClient & Pro Feature Quota checks', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' });

  const tempDir = path.join(os.tmpdir(), `tumy-client-test-${Date.now()}`);
  let simulatedTime = 10000000;

  const client = new LicenseClient({
    productCode: 'VIDEOMAKER',
    publicKey: pubPem,
    keyId: 'key_1',
    storageDir: tempDir,
    deviceId: 'HWID-TEST',
    clock: () => simulatedTime
  });

  // Khi chưa kích hoạt
  await client.load();
  const statusBefore = client.status();
  assert.equal(statusBefore.allowed, false);
  assert.equal(statusBefore.status, 'ACTIVATION_REQUIRED');

  // Giả lập mock server trả về envelope hợp lệ
  client.transport = async (url, opts) => {
    const body = JSON.parse(opts.body);
    const p = {
      valid: true,
      status: 'ACTIVE',
      server_time: new Date(simulatedTime).toISOString(),
      nonce: body.nonce,
      request_action: 'activate',
      license_id: 'lic_vid_123',
      max_devices: 1,
      generation: 1,
      offline_valid_until: new Date(simulatedTime + 86400000).toISOString(),
      expires_at: new Date(simulatedTime + 86400000 * 30).toISOString(),
      product: { code: 'VIDEOMAKER' },
      device: { id: 'HWID-TEST' },
      features: [
        { code: 'export_4k', kind: 'boolean', value: true },
        { code: 'max_threads', kind: 'limit', value: 4 }
      ]
    };
    const dataB64 = Buffer.from(JSON.stringify(p), 'utf8').toString('base64url');
    const sig = sign(null, Buffer.from(dataB64), privateKey).toString('base64url');
    return {
      ok: true,
      json: async () => ({
        algorithm: 'Ed25519',
        key_id: 'key_1',
        data: dataB64,
        signature: sig,
        payload: p
      })
    };
  };

  // Kích hoạt
  const actRes = await client.request('activate', 'VMK-VALID-KEY');
  assert.equal(actRes.allowed, true);
  assert.equal(actRes.status, 'ACTIVE');

  // Kiểm tra tính năng Pro boolean
  const has4k = await client.requireFeature('export_4k');
  assert.equal(has4k, true);

  // Kiểm tra tính năng limit hợp lệ
  const threads = await client.requireFeature('max_threads', 3);
  assert.equal(threads, 4);

  // Vượt quá hạn mức
  await assert.rejects(
    async () => client.requireFeature('max_threads', 10),
    (err) => err.code === 'FEATURE_DENIED'
  );

  // Tính năng không tồn tại
  await assert.rejects(
    async () => client.requireFeature('unknown_feat'),
    (err) => err.code === 'FEATURE_DENIED'
  );

  // Thử lùi giờ máy tính (CLOCK_ROLLBACK)
  simulatedTime -= 120000; // Lùi 2 phút
  assert.throws(
    () => client.check(),
    (err) => err.code === 'CLOCK_ROLLBACK'
  );

  client.storage.clear();
});

test('6. CommonJS bundle backward compatibility', async () => {
  const cjs = await import('../dist/index.cjs');
  assert.ok(cjs.License);
  assert.ok(cjs.LicenseClient);
  assert.ok(cjs.getHardwareId);
  const hwid = cjs.getHardwareId();
  assert.match(hwid, /^HWID-/);
});
