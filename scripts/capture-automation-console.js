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

async function captureConsole() {
  const port = 52998;
  const tmpUserData = path.join(__dirname, '..', 'tmp', 'test-chrome-auto2');
  if (!fs.existsSync(tmpUserData)) fs.mkdirSync(tmpUserData, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tmpUserData}`,
    '--headless=new',
    '--window-size=1400,950',
    'http://127.0.0.1:51888'
  ]);

  try {
    await wait(2500);
    const versionInfo = await getJson(`http://127.0.0.1:${port}/json/list`);
    const target = versionInfo.find(t => t.type === 'page');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(res => ws.addEventListener('open', res));

    await sendCdp(ws, 'Page.enable');
    await sendCdp(ws, 'Runtime.enable');
    await wait(1500);

    // Login
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

    await wait(1500);

    // Switch to automation tab and trigger status render
    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `(async () => {
        if (typeof window.switchTab === 'function') {
          window.switchTab('automation');
        }
        if (window.AutomationUI) {
          window.AutomationUI.checkStatus();
        }
      })()`,
      awaitPromise: true
    });

    await wait(2000);

    // Capture screenshot showing Live Console & Grid
    const screenshotRes = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    const screenPath = path.join(ARTIFACTS_DIR, 'automation_live_terminal_console.png');
    fs.writeFileSync(screenPath, Buffer.from(screenshotRes.data, 'base64'));
    console.log(`[Test] Saved Live Terminal screenshot to: ${screenPath}`);

    ws.close();
  } finally {
    try { chromeProc.kill(); } catch (e) {}
  }
}

captureConsole().catch(err => console.error(err));
