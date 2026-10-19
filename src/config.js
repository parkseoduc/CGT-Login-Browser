const path = require('node:path');
const fs = require('node:fs');

const BASE_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(BASE_DIR, 'data');
const PROFILES_DIR = path.join(DATA_DIR, 'profiles');
const DB_PATH = path.join(DATA_DIR, 'antidetect.db');

const { execSync } = require('node:child_process');

// Danh sách các ứng viên nhân Chromium trên nhiều môi trường khác nhau
function getKernelCandidates() {
  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const isLinux = process.platform === 'linux';

  const candidates = [];

  // 1. Nhân Chromium di động đặt trong dự án (nếu có - ưu tiên cao nhất)
  candidates.push({
    id: 'local-portable-chromium',
    name: 'MyBrowser 153 Portable (bin/chromium)',
    path: path.join(BASE_DIR, 'bin', 'chromium', isWin ? 'chrome.exe' : 'chrome'),
    isPrimary: true,
  });

  if (isWin) {
    const localAppData = process.env.LOCALAPPDATA || '';
    const progFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
    const progFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

    // MyBrowser Custom Build (môi trường nhà phát triển)
    candidates.push({
      id: 'custom-chromium-153',
      name: 'MyBrowser 153 (Custom Bypass Iphey)',
      path: 'E:\\Chromium_Workspace\\src\\out\\Default\\chrome.exe',
      isPrimary: true,
    });

    // Poly Browser (nếu máy có cài đặt PolyLogin)
    candidates.push({
      id: 'poly-browser-150',
      name: 'Poly Browser 150',
      path: path.join(localAppData, 'AntiBrowser', 'kernels', 'chromium', '150', 'Poly Browser.exe'),
      isPrimary: false,
    });
    candidates.push({
      id: 'poly-browser-140',
      name: 'Poly Browser 140',
      path: path.join(localAppData, 'AntiBrowser', 'kernels', 'chromium', '140', 'Poly Browser.exe'),
      isPrimary: false,
    });

    // Google Chrome chính thức (64-bit, 32-bit, User LocalAppData)
    candidates.push({
      id: 'google-chrome-64',
      name: 'Google Chrome (64-bit)',
      path: path.join(progFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      isPrimary: false,
    });
    candidates.push({
      id: 'google-chrome-32',
      name: 'Google Chrome (32-bit)',
      path: path.join(progFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      isPrimary: false,
    });
    candidates.push({
      id: 'google-chrome-user',
      name: 'Google Chrome (User AppData)',
      path: path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      isPrimary: false,
    });

    // Microsoft Edge (Có sẵn 100% trên mọi máy Windows 10/11)
    candidates.push({
      id: 'msedge-32',
      name: 'Microsoft Edge (System 32-bit)',
      path: path.join(progFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      isPrimary: false,
    });
    candidates.push({
      id: 'msedge-64',
      name: 'Microsoft Edge (System 64-bit)',
      path: path.join(progFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      isPrimary: false,
    });
    candidates.push({
      id: 'msedge-user',
      name: 'Microsoft Edge (User AppData)',
      path: path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      isPrimary: false,
    });

    // Brave Browser
    candidates.push({
      id: 'brave-system',
      name: 'Brave Browser (Program Files)',
      path: path.join(progFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
      isPrimary: false,
    });
    candidates.push({
      id: 'brave-user',
      name: 'Brave Browser (User AppData)',
      path: path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
      isPrimary: false,
    });

    // Cốc Cốc Browser
    candidates.push({
      id: 'coccoc-user',
      name: 'Cốc Cốc Browser (User AppData)',
      path: path.join(localAppData, 'CocCoc', 'Browser', 'Application', 'browser.exe'),
      isPrimary: false,
    });
    candidates.push({
      id: 'coccoc-system',
      name: 'Cốc Cốc Browser (Program Files)',
      path: path.join(progFiles, 'CocCoc', 'Browser', 'Application', 'browser.exe'),
      isPrimary: false,
    });
  } else if (isMac) {
    candidates.push({
      id: 'mac-chrome',
      name: 'Google Chrome',
      path: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      isPrimary: true,
    });
    candidates.push({
      id: 'mac-edge',
      name: 'Microsoft Edge',
      path: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      isPrimary: false,
    });
    candidates.push({
      id: 'mac-brave',
      name: 'Brave Browser',
      path: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      isPrimary: false,
    });
    candidates.push({
      id: 'mac-chromium',
      name: 'Chromium',
      path: '/Applications/Chromium.app/Contents/MacOS/Chromium',
      isPrimary: false,
    });
  } else if (isLinux) {
    candidates.push({
      id: 'linux-chrome',
      name: 'Google Chrome',
      path: '/usr/bin/google-chrome',
      isPrimary: true,
    });
    candidates.push({
      id: 'linux-chrome-stable',
      name: 'Google Chrome Stable',
      path: '/usr/bin/google-chrome-stable',
      isPrimary: false,
    });
    candidates.push({
      id: 'linux-chromium',
      name: 'Chromium',
      path: '/usr/bin/chromium',
      isPrimary: false,
    });
    candidates.push({
      id: 'linux-chromium-browser',
      name: 'Chromium Browser',
      path: '/usr/bin/chromium-browser',
      isPrimary: false,
    });
  }

  return candidates;
}

function getAvailableKernels() {
  const candidates = getKernelCandidates();
  const list = [];
  const seenPaths = new Set();

  for (const k of candidates) {
    if (seenPaths.has(k.path)) continue;
    seenPaths.add(k.path);
    list.push({
      ...k,
      exists: fs.existsSync(k.path),
    });
  }

  // Nếu trong danh sách ứng viên không có cái nào tồn tại, thử tìm nhanh trong biến môi trường PATH
  const hasAny = list.some(k => k.exists);
  if (!hasAny) {
    try {
      const isWin = process.platform === 'win32';
      const cmd = isWin ? 'where.exe chrome.exe' : 'which google-chrome || which chromium';
      const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      const firstLine = out.split(/\r?\n/)[0]?.trim();
      if (firstLine && fs.existsSync(firstLine)) {
        list.unshift({
          id: 'path-detected-chrome',
          name: 'Chromium (Phát hiện từ PATH)',
          path: firstLine,
          isPrimary: true,
          exists: true,
        });
      }
    } catch {}
  }

  return list;
}

function getDefaultKernelPath() {
  const available = getAvailableKernels().filter(k => k.exists);
  if (available.length > 0) {
    // Ưu tiên: Portable Chromium trong bin/chromium -> Custom Build ngoài -> Google Chrome -> Microsoft Edge -> Khác
    const portable = available.find(k => k.id === 'local-portable-chromium');
    if (portable) return portable.path;
    const custom = available.find(k => k.id.includes('custom'));
    if (custom) return custom.path;
    const chrome = available.find(k => k.id.includes('chrome'));
    if (chrome) return chrome.path;
    const edge = available.find(k => k.id.includes('edge') || k.id.includes('msedge'));
    if (edge) return edge.path;
    return available[0].path;
  }
  return '';
}

const EXTENSIONS_DIR = path.join(DATA_DIR, 'extensions');

// Khởi tạo thư mục dữ liệu nếu chưa có
function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(PROFILES_DIR)) fs.mkdirSync(PROFILES_DIR, { recursive: true });
  if (!fs.existsSync(EXTENSIONS_DIR)) fs.mkdirSync(EXTENSIONS_DIR, { recursive: true });
}

module.exports = {
  BASE_DIR,
  DATA_DIR,
  PROFILES_DIR,
  EXTENSIONS_DIR,
  DB_PATH,
  API_PORT: 51888,
  getAvailableKernels,
  getDefaultKernelPath,
  ensureDirectories,
};
