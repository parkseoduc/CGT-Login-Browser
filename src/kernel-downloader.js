const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const { exec, spawn } = require('node:child_process');
const config = require('./config');

const CHROMIUM_DIR = path.join(config.BASE_DIR, 'bin', 'chromium');
const TEMP_ZIP = path.join(config.BASE_DIR, 'bin', 'temp_kernel.zip');
const DEFAULT_CLOUD_KERNEL_URL = 'https://github.com/parkseoduc/CGT-Login-Browser/releases/download/v2.0-kernel/MyBrowser-153-win64.zip';

let currentTask = {
  status: 'idle', // 'idle' | 'downloading' | 'extracting' | 'completed' | 'error'
  progress: 0,
  downloadedBytes: 0,
  totalBytes: 0,
  speed: '0 KB/s',
  error: null,
  activeRequest: null,
  startTime: null,
  lastBytes: 0,
  lastTime: null,
};

function getKernelStatus() {
  const isWin = process.platform === 'win32';
  const targetExe = path.join(CHROMIUM_DIR, isWin ? 'chrome.exe' : 'chrome');
  const isInstalled = fs.existsSync(targetExe);

  let kernelSizeMb = 0;
  if (isInstalled) {
    try {
      const stat = fs.statSync(targetExe);
      kernelSizeMb = Math.round(stat.size / 1024 / 1024);
    } catch {}
  }

  return {
    isInstalled,
    kernelPath: isInstalled ? targetExe : null,
    kernelDir: CHROMIUM_DIR,
    kernelVersion: isInstalled ? '153.0.7993.0 (Custom Build)' : null,
    cloudUrl: DEFAULT_CLOUD_KERNEL_URL,
    downloadTask: {
      status: currentTask.status,
      progress: currentTask.progress,
      downloadedBytes: currentTask.downloadedBytes,
      totalBytes: currentTask.totalBytes,
      speed: currentTask.speed,
      error: currentTask.error,
    },
  };
}

function cancelDownload() {
  if (currentTask.activeRequest) {
    try {
      currentTask.activeRequest.destroy();
    } catch {}
  }
  if (fs.existsSync(TEMP_ZIP)) {
    try { fs.unlinkSync(TEMP_ZIP); } catch {}
  }
  currentTask.status = 'idle';
  currentTask.progress = 0;
  currentTask.downloadedBytes = 0;
  currentTask.totalBytes = 0;
  currentTask.speed = '0 KB/s';
  currentTask.activeRequest = null;
  return { success: true, message: 'Đã hủy tiến trình tải kernel' };
}

// Giải nén file zip vào bin/chromium
async function extractZip(zipFilePath, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    // Thử dùng bsdtar (tar.exe) nhanh gấp 10 lần PowerShell Expand-Archive
    exec(`tar.exe -xf "${zipFilePath}" -C "${destDir}"`, { windowsHide: true }, (err) => {
      if (!err) {
        normalizeKernelDir(destDir);
        return resolve();
      }

      // Fallback sang PowerShell Expand-Archive
      console.warn('[Kernel Extractor] tar.exe gặp lỗi, chuyển sang Expand-Archive:', err.message);
      const psCmd = `Expand-Archive -Path "${zipFilePath}" -DestinationPath "${destDir}" -Force`;
      exec(`powershell -NoProfile -Command "${psCmd}"`, { windowsHide: true }, (errPs) => {
        if (errPs) {
          return reject(new Error(`Giải nén thất bại: ${errPs.message}`));
        }
        normalizeKernelDir(destDir);
        resolve();
      });
    });
  });
}

// Nếu bên trong file zip có thư mục con (ví dụ: staging-chromium/chrome.exe), đưa tất cả ra ngoài destDir
function normalizeKernelDir(destDir) {
  const isWin = process.platform === 'win32';
  const targetExeName = isWin ? 'chrome.exe' : 'chrome';
  const directExe = path.join(destDir, targetExeName);
  if (fs.existsSync(directExe)) return;

  const entries = fs.readdirSync(destDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const nestedDir = path.join(destDir, entry.name);
      const nestedExe = path.join(nestedDir, targetExeName);
      if (fs.existsSync(nestedExe)) {
        // Di chuyển tất cả các file từ nestedDir ra destDir
        const subFiles = fs.readdirSync(nestedDir);
        for (const f of subFiles) {
          const src = path.join(nestedDir, f);
          const dst = path.join(destDir, f);
          try {
            if (fs.existsSync(dst)) {
              if (fs.statSync(dst).isDirectory()) {
                fs.rmSync(dst, { recursive: true, force: true });
              } else {
                fs.unlinkSync(dst);
              }
            }
            fs.renameSync(src, dst);
          } catch (e) {
            console.warn(`[Kernel Extractor] Di chuyển ${f} thất bại:`, e.message);
          }
        }
        try { fs.rmdirSync(nestedDir); } catch {}
        break;
      }
    }
  }
}

// Bắt đầu tải và tự động cài đặt
async function startDownload(downloadUrl) {
  if (currentTask.status === 'downloading' || currentTask.status === 'extracting') {
    throw new Error('Tiến trình tải kernel đang diễn ra, vui lòng chờ.');
  }

  // Nếu người dùng truyền vào đường dẫn file zip cục bộ có sẵn (để test hoặc cài offline)
  if (downloadUrl && (downloadUrl.startsWith('C:') || downloadUrl.startsWith('D:') || downloadUrl.startsWith('E:') || downloadUrl.endsWith('.zip')) && fs.existsSync(downloadUrl)) {
    return await installFromLocalZip(downloadUrl);
  }

  // Tự động kiểm tra các vị trí file ZIP có sẵn trên máy để cài đặt siêu tốc 1.5s
  const userHome = process.env.USERPROFILE || 'C:\\Users\\Admin';
  const commonZipLocations = [
    path.join(config.BASE_DIR, '..', 'MyBrowser-153-win64.zip'),
    path.join(config.BASE_DIR, 'MyBrowser-153-win64.zip'),
    path.join(config.BASE_DIR, 'bin', 'MyBrowser-153-win64.zip'),
    path.join(userHome, 'Downloads', 'MyBrowser-153-win64.zip'),
    path.join(userHome, 'Desktop', 'MyBrowser-153-win64.zip'),
    'C:\\Users\\Admin\\.gemini\\antigravity\\scratch\\MyBrowser-153-win64.zip',
  ];
  for (const zipLoc of commonZipLocations) {
    if (fs.existsSync(zipLoc)) {
      console.log('[Kernel Downloader] Tự động giải nén từ file ZIP có sẵn:', zipLoc);
      return await installFromLocalZip(zipLoc);
    }
  }

  const targetUrl = downloadUrl || DEFAULT_CLOUD_KERNEL_URL;
  console.log('[Kernel Downloader] Bắt đầu tải kernel từ Cloud URL:', targetUrl);

  currentTask.status = 'downloading';
  currentTask.progress = 0;
  currentTask.downloadedBytes = 0;
  currentTask.totalBytes = 0;
  currentTask.speed = '0 KB/s';
  currentTask.error = null;
  currentTask.startTime = Date.now();
  currentTask.lastBytes = 0;
  currentTask.lastTime = Date.now();

  const binDir = path.dirname(TEMP_ZIP);
  if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });

  const fileStream = fs.createWriteStream(TEMP_ZIP);

  function executeRequest(requestUrl, redirectCount = 0) {
    if (redirectCount > 10) {
      currentTask.status = 'error';
      currentTask.error = 'Quá nhiều lần chuyển hướng (Redirect loop)';
      fileStream.close();
      return;
    }

    const client = requestUrl.startsWith('https:') ? https : http;
    const req = client.get(requestUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OmniBrowser-Kernel-Downloader/1.0',
      },
    }, (res) => {
      // Xử lý chuyển hướng HTTP (301, 302, 307, 308)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const nextUrl = new URL(res.headers.location, requestUrl).href;
        return executeRequest(nextUrl, redirectCount + 1);
      }

      if (res.statusCode !== 200) {
        currentTask.status = 'error';
        currentTask.error = `Tải file thất bại với mã lỗi HTTP ${res.statusCode}`;
        fileStream.close();
        if (fs.existsSync(TEMP_ZIP)) try { fs.unlinkSync(TEMP_ZIP); } catch {}
        return;
      }

      currentTask.totalBytes = parseInt(res.headers['content-length'] || '0', 10);

      res.on('data', (chunk) => {
        currentTask.downloadedBytes += chunk.length;
        if (currentTask.totalBytes > 0) {
          currentTask.progress = Math.round((currentTask.downloadedBytes / currentTask.totalBytes) * 100);
        }

        // Tính tốc độ
        const now = Date.now();
        const diffTime = (now - currentTask.lastTime) / 1000;
        if (diffTime >= 0.8) {
          const diffBytes = currentTask.downloadedBytes - currentTask.lastBytes;
          const bytesPerSec = diffBytes / diffTime;
          if (bytesPerSec > 1024 * 1024) {
            currentTask.speed = (bytesPerSec / (1024 * 1024)).toFixed(1) + ' MB/s';
          } else {
            currentTask.speed = Math.round(bytesPerSec / 1024) + ' KB/s';
          }
          currentTask.lastBytes = currentTask.downloadedBytes;
          currentTask.lastTime = now;
        }
      });

      res.pipe(fileStream);

      fileStream.on('finish', async () => {
        fileStream.close();
        currentTask.status = 'extracting';
        currentTask.progress = 100;
        currentTask.speed = 'Đang giải nén...';

        try {
          await extractZip(TEMP_ZIP, CHROMIUM_DIR);
          if (fs.existsSync(TEMP_ZIP)) {
            try { fs.unlinkSync(TEMP_ZIP); } catch {}
          }
          currentTask.status = 'completed';
          currentTask.speed = 'Hoàn tất';

          // Kích hoạt auto repair DB sang kernel mới cài đặt
          try {
            const db = require('./db');
            if (typeof db.autoRepairKernelPaths === 'function') {
              db.autoRepairKernelPaths();
            }
          } catch {}
        } catch (err) {
          currentTask.status = 'error';
          currentTask.error = err.message;
        }
      });
    });

    req.on('error', (err) => {
      currentTask.status = 'error';
      currentTask.error = `Lỗi mạng khi tải: ${err.message}`;
      fileStream.close();
      if (fs.existsSync(TEMP_ZIP)) try { fs.unlinkSync(TEMP_ZIP); } catch {}
    });

    currentTask.activeRequest = req;
  }

  executeRequest(targetUrl);
  return { success: true, message: 'Đã bắt đầu tải Chromium Kernel' };
}

// Cài đặt trực tiếp từ file zip trên máy (Offline / Local Staging)
async function installFromLocalZip(localZipPath) {
  if (!fs.existsSync(localZipPath)) {
    throw new Error(`File zip không tồn tại: ${localZipPath}`);
  }

  currentTask.status = 'extracting';
  currentTask.progress = 50;
  currentTask.speed = 'Đang giải nén từ file cục bộ...';

  try {
    await extractZip(localZipPath, CHROMIUM_DIR);
    currentTask.status = 'completed';
    currentTask.progress = 100;
    currentTask.speed = 'Hoàn tất';

    try {
      const db = require('./db');
      if (typeof db.autoRepairKernelPaths === 'function') {
        db.autoRepairKernelPaths();
      }
    } catch {}

    return { success: true, message: 'Cài đặt Chromium Kernel từ file cục bộ thành công!' };
  } catch (err) {
    currentTask.status = 'error';
    currentTask.error = err.message;
    throw err;
  }
}

module.exports = {
  CHROMIUM_DIR,
  TEMP_ZIP,
  getKernelStatus,
  startDownload,
  cancelDownload,
  installFromLocalZip,
  extractZip,
};
