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
  const port = 52888;
  const tmpUserData = path.join(__dirname, '..', 'tmp', 'test-chrome-verify');
  if (!fs.existsSync(tmpUserData)) fs.mkdirSync(tmpUserData, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tmpUserData}`,
    '--headless=new',
    '--window-size=1400,920',
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

    // Auto login if auth screen is present
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

    // Capture Automation cards grid
    let shot1 = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'verify_automation_cards_grid.png'), Buffer.from(shot1.data, 'base64'));
    console.log('Saved verify_automation_cards_grid.png');

    // Open detail modal for iphey audit (just like the user's screenshot!)
    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `(async () => {
        if (window.AutomationUI && window.AutomationUI.openBuilderModal) {
          window.AutomationUI.openBuilderModal('sys_iphey_audit');
        }
      })()`,
      awaitPromise: true
    });
    await wait(1000);

    // Capture Builder Modal
    let shot2 = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'verify_modal_builder.png'), Buffer.from(shot2.data, 'base64'));
    console.log('Saved verify_modal_builder.png');

    ws.close();
  } finally {
    chromeProc.kill('SIGKILL');
  }
}

run().catch(console.error);
