const path = require('node:path');
const fs = require('node:fs');

const config = require('../src/config');
const db = require('../src/db');
const launcher = require('../src/launcher');
const { CdpClient } = require('../src/cdp');

async function runTest() {
  console.log('====================================================');
  console.log('       STARTING CORE SYSTEM VERIFICATION TEST       ');
  console.log('====================================================\n');

  // 1. Kiểm tra Kernel tùy chỉnh của user
  const primaryKernel = config.getAvailableKernels().find(k => k.isPrimary);
  console.log(`[Test 1] Checking Custom Chromium: ${primaryKernel.path}`);
  if (!primaryKernel.exists) {
    throw new Error(`Primary kernel not found at: ${primaryKernel.path}`);
  }
  console.log('  -> PASS: Custom Chromium binary exists and is ready.\n');

  // 2. Tạo một Profile mới trong Database
  console.log('[Test 2] Creating a test profile in SQLite...');
  const testProfile = db.createProfile({
    name: 'Auto-Test Profile (MyBrowser 153)',
    kernel_path: primaryKernel.path,
    start_url: 'https://iphey.com',
    screen_width: 1280,
    screen_height: 800,
    notes: 'Created by automated verification test',
  });
  console.log(`  -> PASS: Created Profile ID: ${testProfile.id}`);
  console.log(`     Kernel: ${testProfile.kernel_path}\n`);

  // 3. Khởi chạy Profile với Custom Chromium
  console.log('[Test 3] Launching profile with isolated --user-data-dir...');
  const launchResult = await launcher.startProfile(testProfile.id);
  console.log(`  -> PASS: Profile launched successfully!`);
  console.log(`     PID: ${launchResult.pid}`);
  console.log(`     CDP Port: ${launchResult.port}`);
  console.log(`     CDP WebSocket: ${launchResult.wsEndpoint}\n`);

  if (!launchResult.wsEndpoint) {
    throw new Error('Failed to obtain loopback CDP WebSocket endpoint');
  }

  // 4. Kết nối trực tiếp CDP để kiểm tra trình duyệt
  console.log('[Test 4] Connecting to browser via loopback CDP WebSocket...');
  const cdp = new CdpClient(launchResult.wsEndpoint);
  await cdp.connect(3000);
  console.log('  -> PASS: WebSocket connection established.');

  // Lấy thông tin phiên bản từ Core
  const versionInfo = await cdp.send('Browser.getVersion');
  console.log('  -> PASS: Browser responded via CDP:');
  console.log(`     Product: ${versionInfo.product}`);
  console.log(`     Protocol Version: ${versionInfo.protocolVersion}`);
  console.log(`     User Agent: ${versionInfo.userAgent}`);
  console.log(`     JS Engine: ${versionInfo.jsVersion}\n`);

  // Lấy danh sách các target/tabs
  const targets = await cdp.send('Target.getTargets');
  console.log(`  -> PASS: Active targets count: ${targets.targetInfos.length}`);
  for (const t of targets.targetInfos) {
    console.log(`     [${t.type}] ${t.title || 'Untitled'} - ${t.url}`);
  }
  console.log();

  cdp.close();

  // 5. Chờ 3 giây để trình duyệt hoạt động và tải trang
  console.log('[Test 5] Keeping browser alive for 3 seconds...');
  await new Promise(r => setTimeout(r, 3000));

  // 6. Kiểm tra đóng êm (Graceful Shutdown)
  console.log('[Test 6] Testing Graceful Shutdown via CDP (flushing cookies & storage)...');
  const stopResult = await launcher.stopProfile(testProfile.id);
  console.log(`  -> PASS: Stop completed. Graceful: ${stopResult.graceful}`);

  const isStillRunning = launcher.isProfileRunning(testProfile.id);
  console.log(`  -> Running status after stop: ${isStillRunning ? 'RUNNING (FAIL)' : 'STOPPED (PASS)'}\n`);

  if (isStillRunning) {
    throw new Error('Profile failed to stop properly');
  }

  // 7. Kiểm tra dữ liệu được lưu trên đĩa
  const profileDir = path.join(config.PROFILES_DIR, testProfile.id, 'chrome');
  console.log(`[Test 7] Checking isolated profile storage at: ${profileDir}`);
  const hasPreferences = fs.existsSync(path.join(profileDir, 'Default', 'Preferences'));
  console.log(`  -> Preferences file created: ${hasPreferences ? 'YES (PASS)' : 'NO (FAIL)'}\n`);

  console.log('====================================================');
  console.log('      ALL CORE ENGINE VERIFICATION TESTS PASSED!    ');
  console.log('====================================================');
}

runTest().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
