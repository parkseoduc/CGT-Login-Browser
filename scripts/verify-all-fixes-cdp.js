const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACTS_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\f1d304f6-0f1e-4601-9cf9-1f2a35f863dd";

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function sendCdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function run() {
  const port = 52777;
  const tmpUserData = path.join(__dirname, '..', 'tmp', 'test-chrome-fixes');
  if (!fs.existsSync(tmpUserData)) fs.mkdirSync(tmpUserData, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tmpUserData}`,
    '--headless=new',
    '--window-size=1440,960',
    'http://127.0.0.1:51888'
  ]);

  try {
    await wait(2500);
    const targets = await getJson(`http://127.0.0.1:${port}/json/list`);
    const pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget) throw new Error('Page target not found');

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise(r => ws.addEventListener('open', r));

    await sendCdp(ws, 'Page.enable');
    await sendCdp(ws, 'Runtime.enable');
    await wait(1000);

    // Auto login
    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `(async () => {
        const auth = document.getElementById('polylogin-auth-screen');
        if (auth && auth.style.display !== 'none') {
          const email = document.getElementById('poly-login-input-email');
          const pass = document.getElementById('poly-login-input-password');
          if (email && pass) {
            email.value = 'admin@omnibrowser.io';
            pass.value = 'OmniAdmin@2025';
            const btn = document.getElementById('poly-login-submit-btn');
            if (btn) btn.click();
          }
        }
      })()`,
      awaitPromise: true
    });
    await wait(1500);

    // Switch to automation tab
    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `(async () => {
        if (typeof window.switchTab === 'function') {
          window.switchTab('automation');
        } else {
          const nav = document.querySelector('.nav-item[data-tab="automation"]');
          if (nav) nav.click();
        }
      })()`,
      awaitPromise: true
    });
    await wait(1500);

    // Capture screenshot 1: Top bar & Cards (Check "+ Tạo Kịch Bản Mới" NO double plus, and "Dừng Tiến Trình" NO emoji)
    let shot1 = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'fixed_automation_topbar_and_grid.png'), Buffer.from(shot1.data, 'base64'));
    console.log('Saved fixed_automation_topbar_and_grid.png');

    // Open detail modal for sys_iphey_audit
    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `(async () => {
        if (window.AutomationUI && window.AutomationUI.openBuilderModal) {
          window.AutomationUI.openBuilderModal('sys_iphey_audit');
        }
      })()`,
      awaitPromise: true
    });
    await wait(1000);

    // Capture screenshot 2: Modal Builder (Check Header, Category Select, Direction select, Up/Down/Delete buttons)
    let shot2 = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'fixed_modal_builder_layout.png'), Buffer.from(shot2.data, 'base64'));
    console.log('Saved fixed_modal_builder_layout.png');

    // Trigger Modern Toast Notification ("Đã lưu kịch bản thành công!")
    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `(async () => {
        if (typeof window.showToast === 'function') {
          window.showToast('Đã lưu kịch bản thành công!', 'success');
        }
      })()`,
      awaitPromise: true
    });
    await wait(500);

    // Capture screenshot 3: Modern Toast Notification floating at top-right
    let shot3 = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'fixed_modern_toast_notification.png'), Buffer.from(shot3.data, 'base64'));
    console.log('Saved fixed_modern_toast_notification.png');

    ws.close();
  } finally {
    chromeProc.kill('SIGKILL');
  }
}

run().catch(console.error);
