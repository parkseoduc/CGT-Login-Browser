/**
 * Desktop Smart Launcher for OmniBrowser Antidetect Hub
 * 
 * Supports:
 * 1. Electron Desktop Window (Priority 1 if electron is installed)
 * 2. Native Chromium/Edge App Mode Window (Priority 2, 0-install standalone desktop window)
 * 3. Automatic Backend Life-cycle Management (port 51888 check & auto-launch)
 */

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');

const PORT = 51888;
const ROOT_DIR = path.resolve(__dirname, '..');

function checkServerReady(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/v1/status`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(port, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    const ready = await checkServerReady(port);
    if (ready) return true;
    await new Promise((r) => setTimeout(r, 350));
  }
  return false;
}

function findAppModeBrowser() {
  const progFiles = process.env['PROGRAMFILES'] || 'C:\\Program Files';
  const progFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
  const localAppData = process.env['LOCALAPPDATA'] || '';

  const candidates = [
    // 1. Google Chrome
    path.join(progFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(progFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    // 2. Microsoft Edge (standard on all Windows 10/11)
    path.join(progFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(progFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    // 3. Bundled custom Chromium kernel if downloaded
    path.join(ROOT_DIR, 'bin', 'chromium', 'chrome.exe')
  ];

  for (const p of candidates) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

async function main() {
  console.log('============================================================');
  console.log('  🚀 OmniBrowser Antidetect Hub - Desktop Launcher');
  console.log('============================================================\n');

  let serverProc = null;
  // 1. Check & ensure backend is running
  const isUp = await checkServerReady(PORT);
  if (!isUp) {
    console.log('[Launcher] Dang khoi dong Backend Engine tren cong ' + PORT + '...');
    serverProc = spawn(process.execPath, ['--experimental-sqlite', path.join(ROOT_DIR, 'src', 'index.js')], {
      cwd: ROOT_DIR,
      detached: true,
      stdio: 'ignore'
    });
    serverProc.unref();

    console.log('[Launcher] Cho he thong Backend khoi tao...');
    const ready = await waitForServer(PORT);
    if (ready) {
      console.log('[Launcher] Backend da san sang hoat dong!');
    } else {
      console.warn('[Launcher] Canh bao: Backend mat nhieu thoi gian hon du kien, tiep tuc mo giao dien...');
    }
  } else {
    console.log('[Launcher] Da ket noi den Backend Engine dang chay (Port ' + PORT + ')');
  }

  // 2. Priority 1: Electron Desktop Window
  const forceAppMode = process.argv.includes('--app-mode') || process.argv.includes('--native');
  const electronExe = path.join(ROOT_DIR, 'node_modules', 'electron', 'dist', 'electron.exe');
  if (!forceAppMode && fs.existsSync(electronExe)) {
    console.log('[Launcher] Khoi chay cua so ung dung Desktop qua Electron...');
    const electronProc = spawn(electronExe, [path.join(__dirname, 'main.js')], {
      cwd: ROOT_DIR,
      stdio: 'inherit'
    });
    electronProc.on('exit', (code) => {
      process.exit(code || 0);
    });
    return;
  }

  // 3. Priority 2: Native Chromium/Edge App Mode
  // Launches a borderless standalone app window without browser tabs or URL address bar
  const browserExe = findAppModeBrowser();
  if (browserExe) {
    console.log('[Launcher] Khoi chay cua so Desktop qua Native App Mode (' + path.basename(browserExe) + ')...');
    const userDataDir = path.join(process.env['LOCALAPPDATA'] || ROOT_DIR, 'OmniBrowserDesktop', 'app-session');

    const appArgs = [
      `--app=http://127.0.0.1:${PORT}`,
      '--window-size=1360,860',
      '--window-position=center',
      `--user-data-dir=${userDataDir}`,
      '--app-id=OmniBrowserHub',
      '--disable-extensions',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-mode',
      '--disable-breakpad',
      '--disable-crash-reporter',
      '--noerrdialogs'
    ];

    const child = spawn(browserExe, appArgs, {
      cwd: ROOT_DIR,
      detached: false,
      stdio: 'ignore'
    });

    console.log('[Launcher] Cua so ung dung Desktop da mo thanh cong!');
    console.log('           (Cua so rieng biet, khong the tab, khong thanh dia chi URL)');

    child.on('exit', () => {
      console.log('[Launcher] Cua so Desktop da dong. Dang thu hoi toan bo tai nguyen...');
      try {
        const req = http.request({
          hostname: '127.0.0.1',
          port: PORT,
          path: '/api/v1/profiles/stop-all',
          method: 'POST',
          timeout: 1500
        });
        req.on('error', () => {});
        req.end();
      } catch {}

      if (serverProc && serverProc.pid) {
        try {
          const { execSync } = require('node:child_process');
          execSync(`taskkill.exe /PID ${serverProc.pid} /T /F`, { stdio: 'ignore' });
        } catch {}
      }

      setTimeout(() => {
        process.exit(0);
      }, 500);
    });
    return;
  }

  // 4. Fallback: Default Browser
  console.log('[Launcher] Mo giao dien tren trinh duyet mac dinh...');
  const startCmd = process.platform === 'win32' ? 'start' : 'open';
  spawn(startCmd, [`http://127.0.0.1:${PORT}`], { shell: true, stdio: 'ignore' });
}

main().catch((err) => {
  console.error('[Launcher] Loi khoi chay:', err);
  process.exit(1);
});
