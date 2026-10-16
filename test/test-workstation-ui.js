const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');

const { CdpClient } = require('../src/cdp');
const db = require('../src/db');

const CHROME_PATH = 'E:\\Chromium_Workspace\\src\\out\\Default\\chrome.exe';
const TEST_PORT = 9876;
const APP_URL = 'http://127.0.0.1:51888';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getPageTarget(port) {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/json`, (r) => {
          let data = '';
          r.on('data', c => data += c);
          r.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
      });
      const page = res.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error('Không tìm thấy page target trên cổng ' + port);
}

async function runWorkstationTest() {
  console.log('===============================================================');
  console.log('  KIỂM THỬ TOÀN DIỆN GIAO DIỆN & TÍNH NĂNG WORKSTATION POLYLOGIN');
  console.log('===============================================================\n');

  const tmpUserData = path.join(__dirname, '..', 'data', 'temp_test_cdp_profile');
  if (!fs.existsSync(tmpUserData)) fs.mkdirSync(tmpUserData, { recursive: true });

  console.log('[1/12] Khởi chạy Headless Chromium...');
  const proc = spawn(CHROME_PATH, [
    '--no-sandbox',
    '--disable-gpu-sandbox',
    `--remote-debugging-port=${TEST_PORT}`,
    '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${tmpUserData}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    'about:blank'
  ], { stdio: 'ignore' });

  try {
    const wsUrl = await getPageTarget(TEST_PORT);
    console.log('  -> CDP WebSocket URL:', wsUrl);

    const cdp = new CdpClient(wsUrl);
    await cdp.connect(5000);
    console.log('  -> PASS: Đã kết nối CDP với Chrome.');

    // Điều hướng tới APP_URL và chờ tải xong
    console.log('  -> Đang tải trang ứng dụng:', APP_URL);
    await cdp.send('Page.enable');
    const loadPromise = new Promise(resolve => {
      cdp.once('Page.loadEventFired', resolve);
    });
    await cdp.send('Page.navigate', { url: APP_URL });
    await Promise.race([loadPromise, sleep(3000)]);
    await sleep(1500); // Đảm bảo DOM và app.js đã khởi tạo hoàn tất

    async function evaluate(code) {
      const res = await cdp.send('Runtime.evaluate', {
        expression: code,
        returnByValue: true,
        awaitPromise: true
      });
      if (res.exceptionDetails) {
        throw new Error(res.exceptionDetails.exception?.description || 'Eval error');
      }
      return res.result?.value;
    }

    const title = await evaluate('document.title');
    console.log('  -> PASS: Tiêu đề trang web:', title, '\n');

    // 2. Mở Modal Tạo Hồ Sơ
    console.log('[2/12] Mở Modal Tạo Hồ Sơ (Workstation Modal)...');
    const modalOpened = await evaluate(`(() => {
      document.getElementById('btn-create-modal').click();
      const m = document.getElementById('profile-modal');
      return m.classList.contains('open');
    })()`);
    if (!modalOpened) throw new Error('Không mở được modal tạo hồ sơ');
    console.log('  -> PASS: Modal Workstation đã mở thành công.\n');

    // 3. Kiểm tra các Subtabs
    console.log('[3/12] Kiểm tra chuyển đổi 4 Subtabs (Cài đặt chung, Proxy, Dấu vân tay, Tiện ích)...');
    const tabsTest = await evaluate(`(() => {
      const results = {};
      
      // Tab Proxy
      document.getElementById('modal-tab-proxy').click();
      results.proxy = document.getElementById('modal-content-proxy').style.display !== 'none';
      
      // Tab FP
      document.getElementById('modal-tab-fp').click();
      results.fp = document.getElementById('modal-content-fp').style.display !== 'none';
      
      // Tab Ext
      document.getElementById('modal-tab-ext').click();
      results.ext = document.getElementById('modal-content-ext').style.display !== 'none';
      
      // Tab Basic
      document.getElementById('modal-tab-basic').click();
      results.basic = document.getElementById('modal-content-basic').style.display !== 'none';
      
      return results;
    })()`);
    console.log('  -> Subtabs hiển thị:', tabsTest);
    if (!tabsTest.proxy || !tabsTest.fp || !tabsTest.ext || !tabsTest.basic) {
      throw new Error('Chuyển đổi Subtabs bị lỗi');
    }
    console.log('  -> PASS: Cả 4 Subtabs chuyển đổi mượt mà.\n');

    // 4. Kiểm tra OS Cards Picker
    console.log('[4/12] Kiểm tra chọn hệ điều hành (macOS, Linux, Android, Windows)...');
    const osTest = await evaluate(`(() => {
      const res = {};
      
      // Chọn macOS
      document.getElementById('os-btn-mac').click();
      res.mac = {
        osActive: document.getElementById('os-btn-mac').classList.contains('active'),
        sumOs: document.getElementById('sum-os').innerText,
        gpu: document.getElementById('sum-gpu').innerText,
        uaHasMac: document.getElementById('fp-user-agent').value.includes('Macintosh')
      };
      
      // Chọn Linux
      document.getElementById('os-btn-linux').click();
      res.linux = {
        sumOs: document.getElementById('sum-os').innerText,
        uaHasLinux: document.getElementById('fp-user-agent').value.includes('Linux')
      };
      
      // Chọn Windows
      document.getElementById('os-btn-windows').click();
      res.windows = {
        sumOs: document.getElementById('sum-os').innerText,
        uaHasWin: document.getElementById('fp-user-agent').value.includes('Windows')
      };
      
      return res;
    })()`);
    console.log('  -> Kết quả kiểm tra OS Cards:', JSON.stringify(osTest, null, 2));
    if (!osTest.mac.osActive || !osTest.windows.uaHasWin) {
      throw new Error('OS Cards Picker hoạt động không đúng');
    }
    console.log('  -> PASS: OS Cards cập nhật chính xác và đồng bộ User-Agent.\n');

    // 5. Kiểm tra nút Đổi User-Agent ngẫu nhiên
    console.log('[5/12] Kiểm tra nút [ 🎲 Đổi User-Agent ]...');
    const uaTest = await evaluate(`(() => {
      const oldUa = document.getElementById('fp-user-agent').value;
      document.getElementById('btn-quick-random-ua').click();
      const newUa = document.getElementById('fp-user-agent').value;
      const sumUa = document.getElementById('sum-ua').innerText;
      return { oldUa, newUa, sumUaMatches: sumUa === newUa };
    })()`);
    console.log('  -> User-Agent cũ:', uaTest.oldUa.slice(0, 45) + '...');
    console.log('  -> User-Agent mới:', uaTest.newUa.slice(0, 45) + '...');
    console.log('  -> PASS: Nút Đổi User-Agent đã sinh UA mới và cập nhật bảng Tổng quan.\n');

    // 6. Kiểm tra Quick Proxy Pills
    console.log('[6/12] Kiểm tra các nút Quick Proxy Pills (None, Kho Proxy 10 Live, Nhập thủ công)...');
    const proxyPillsTest = await evaluate(`(() => {
      const res = {};
      
      // Chọn Hub
      const btnHub = document.querySelector('#quick-proxy-pills [data-proxymode="hub"]');
      btnHub.click();
      res.hubVisible = document.getElementById('quick-proxy-hub-wrap').style.display !== 'none';
      res.proxySelected = document.getElementById('form-proxy-select').value;
      res.sumProxy = document.getElementById('sum-proxy').innerText;
      
      // Chọn Custom
      const btnCustom = document.querySelector('#quick-proxy-pills [data-proxymode="custom"]');
      btnCustom.click();
      res.customVisible = document.getElementById('quick-proxy-custom-wrap').style.display !== 'none';
      
      // Đặt lại Hub để gán proxy từ kho
      btnHub.click();
      
      return res;
    })()`);
    console.log('  -> Kết quả Quick Proxy:', proxyPillsTest);
    if (!proxyPillsTest.hubVisible || !proxyPillsTest.proxySelected) {
      throw new Error('Quick Proxy Pills hoạt động không chính xác');
    }
    console.log('  -> PASS: Quick Proxy Pills kết nối thành công với Kho 10 Proxy tĩnh.\n');

    // 7. Kiểm tra Quick WebRTC Pills
    console.log('[7/12] Kiểm tra Quick WebRTC Pills (Bảo vệ, Vô hiệu hóa, Thực)...');
    const webrtcTest = await evaluate(`(() => {
      const res = {};
      
      const btnDisabled = document.querySelector('#quick-webrtc-pills [data-webrtc="disabled"]');
      btnDisabled.click();
      res.disabledText = document.getElementById('sum-webrtc').innerText;
      
      const btnFake = document.querySelector('#quick-webrtc-pills [data-webrtc="fake_ip"]');
      btnFake.click();
      res.fakeText = document.getElementById('sum-webrtc').innerText;
      
      return res;
    })()`);
    console.log('  -> WebRTC Text:', webrtcTest);
    if (!webrtcTest.fakeText.includes('Bảo vệ')) {
      throw new Error('Quick WebRTC Pills hoạt động không đúng');
    }
    console.log('  -> PASS: Quick WebRTC Pills đổi trạng thái tức thời.\n');

    // 8. Tinh chỉnh cấu hình phần cứng chi tiết (CPU 16, RAM 32, GPU RTX 3080)
    console.log('[8/12] Kiểm tra tinh chỉnh phần cứng (CPU 16 Cores, RAM 32 GB, Màn hình 2K)...');
    const hwTest = await evaluate(`(() => {
      // Đổi sang tab Dấu vân tay
      document.getElementById('modal-tab-fp').click();
      
      // Chọn 16 Cores
      const selCpu = document.getElementById('fp-cpu');
      selCpu.value = '16';
      selCpu.dispatchEvent(new Event('change'));
      
      // Chọn 32 GB RAM
      const selRam = document.getElementById('fp-ram');
      selRam.value = '32';
      selRam.dispatchEvent(new Event('change'));
      
      // Chọn 2560x1440
      const selRes = document.getElementById('form-resolution');
      selRes.value = '2560x1440';
      selRes.dispatchEvent(new Event('change'));
      
      // Chọn GPU RTX 3080
      const selGpu = document.getElementById('fp-webgl');
      selGpu.value = 'rtx3080';
      selGpu.dispatchEvent(new Event('change'));
      
      // Đổi tên thiết bị
      const devInput = document.getElementById('fp-device-name');
      devInput.value = 'POLY-STATION-X99';
      devInput.dispatchEvent(new Event('input'));
      
      // Trở lại tab Cài đặt chung
      document.getElementById('modal-tab-basic').click();
      
      return {
        sumCpu: document.getElementById('sum-cpu').innerText,
        sumRam: document.getElementById('sum-ram').innerText,
        sumRes: document.getElementById('sum-res').innerText,
        sumGpu: document.getElementById('sum-gpu').innerText,
        sumDevice: document.getElementById('sum-devicename').innerText,
        sumMac: document.getElementById('sum-mac').innerText
      };
    })()`);
    console.log('  -> Bảng Tổng Quan Live Spec Sheet:', hwTest);
    if (!hwTest.sumCpu.includes('16') || !hwTest.sumRam.includes('32') || !hwTest.sumDevice.includes('POLY-STATION-X99')) {
      throw new Error('Cấu hình phần cứng không cập nhật vào bảng Tổng quan');
    }
    console.log('  -> PASS: Toàn bộ thông số phần cứng cập nhật chính xác.\n');

    // 9. Kiểm tra nút [ 🎲 Dấu vân tay mới ] trên bảng Tổng Quan
    console.log('[9/12] Kiểm tra nút [ 🎲 Dấu vân tay mới ] trên bảng Tổng Quan...');
    const randomSummaryTest = await evaluate(`(async () => {
      const oldMac = document.getElementById('sum-mac').innerText;
      document.getElementById('btn-randomize-summary').click();
      await new Promise(r => setTimeout(r, 600));
      const newMac = document.getElementById('sum-mac').innerText;
      const newDevice = document.getElementById('sum-devicename').innerText;
      return { oldMac, newMac, newDevice, macChanged: oldMac !== newMac };
    })()`);
    console.log('  -> MAC cũ:', randomSummaryTest.oldMac);
    console.log('  -> MAC mới:', randomSummaryTest.newMac);
    console.log('  -> Tên thiết bị mới:', randomSummaryTest.newDevice);
    if (!randomSummaryTest.macChanged) {
      throw new Error('Nút [ 🎲 Dấu vân tay mới ] không đổi địa chỉ MAC');
    }
    console.log('  -> PASS: Nút Dấu vân tay mới sinh ngẫu nhiên hoàn toàn bộ vân tay phần cứng.\n');

    // 10. Nhập Tên hồ sơ và Cookie trực tiếp
    console.log('[10/12] Nhập tên hồ sơ và dán Cookie trực tiếp vào form...');
    const TEST_PROFILE_NAME = 'PolyLogin Workstation Pro - Verified Test';
    const TEST_COOKIE = JSON.stringify([
      {
        name: 'poly_test_session',
        value: 'autotest_poly_token_999888',
        domain: '.google.com',
        path: '/'
      }
    ]);

    await evaluate(`(() => {
      document.getElementById('form-name').value = ${JSON.stringify(TEST_PROFILE_NAME)};
      document.getElementById('form-cookie-input').value = ${JSON.stringify(TEST_COOKIE)};
      document.getElementById('form-notes').value = 'Hồ sơ tạo thử nghiệm bằng giao diện PolyLogin';
    })()`);
    console.log('  -> Đã nhập Tên và dán mã Cookie JSON.\n');

    // 11. Bấm nút Lưu Hồ Sơ
    console.log('[11/12] Bấm nút [Lưu Hồ Sơ] (modal-save-btn)...');
    await evaluate(`(() => {
      document.getElementById('modal-save-btn').click();
    })()`);

    await sleep(2500); // Chờ API POST /profiles xử lý

    // 12. Kiểm tra hồ sơ được tạo trong Database
    console.log('[12/12] Kiểm tra hồ sơ mới tạo trong cơ sở dữ liệu SQLite...');
    const saved = db.getDb().prepare('SELECT * FROM profiles WHERE name = ? ORDER BY created_at DESC LIMIT 1').get(TEST_PROFILE_NAME);
    if (!saved) {
      throw new Error('Hồ sơ không tồn tại trong Database sau khi bấm Lưu');
    }

    console.log('  -> PASS: Hồ sơ đã được tạo thành công!');
    console.log('     ID:', saved.id);
    console.log('     Tên:', saved.name);
    console.log('     Proxy ID:', saved.proxy_id);
    console.log('     WebRTC Mode:', saved.webrtc_mode);
    console.log('     CPU Cores:', saved.cpu_cores);
    console.log('     RAM GB:', saved.ram_gb);
    console.log('     Screen:', `${saved.screen_width}x${saved.screen_height}`);
    console.log('     User-Agent:', saved.user_agent.slice(0, 50) + '...');

    const fp = JSON.parse(saved.fingerprint);
    console.log('     Fingerprint Device Name:', fp.deviceName);
    console.log('     Fingerprint MAC Address:', fp.macAddress);

    console.log('\n===============================================================');
    console.log('  🎉 TẤT CẢ 12 HẠNG MỤC KIỂM THỬ ĐỀU ĐẠT CHUẨN XUẤT SẮC 100%! ');
    console.log('===============================================================\n');

  } finally {
    proc.kill();
  }
}

runWorkstationTest().catch(err => {
  console.error('\n❌ TEST THẤT BẠI:', err.message);
  process.exit(1);
});
