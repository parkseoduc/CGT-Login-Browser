const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('node:path');
const http = require('node:http');

let mainWindow = null;
const API_PORT = 51888;

function checkServerReady(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/v1/status`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureBackendRunning() {
  const isUp = await checkServerReady(API_PORT);
  if (!isUp) {
    console.log('[Electron] Backend not detected on port 51888. Starting internal engine...');
    const serverModule = require('../src/server');
    const config = require('../src/config');
    const license = require('../src/license-manager');
    const db = require('../src/db');
    
    config.ensureDirectories();
    db.getDb();
    await license.initLicense();
    await serverModule.startServer(API_PORT);
    console.log('[Electron] Internal engine started successfully on port', API_PORT);
  } else {
    console.log('[Electron] Connected to existing backend server on port', API_PORT);
  }
}

async function createWindow() {
  await ensureBackendRunning();

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1040,
    minHeight: 680,
    title: 'OmniBrowser Antidetect Hub',
    backgroundColor: '#080d19',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Guarantee window visibility even if ready-to-show event takes longer
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
    }
  }, 1500);

  // Load backend web UI
  try {
    await mainWindow.loadURL(`http://127.0.0.1:${API_PORT}`);
  } catch (err) {
    console.error('[Electron] Failed to load URL, falling back to local file:', err.message);
    try {
      await mainWindow.loadFile(path.join(__dirname, '../public/index.html'));
    } catch (loadErr) {
      console.error('[Electron] Failed to load local file:', loadErr.message);
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('app:openExternal', (event, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    shell.openExternal(url);
  }
});

ipcMain.handle('app:version', () => {
  return app.getVersion();
});

ipcMain.handle('dialog:openDirectory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Chọn thư mục Tiện ích mở rộng (Unpacked Extension có manifest.json)',
    properties: ['openDirectory'],
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// App Lifecycle
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('before-quit', async () => {
    console.log('[Electron] App shutting down, ensuring running profiles are closed...');
    try {
      const launcher = require('../src/launcher');
      const running = launcher.getRunningProfiles();
      for (const p of running) {
        await launcher.stopProfile(p.profileId);
      }
    } catch (e) {
      console.error('[Electron] Error during shutdown:', e.message);
    }
  });
}
