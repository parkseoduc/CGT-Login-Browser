const path = require('node:path');
const fs = require('node:fs');

const BASE_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(BASE_DIR, 'data');
const PROFILES_DIR = path.join(DATA_DIR, 'profiles');
const DB_PATH = path.join(DATA_DIR, 'antidetect.db');

// Danh sách các nhân Chromium ưu tiên
const KERNEL_CANDIDATES = [
  {
    id: 'custom-chromium-153',
    name: 'MyBrowser (Chromium 153 Custom Build)',
    path: 'E:\\Chromium_Workspace\\src\\out\\Default\\chrome.exe',
    isPrimary: true,
  },
  {
    id: 'poly-browser-150',
    name: 'Poly Browser 150',
    path: path.join(process.env.LOCALAPPDATA || '', 'AntiBrowser', 'kernels', 'chromium', '150', 'Poly Browser.exe'),
    isPrimary: false,
  },
  {
    id: 'poly-browser-140',
    name: 'Poly Browser 140',
    path: path.join(process.env.LOCALAPPDATA || '', 'AntiBrowser', 'kernels', 'chromium', '140', 'Poly Browser.exe'),
    isPrimary: false,
  },
  {
    id: 'system-chrome',
    name: 'Google Chrome (System)',
    path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    isPrimary: false,
  }
];

function getAvailableKernels() {
  return KERNEL_CANDIDATES.map(k => ({
    ...k,
    exists: fs.existsSync(k.path),
  }));
}

function getDefaultKernelPath() {
  for (const k of KERNEL_CANDIDATES) {
    if (fs.existsSync(k.path)) {
      return k.path;
    }
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
