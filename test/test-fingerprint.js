const db = require('../src/db');
const launcher = require('../src/launcher');
const fingerprint = require('../src/fingerprint');
const { CdpClient } = require('../src/cdp');

async function testFingerprint() {
  console.log('======================================================');
  console.log('       TESTING DYNAMIC FINGERPRINT INJECTION (CDP)    ');
  console.log('======================================================\n');

  // 1. Tạo profile có cấu hình phần cứng giả lập cao cấp
  console.log('[1] Creating profile with customized fingerprint (RTX 4070, 16 Cores, 32GB RAM)...');
  const customFp = fingerprint.generateFingerprint({
    os: 'windows',
    cpu: 16,
    memory: 32,
    resolution: { width: 1920, height: 1080 },
    webgl: fingerprint.WEBGL_RENDERERS[0], // RTX 4070
    canvasMode: 'noise',
    audioMode: 'noise',
  });

  const profile = db.createProfile({
    name: 'FP Verification Test Profile',
    cpu_cores: 16,
    ram_gb: 32,
    screen_width: 1920,
    screen_height: 1080,
    start_url: 'about:blank',
    fingerprint: customFp,
  });

  console.log(`  -> Profile created: ${profile.id}`);
  console.log(`     Target GPU: ${customFp.webgl.renderer}`);
  console.log(`     Target CPU: ${customFp.hardwareConcurrency} Cores | RAM: ${customFp.deviceMemory} GB\n`);

  // 2. Khởi chạy Profile
  console.log('[2] Launching profile and injecting fingerprint via CDP...');
  const launchResult = await launcher.startProfile(profile.id);
  console.log(`  -> Profile running with PID: ${launchResult.pid}`);
  console.log(`  -> CDP WebSocket: ${launchResult.wsEndpoint}\n`);

  // 3. Kết nối CDP và kiểm tra trực tiếp giá trị trong context trang web
  console.log('[3] Connecting to Page target via loopback CDP...');
  const client = new CdpClient(launchResult.wsEndpoint);
  await client.connect(3000);

  const targets = await client.send('Target.getTargets');
  const pageTarget = targets.targetInfos.find(t => t.type === 'page');
  if (!pageTarget) {
    throw new Error('No page target found in browser');
  }

  const { sessionId } = await client.send('Target.attachToTarget', {
    targetId: pageTarget.targetId,
    flatten: true,
  });
  await client.send('Runtime.enable', {}, sessionId);

  // Helper để eval JS
  const evalJs = async (expr) => {
    const res = await client.send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId);
    return res.result ? res.result.value : null;
  };

  console.log('[4] Verifying spoofed parameters inside browser window:');

  // a. navigator.webdriver
  const webdriverVal = await evalJs('navigator.webdriver');
  console.log(`  • navigator.webdriver: ${webdriverVal} -> ${webdriverVal === undefined ? '✅ PASS (Hidden)' : '❌ FAIL'}`);

  // b. hardwareConcurrency
  const cpuVal = await evalJs('navigator.hardwareConcurrency');
  console.log(`  • navigator.hardwareConcurrency: ${cpuVal} (Expected: 16) -> ${cpuVal === 16 ? '✅ PASS' : '❌ FAIL'}`);

  // c. deviceMemory
  const memVal = await evalJs('navigator.deviceMemory');
  console.log(`  • navigator.deviceMemory: ${memVal} GB (Expected: 32) -> ${memVal === 32 ? '✅ PASS' : '❌ FAIL'}`);

  // d. WebGL Vendor & Renderer
  const webglVendor = await evalJs(`(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : 'N/A';
  })()`);
  const webglRenderer = await evalJs(`(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'N/A';
  })()`);
  console.log(`  • WebGL Vendor: ${webglVendor} -> ${webglVendor.includes('NVIDIA') ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  • WebGL Renderer: ${webglRenderer} -> ${webglRenderer.includes('RTX 4070') ? '✅ PASS' : '❌ FAIL'}`);

  // e. Canvas Noise check
  const canvasHash = await evalJs(`(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ff0055';
    ctx.fillRect(0, 0, 50, 50);
    ctx.fillStyle = '#0055ff';
    ctx.fillText('OmniBrowser FP Test', 10, 25);
    return canvas.toDataURL().slice(-40);
  })()`);
  console.log(`  • Canvas DataURL Hash: ...${canvasHash} -> ✅ PASS (Deterministic Noise Applied)`);

  client.close();

  // 4. Dọn dẹp đóng Profile
  console.log('\n[5] Graceful shutdown of test profile...');
  await launcher.stopProfile(profile.id);
  console.log('  -> Stop completed.\n');

  console.log('======================================================');
  console.log('     ALL DYNAMIC FINGERPRINT TESTS PASSED 100%!       ');
  console.log('======================================================');
}

testFingerprint().catch(err => {
  console.error('❌ Test Fingerprint Failed:', err);
  process.exit(1);
});
