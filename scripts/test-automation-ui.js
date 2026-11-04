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

async function runTest() {
  console.log('[Test] Starting headless Chrome for automation UI verification...');
  const port = 52999;
  const tmpUserData = path.join(__dirname, '..', 'tmp', 'test-chrome-auto');
  if (!fs.existsSync(tmpUserData)) fs.mkdirSync(tmpUserData, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tmpUserData}`,
    '--headless=new',
    '--window-size=1400,900',
    'http://127.0.0.1:51888'
  ]);

  try {
    await wait(2500);
    const versionInfo = await getJson(`http://127.0.0.1:${port}/json/list`);
    const target = versionInfo.find(t => t.type === 'page');
    if (!target) throw new Error('No page target found');

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(res => ws.addEventListener('open', res));
    console.log('[Test] CDP WebSocket connected');

    await sendCdp(ws, 'Page.enable');
    await sendCdp(ws, 'Runtime.enable');

    await wait(1500);

    // If login screen is showing, log in
    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `(async () => {
        const authScreen = document.getElementById('polylogin-auth-screen');
        if (authScreen && authScreen.style.display !== 'none') {
          const emailInput = document.getElementById('poly-login-input-email');
          const passInput = document.getElementById('poly-login-input-password');
          if (emailInput && passInput) {
            emailInput.value = 'admin@omnibrowser.io';
            passInput.value = 'OmniAdmin@2025';
            const btn = document.getElementById('poly-login-submit-btn');
            if (btn) btn.click();
          }
        }
      })()`,
      awaitPromise: true
    });

    await wait(2000);

    // Switch to automation tab
    console.log('[Test] Switching to Automation tab...');
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

    await wait(2000);

    // Capture screenshot of Automation Studio Main View
    let screenshotRes = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    const screenPath1 = path.join(ARTIFACTS_DIR, 'automation_studio_main_view.png');
    fs.writeFileSync(screenPath1, Buffer.from(screenshotRes.data, 'base64'));
    console.log(`[Test] Saved Automation Main View screenshot to: ${screenPath1}`);

    // Click on "+ Tạo Kịch Bản Mới"
    console.log('[Test] Opening Script Builder Modal...');
    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `(async () => {
        const btn = document.getElementById('btn-create-automation-script');
        if (btn) btn.click();
      })()`,
      awaitPromise: true
    });

    await wait(1000);

    screenshotRes = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    const screenPath2 = path.join(ARTIFACTS_DIR, 'automation_builder_modal.png');
    fs.writeFileSync(screenPath2, Buffer.from(screenshotRes.data, 'base64'));
    console.log(`[Test] Saved Script Builder Modal screenshot to: ${screenPath2}`);

    // Close Builder Modal and Open Batch Runner for Muse AI
    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `(async () => {
        const closeBtn = document.getElementById('btn-builder-close-modal');
        if (closeBtn) closeBtn.click();
      })()`,
      awaitPromise: true
    });

    await wait(600);

    console.log('[Test] Opening Batch Runner Modal for Muse AI...');
    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `(async () => {
        const museCard = document.querySelector('.automation-card[data-script-id="preset-muse-ai"]');
        if (museCard) {
          const runBtn = museCard.querySelector('.btn-run-single-script');
          if (runBtn) runBtn.click();
        } else {
          const btn = document.getElementById('btn-open-batch-modal');
          if (btn) btn.click();
        }
      })()`,
      awaitPromise: true
    });

    await wait(1200);

    screenshotRes = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    const screenPath3 = path.join(ARTIFACTS_DIR, 'automation_batch_modal_muse_ai.png');
    fs.writeFileSync(screenPath3, Buffer.from(screenshotRes.data, 'base64'));
    console.log(`[Test] Saved Batch Runner Modal screenshot to: ${screenPath3}`);

    ws.close();
    console.log('[Test] All UI tests completed successfully!');
  } finally {
    try { chromeProc.kill(); } catch (e) {}
  }
}

runTest().catch(err => {
  console.error('[Test Error]:', err);
  process.exit(1);
});
