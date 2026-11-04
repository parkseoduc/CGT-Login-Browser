const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACTS_DIR = "C:\\Users\\Admin\\.gemini\antigravity\\brain\\f1d304f6-0f1e-4601-9cf9-1f2a35f863dd";

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
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

async function verify() {
  const port = 52555;
  const tmpUserData = path.join(__dirname, '..', 'tmp', 'test-chrome-verify-final');
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
    const targets = await getJson(`http://127.0.0.1:${port}/json/list`);
    const pageTarget = targets.find(t => t.type === 'page');
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
            document.getElementById('poly-login-submit-btn').click();
          }
        }
      })()`,
      awaitPromise: true
    });
    await wait(1500);

    // 1. Switch to automation tab and open Muse AI modal
    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `(async () => {
        if (typeof window.switchTab === 'function') window.switchTab('automation');
        else document.querySelector('.nav-item[data-tab="automation"]').click();
      })()`,
      awaitPromise: true
    });
    await wait(1500);

    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `(async () => {
        if (window.AutomationUI && window.AutomationUI.openBuilderModal) {
          window.AutomationUI.openBuilderModal('sys_muse_ai');
        }
      })()`,
      awaitPromise: true
    });
    await wait(1000);

    // Capture screenshot 1: Muse AI Builder Modal (Verify title, no gap, clean category select)
    let shot1 = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:/Users/Admin/.gemini/antigravity/brain/f1d304f6-0f1e-4601-9cf9-1f2a35f863dd/verified_muse_ai_modal_fixed.png', Buffer.from(shot1.data, 'base64'));
    console.log('Saved verified_muse_ai_modal_fixed.png');

    // 2. Switch to Extensions tab and open Extension Upload Modal
    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `(async () => {
        // Close builder modal
        const closeBtn = document.getElementById('btn-builder-close-modal');
        if (closeBtn) closeBtn.click();
        
        // Switch to extensions tab
        if (typeof window.switchTab === 'function') window.switchTab('extensions');
        else document.querySelector('.nav-item[data-tab="extensions"]').click();
      })()`,
      awaitPromise: true
    });
    await wait(1500);

    // Click on "+ Thêm Tiện Ích"
    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `(async () => {
        const btnAdd = document.getElementById('btn-add-extension');
        if (btnAdd) btnAdd.click();
      })()`,
      awaitPromise: true
    });
    await wait(800);

    // Capture screenshot 2: Extension Modal (Check "Duyệt Thư Mục" with NO prompt popup!)
    let shot2 = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:/Users/Admin/.gemini/antigravity/brain/f1d304f6-0f1e-4601-9cf9-1f2a35f863dd/verified_extension_modal_clean.png', Buffer.from(shot2.data, 'base64'));
    console.log('Saved verified_extension_modal_clean.png');

    ws.close();
  } finally {
    chromeProc.kill('SIGKILL');
  }
}

verify().catch(console.error);
