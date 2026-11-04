const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise((res, rej) => {
    http.get(url, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
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

async function debugHeader() {
  const port = 52666;
  const tmpUserData = path.join(__dirname, '..', 'tmp', 'test-chrome-debug');
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

    // Open Muse AI script detail in builder modal
    const info = await sendCdp(ws, 'Runtime.evaluate', {
      expression: `(() => {
        window.AutomationUI.openBuilderModal('sys_muse_ai');
        const h2 = document.getElementById('builder-modal-title');
        const select = document.getElementById('builder-script-category');
        return {
          h2Html: h2 ? h2.innerHTML : null,
          h2ComputedStyle: h2 ? window.getComputedStyle(h2).cssText : null,
          parentDivHtml: h2 ? h2.parentElement.parentElement.innerHTML : null,
          selectOptions: select ? Array.from(select.options).map(o => o.text) : null
        };
      })()`,
      returnByValue: true
    });

    console.log('DEBUG INFO:', JSON.stringify(info.result.value, null, 2));
    ws.close();
  } finally {
    chromeProc.kill('SIGKILL');
  }
}

debugHeader().catch(console.error);
