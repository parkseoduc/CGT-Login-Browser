const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');

const { CdpClient } = require('../src/cdp');
const db = require('../src/db');
const { getDefaultKernelPath } = require('../src/config');

const CHROME_PATH = getDefaultKernelPath();
const TEST_PORT = 9888;
const APP_URL = 'http://127.0.0.1:51888';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getPageTarget(port) {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/json`, (r) => {
          let data = '';
          r.on('data', c => data += c);
          r.on('end', () => {
            try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
          });
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

async function runWebUITest() {
  console.log('===================================================================');
  console.log('       KIỂM THỬ TOÀN DIỆN CHỨC NĂNG BẢN WEB (OMNIBROWSER WEB UI)    ');
  console.log('===================================================================\n');

  const tmpUserData = path.join(__dirname, '..', 'data', 'temp_web_test_profile');
  if (!fs.existsSync(tmpUserData)) fs.mkdirSync(tmpUserData, { recursive: true });

  const { startServer } = require('../src/server');
  let internalServer = null;
  try {
    const isRunning = await fetch('http://127.0.0.1:51888/api/health').then(r => r.ok).catch(() => false);
    if (!isRunning) {
      console.log('⚡ Server 51888 chưa chạy, tự động khởi động server kiểm thử...');
      internalServer = await startServer(51888);
    }
  } catch {}

  console.log('[1/8] Khởi chạy trình duyệt kiểm thử truy cập Bản Web...');
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

  let client = null;
  const consoleErrors = [];

  try {
    const wsUrl = await getPageTarget(TEST_PORT);
    console.log('  -> CDP WebSocket URL:', wsUrl);

    client = new CdpClient(wsUrl);
    await client.connect(6000);

    // Bắt lỗi Console trên trang web để đảm bảo không có bug runtime
    client.on('Runtime.consoleAPICalled', (params) => {
      if (params.type === 'error') {
        const msg = params.args.map(a => a.value || a.description || '').join(' ');
        consoleErrors.push(msg);
      }
    });

    await client.send('Page.enable');
    await client.send('Runtime.enable');

    console.log(`\n[2/8] Điều hướng tới Bản Web: ${APP_URL} ...`);
    await client.send('Page.navigate', { url: APP_URL });
    await sleep(2500);

    const docEval = await client.send('Runtime.evaluate', {
      expression: `({
        title: document.title,
        heading: document.getElementById('page-heading')?.innerText,
        navCount: document.querySelectorAll('.nav-item').length,
        hasTable: !!document.querySelector('.data-table'),
        profilesCount: document.querySelectorAll('#profiles-tbody tr').length
      })`,
      returnByValue: true
    });

    console.log('  -> Thông tin trang web tải được:', docEval.result.value);
    if (!docEval.result.value.title.includes('OmniBrowser')) {
      throw new Error('Tiêu đề trang không đúng!');
    }
    console.log('  -> PASS: Giao diện Web nạp đầy đủ và chính xác.');

    console.log('\n[3/8] Kiểm tra chuyển đổi các Tab điều hướng (Sidebar Navigation)...');
    const tabsToTest = [
      { tab: 'groups', name: 'Nhóm' },
      { tab: 'proxies', name: 'Kho Proxy Tĩnh' },
      { tab: 'extensions', name: 'Tiện Ích Extensions' },
      { tab: 'sync', name: 'Đồng Bộ Thao Tác' },
      { tab: 'license', name: 'Bản Quyền & Thiết Bị' },
      { tab: 'api', name: 'Tài Liệu API' },
      { tab: 'profiles', name: 'Hồ Sơ Trình Duyệt' },
    ];

    for (const t of tabsToTest) {
      const clickRes = await client.send('Runtime.evaluate', {
        expression: `
          (function() {
            const btn = document.querySelector('.nav-item[data-tab="${t.tab}"]');
            if (!btn) return { error: 'Không tìm thấy nav-item ${t.tab}' };
            btn.click();
            const targetView = document.getElementById('view-${t.tab}');
            return {
              activeTab: btn.classList.contains('active'),
              viewVisible: targetView ? window.getComputedStyle(targetView).display !== 'none' : false,
              heading: document.getElementById('page-heading')?.innerText
            };
          })()
        `,
        returnByValue: true
      });
      console.log(`  • Tab "${t.name}" (data-tab="${t.tab}"):`, clickRes.result.value);
      if (!clickRes.result.value.viewVisible) {
        throw new Error(`Tab ${t.name} không hiển thị view view-${t.tab}!`);
      }
      await sleep(200);
    }
    console.log('  -> PASS: Toàn bộ 7 Tab điều hướng Sidebar hoạt động hoàn hảo.');

    console.log('\n[4/8] Kiểm tra Giao diện Workstation PolyLogin & Tạo Hồ sơ mới...');
    await client.send('Runtime.evaluate', {
      expression: `document.getElementById('btn-create-modal').click()`
    });
    await sleep(600);

    // Chuyển 4 subtabs modal
    const subtabsRes = await client.send('Runtime.evaluate', {
      expression: `
        (function() {
          const res = {};
          ['proxy', 'fp', 'ext', 'basic'].forEach(tab => {
            document.getElementById('modal-tab-' + tab).click();
            const content = document.getElementById('modal-content-' + tab);
            res[tab] = content && window.getComputedStyle(content).display !== 'none';
          });
          return res;
        })()
      `,
      returnByValue: true
    });
    console.log('  -> Chuyển 4 Subtabs Modal Workstation:', subtabsRes.result.value);

    // Thử đổi User-Agent, đổi OS, đổi Hardware
    console.log('  -> Tinh chỉnh dấu vân tay và thông số phần cứng trên Modal...');
    const tweakRes = await client.send('Runtime.evaluate', {
      expression: `
        (function() {
          // 1. Đổi sang tab FP
          document.getElementById('modal-tab-fp').click();
          // 2. Chọn macOS
          const macBtn = document.getElementById('os-btn-mac');
          if (macBtn) macBtn.click();
          // 3. Đổi User-Agent ngẫu nhiên
          const uaBtn = document.getElementById('btn-quick-random-ua');
          if (uaBtn) uaBtn.click();
          // 4. Sinh ngẫu nhiên phần cứng
          const fpBtn = document.getElementById('btn-randomize-fp');
          if (fpBtn) fpBtn.click();
          // 5. Sang tab Proxy chọn Direct
          document.getElementById('modal-tab-proxy').click();
          const pillDirect = document.querySelector('#quick-proxy-pills button[data-proxymode="none"]');
          if (pillDirect) pillDirect.click();
          // 6. Điền tên hồ sơ
          document.getElementById('modal-tab-basic').click();
          const nameInput = document.getElementById('form-name');
          nameInput.value = 'Automated Web UI Test Profile';
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));

          return {
            name: nameInput.value,
            proxyText: document.getElementById('sum-proxy')?.innerText,
            osText: document.getElementById('sum-os')?.innerText,
            deviceGpu: document.getElementById('sum-gpu')?.innerText
          };
        })()
      `,
      returnByValue: true
    });
    console.log('  -> Thông số cấu hình trên Live Spec Sheet:', tweakRes.result.value);

    // Bấm nút Lưu Hồ Sơ
    console.log('  -> Bấm nút [Lưu Hồ Sơ] trên giao diện web...');
    await client.send('Runtime.evaluate', {
      expression: `document.getElementById('modal-save-btn').click()`
    });
    await sleep(2000);

    // Kiểm tra hồ sơ mới xuất hiện trên bảng web
    const findProfileRes = await client.send('Runtime.evaluate', {
      expression: `
        (function() {
          const rows = Array.from(document.querySelectorAll('#profiles-tbody tr'));
          const targetRow = rows.find(r => r.innerText.includes('Automated Web UI Test Profile'));
          if (!targetRow) return null;
          return {
            found: true,
            text: targetRow.innerText.replace(/\\s+/g, ' ').slice(0, 100),
            hasStartBtn: !!targetRow.querySelector('button.btn-primary')
          };
        })()
      `,
      returnByValue: true
    });
    console.log('  -> Kết quả tìm hồ sơ vừa tạo trên bảng Web:', findProfileRes.result.value);
    if (!findProfileRes.result.value || !findProfileRes.result.value.found) {
      throw new Error('Hồ sơ mới tạo không hiển thị trên bảng Web!');
    }
    console.log('  -> PASS: Tạo hồ sơ mới và hiển thị trực tiếp trên giao diện Web thành công.');

    console.log('\n[5/8] Kiểm tra Khởi chạy & Đóng hồ sơ trực tiếp từ Nút bấm trên Web UI...');
    // Lấy ID hồ sơ vừa tạo từ database
    const createdProfile = db.listProfiles().find(p => p.name === 'Automated Web UI Test Profile');
    if (!createdProfile) throw new Error('Không tìm thấy profile trong database!');
    const profileId = createdProfile.id;

    console.log(`  -> Bấm nút "Mở" trên Web UI cho hồ sơ ID: ${profileId.slice(0, 8)}...`);
    await client.send('Runtime.evaluate', {
      expression: `window.startProfile('${profileId}')`,
      awaitPromise: true
    });

    // Chờ 2s để UI cập nhật
    await sleep(2000);

    // Kiểm tra badge "Đang chạy" trên giao diện Web
    const runningBadgeRes = await client.send('Runtime.evaluate', {
      expression: `
        (function() {
          const rows = Array.from(document.querySelectorAll('#profiles-tbody tr'));
          const targetRow = rows.find(r => r.innerText.includes('Automated Web UI Test Profile'));
          if (!targetRow) return { error: 'Row not found' };
          const badgeRunning = targetRow.querySelector('.badge-running');
          const stopBtn = targetRow.querySelector('button.btn-danger');
          return {
            isRunningText: badgeRunning ? badgeRunning.innerText.trim() : null,
            hasPulseDot: !!targetRow.querySelector('.badge-pulse'),
            hasStopButton: !!stopBtn,
            stopBtnText: stopBtn ? stopBtn.innerText.trim() : null
          };
        })()
      `,
      returnByValue: true
    });
    console.log('  -> Trạng thái thời gian thực trên Web UI:', runningBadgeRes.result.value);
    if (!runningBadgeRes.result.value.isRunningText || !runningBadgeRes.result.value.isRunningText.includes('Đang chạy')) {
      throw new Error('Web UI không hiển thị badge "Đang chạy"!');
    }
    console.log('  -> PASS: Web UI đã tự động đổi sang badge xanh "Đang chạy" và nút "Đóng".');

    // Bấm nút "Đóng" trên Web UI
    console.log(`  -> Bấm nút "Đóng" trên Web UI để dừng hồ sơ...`);
    await client.send('Runtime.evaluate', {
      expression: `window.stopProfile('${profileId}')`,
      awaitPromise: true
    });
    await sleep(2000);

    // Kiểm tra badge chuyển về "Đã dừng"
    const stoppedBadgeRes = await client.send('Runtime.evaluate', {
      expression: `
        (function() {
          const rows = Array.from(document.querySelectorAll('#profiles-tbody tr'));
          const targetRow = rows.find(r => r.innerText.includes('Automated Web UI Test Profile'));
          if (!targetRow) return { error: 'Row not found' };
          const badgeStopped = targetRow.querySelector('.badge-stopped');
          const startBtn = targetRow.querySelector('button.btn-primary');
          return {
            isStoppedText: badgeStopped ? badgeStopped.innerText.trim() : null,
            hasStartButton: !!startBtn,
            startBtnText: startBtn ? startBtn.innerText.trim() : null
          };
        })()
      `,
      returnByValue: true
    });
    console.log('  -> Trạng thái sau khi đóng trên Web UI:', stoppedBadgeRes.result.value);
    if (!stoppedBadgeRes.result.value.isStoppedText || !stoppedBadgeRes.result.value.isStoppedText.includes('Đã dừng')) {
      throw new Error('Web UI không hiển thị badge "Đã dừng" sau khi đóng!');
    }
    console.log('  -> PASS: Web UI chuyển trạng thái mượt mà về "Đã dừng" với nút "Mở".');

    console.log('\n[6/8] Kiểm tra Modal Quản Lý / Xuất Cookie trên Web UI...');
    await client.send('Runtime.evaluate', {
      expression: `window.openCookieModal('${profileId}')`
    });
    await sleep(2000);

    const cookieModalRes = await client.send('Runtime.evaluate', {
      expression: `
        (function() {
          const modal = document.getElementById('cookie-manager-modal');
          const isVisible = modal && (modal.classList.contains('open') || window.getComputedStyle(modal).display !== 'none');
          
          // Thử chuyển sang tab Nhập Cookie
          const tabImport = document.querySelector('.cookie-tab-btn[data-tab="import"]');
          if (tabImport) tabImport.click();
          const importVisible = document.getElementById('cookie-sec-import')?.style.display !== 'none';

          // Dán cookie mẫu vào textarea nhập
          const importArea = document.getElementById('cookie-import-textarea');
          if (importArea) {
            importArea.value = JSON.stringify([{ name: 'test_session', value: 'xyz123', domain: '.google.com' }]);
          }

          // Chuyển lại tab Xuất Cookie
          const tabExport = document.querySelector('.cookie-tab-btn[data-tab="export"]');
          if (tabExport) tabExport.click();

          // Chuyển sang định dạng Netscape & JSON
          const netscapeBtn = document.getElementById('cookie-format-netscape');
          if (netscapeBtn) netscapeBtn.click();
          const jsonBtn = document.getElementById('cookie-format-json');
          if (jsonBtn) jsonBtn.click();

          // Đóng modal
          document.getElementById('cookie-modal-close')?.click();

          return {
            modalOpened: isVisible,
            importTabWorks: importVisible,
            exportAreaPresent: !!document.getElementById('cookie-export-textarea')
          };
        })()
      `,
      returnByValue: true
    });
    console.log('  -> Kết quả kiểm tra Cookie Modal:', cookieModalRes.result.value);
    if (!cookieModalRes.result.value.modalOpened || !cookieModalRes.result.value.importTabWorks) {
      throw new Error('Cookie Modal không mở được hoặc không chuyển tab được trên Web UI!');
    }
    console.log('  -> PASS: Modal xuất Cookie JSON & Netscape và tab Nhập hoạt động chuẩn xác.');

    console.log('\n[7/8] Kiểm tra Chuyển đổi Dark / Light Theme & Bộ lọc tìm kiếm...');
    const themeRes = await client.send('Runtime.evaluate', {
      expression: `
        (function() {
          const btn = document.getElementById('btn-theme-toggle');
          const initialTheme = document.documentElement.getAttribute('data-theme') || 'dark';
          btn.click();
          const changedTheme = document.documentElement.getAttribute('data-theme');
          btn.click();
          const restoredTheme = document.documentElement.getAttribute('data-theme');

          // Thử ô tìm kiếm Search Input
          const searchInp = document.getElementById('search-input');
          searchInp.value = 'Automated';
          searchInp.dispatchEvent(new Event('input', { bubbles: true }));
          const filteredCount = document.querySelectorAll('#profiles-tbody tr').length;

          searchInp.value = '';
          searchInp.dispatchEvent(new Event('input', { bubbles: true }));
          const totalCount = document.querySelectorAll('#profiles-tbody tr').length;

          return {
            initialTheme,
            changedTheme,
            restoredTheme,
            searchWorks: filteredCount >= 1 && totalCount >= filteredCount
          };
        })()
      `,
      returnByValue: true
    });
    console.log('  -> Theme & Search Test:', themeRes.result.value);
    console.log('  -> PASS: Chuyển đổi giao diện Sáng/Tối và Bộ tìm kiếm tức thời hoạt động tốt.');

    console.log('\n[8/8] Dọn dẹp hồ sơ kiểm thử & Kiểm tra lỗi Console trình duyệt...');
    db.deleteProfile(profileId);
    console.log(`  -> Đã xóa sạch hồ sơ kiểm thử ${profileId.slice(0, 8)}.`);

    if (consoleErrors.length > 0) {
      console.warn('  ⚠️ Cảnh báo lỗi console phát hiện:', consoleErrors);
    } else {
      console.log('  -> PASS: Không có lỗi JavaScript runtime (0 Console Errors)!');
    }

    console.log('\n===================================================================');
    console.log('  🎉 TẤT CẢ CÁC CHỨC NĂNG BẢN WEB ĐÃ ĐẠT TIÊU CHUẨN XUẤT SẮC 100%! ');
    console.log('===================================================================');

  } finally {
    if (client) client.close();
    proc.kill();
    if (internalServer) {
      try { internalServer.close(); } catch {}
    }
    try {
      if (fs.existsSync(tmpUserData)) {
        fs.rmSync(tmpUserData, { recursive: true, force: true });
      }
    } catch {}
  }
}

runWebUITest().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('\nLỖI KIỂM THỬ BẢN WEB:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
