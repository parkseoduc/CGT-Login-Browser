const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');

const config = require('../src/config');
const db = require('../src/db');
const launcher = require('../src/launcher');
const proxy = require('../src/proxy');
const kernelDownloader = require('../src/kernel-downloader');
const profileBackup = require('../src/profile-backup');
const { startServer } = require('../src/server');

const TEST_PORT = 51899;

async function runTests() {
  console.log('====================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN CÁC TÍNH NĂNG P1 - P4');
  console.log('====================================================\n');

  const server = await startServer(TEST_PORT);
  console.log(`[Test Server] Đã khởi chạy tại http://127.0.0.1:${TEST_PORT}`);

  try {
    // -----------------------------------------------------------------
    // TEST 1: IN-APP KERNEL STATUS & LOCAL INSTALL (ƯU TIÊN 1)
    // -----------------------------------------------------------------
    console.log('\n--- 1. Kiểm thử In-App Kernel Downloader & Status ---');
    const statusRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/v1/kernel/status`).then(r => r.json());
    assert(statusRes.success === true, 'Kernel status API trả về success');
    console.log('✅ API GET /api/v1/kernel/status hoạt động tốt:', {
      isInstalled: statusRes.isInstalled,
      kernelPath: statusRes.kernelPath,
      downloadTask: statusRes.downloadTask.status
    });

    // Thử cài đặt nhanh từ file zip local nếu có
    const localZip = 'C:\\Users\\Admin\\.gemini\\antigravity\\scratch\\MyBrowser-153-win64.zip';
    if (fs.existsSync(localZip)) {
      console.log('📦 Tìm thấy file zip local:', localZip);
      const installRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/v1/kernel/install-local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: localZip })
      }).then(r => r.json());
      assert(installRes.success === true, 'Cài đặt local zip thành công');
      console.log('✅ Cài đặt Chromium Kernel từ file local zip thành công!');

      // Kiểm tra lại status
      const updatedStatus = await fetch(`http://127.0.0.1:${TEST_PORT}/api/v1/kernel/status`).then(r => r.json());
      assert(updatedStatus.isInstalled === true, 'Kernel đã được nhận diện cài đặt trong bin/chromium');
      console.log('✅ Kernel portable trong bin/chromium/chrome.exe đã sẵn sàng!');
    }

    // -----------------------------------------------------------------
    // TEST 2: BULK PROFILE CREATION (ƯU TIÊN 2)
    // -----------------------------------------------------------------
    console.log('\n--- 2. Kiểm thử Bulk Profile Generator & Import Text ---');
    const bulkData = {
      count: 3,
      namePrefix: 'Test_Bulk_Farm',
      os: 'random',
      webrtc_mode: 'fake_ip',
      canvas_noise: 1,
      audio_noise: 1,
      webgl_noise: 1,
      proxyList: [
        '103.145.63.10:8080:testuser:testpass',
        'http://myuser:mypass@103.145.63.11:8080',
      ],
      notes: 'Profile tạo tự động bằng Bulk Generator Test',
    };

    const bulkRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/v1/profiles/bulk-create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bulkData)
    }).then(r => r.json());

    assert(bulkRes.success === true, 'Bulk create profiles trả về success');
    assert(bulkRes.count === 3, 'Tạo đúng 3 profiles');
    assert(bulkRes.profiles.length === 3, 'Danh sách trả về 3 profiles');
    console.log(`✅ Tạo thành công ${bulkRes.count} profiles hàng loạt:`);
    bulkRes.profiles.forEach(p => console.log(`   - [${p.id.slice(0, 8)}] ${p.name} | Proxy: ${p.proxy_host || 'Direct'}:${p.proxy_port || ''} | OS: ${JSON.parse(p.fingerprint).os}`));

    const targetProfileId = bulkRes.profiles[0].id;

    // -----------------------------------------------------------------
    // TEST 3: PROXY ROTATION API (ƯU TIÊN 3)
    // -----------------------------------------------------------------
    console.log('\n--- 3. Kiểm thử Proxy Rotation API Hook ---');
    // Tạo 1 proxy có rotation_api_url (mock http server)
    const mockRotateServer = http.createServer((mReq, mRes) => {
      mRes.writeHead(200, { 'Content-Type': 'application/json' });
      mRes.end(JSON.stringify({
        code: 0,
        message: 'Đổi IP thành công',
        data: { ip: '118.69.182.50', next_change: 60 }
      }));
    });

    await new Promise(res => mockRotateServer.listen(0, '127.0.0.1', res));
    const mockPort = mockRotateServer.address().port;
    const mockRotationUrl = `http://127.0.0.1:${mockPort}/rotate`;

    const rotProxy = db.createProxy({
      name: 'Proxy 4G Xoay Test',
      type: 'http',
      host: '127.0.0.1',
      port: 8080,
      rotation_api_url: mockRotationUrl,
    });
    console.log(`✅ Đã tạo Proxy kèm URL xoay API: ${rotProxy.id.slice(0, 8)} (${rotProxy.name})`);

    // Gắn proxy này vào targetProfileId
    db.updateProfile(targetProfileId, { proxy_id: rotProxy.id, auto_rotate_proxy: 1 });

    // Gọi API xoay proxy trực tiếp
    const rotateRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/v1/proxies/${rotProxy.id}/rotate`, {
      method: 'POST'
    }).then(r => r.json());

    assert(rotateRes.success === true, 'Xoay proxy qua API thành công');
    console.log('✅ API POST /api/v1/proxies/:id/rotate thành công! Phản hồi:', rotateRes.result.apiResponse);

    // Gọi API xoay proxy thông qua profile
    const profileRotateRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/v1/profiles/${targetProfileId}/rotate-proxy`, {
      method: 'POST'
    }).then(r => r.json());
    assert(profileRotateRes.success === true, 'Xoay proxy thông qua profile thành công');
    console.log('✅ API POST /api/v1/profiles/:id/rotate-proxy thành công!');

    mockRotateServer.close();

    // -----------------------------------------------------------------
    // TEST 4: PROFILE BACKUP & RESTORE ZIP (ƯU TIÊN 4)
    // -----------------------------------------------------------------
    console.log('\n--- 4. Kiểm thử Profile Export & Import ZIP ---');
    // Export ZIP
    const exportRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/v1/profiles/${targetProfileId}/export-zip`);
    assert(exportRes.status === 200, 'Export ZIP trả về HTTP 200');
    assert(exportRes.headers.get('content-type') === 'application/zip', 'Content-Type là application/zip');
    const zipArrayBuffer = await exportRes.arrayBuffer();
    const zipBuf = Buffer.from(zipArrayBuffer);
    assert(zipBuf.length > 0, 'Dữ liệu file zip không rỗng');
    console.log(`✅ Xuất thành công file ZIP (${(zipBuf.length / 1024).toFixed(1)} KB) cho profile ${targetProfileId.slice(0, 8)}`);

    // Import ZIP
    const importRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/v1/profiles/import-zip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: zipBuf,
    }).then(r => r.json());

    assert(importRes.success === true, 'Khôi phục profile từ ZIP thành công');
    assert(importRes.profile && importRes.profile.id, 'Profile mới được tạo thành công');
    console.log(`✅ Khôi phục thành công Profile mới: [${importRes.profile.id.slice(0, 8)}] "${importRes.profile.name}"`);

    // Dọn dẹp profiles test
    console.log('\n--- Dọn dẹp dữ liệu kiểm thử ---');
    for (const p of bulkRes.profiles) {
      db.deleteProfile(p.id);
    }
    db.deleteProfile(importRes.profile.id);
    db.deleteProxy(rotProxy.id);
    console.log('✅ Đã dọn dẹp các profile và proxy kiểm thử sạch sẽ.');

    console.log('\n====================================================');
    console.log('🎉 TẤT CẢ 4/4 GIAI ĐOẠN KIỂM THỬ ĐỀU THÀNH CÔNG RỰC RỠ!');
    console.log('====================================================\n');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('\n❌ KIỂM THỬ THẤT BẠI:', err);
  process.exit(1);
});
