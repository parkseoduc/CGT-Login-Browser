const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const EventEmitter = require('node:events');

const { PROFILES_DIR, getDefaultKernelPath } = require('./config');
const db = require('./db');
const cdp = require('./cdp');
const fingerprint = require('./fingerprint');
const proxy = require('./proxy');

class LauncherEvents extends EventEmitter {}
const events = new LauncherEvents();

// profileId -> { pid, child, userDataDir, port, wsEndpoint, startedAt }
const _running = new Map();

// Tránh lỗi "Restore pages?" (Crash bubble) bằng cách vá trước file Preferences
function preparePreferences(userDataDir) {
  const prefsPath = path.join(userDataDir, 'Default', 'Preferences');
  try {
    let prefs = {};
    if (fs.existsSync(prefsPath)) {
      try {
        prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8')) || {};
      } catch {
        prefs = {};
      }
    }
    prefs.profile = prefs.profile || {};
    prefs.profile.exit_type = 'Normal';
    prefs.profile.exited_cleanly = true;

    fs.mkdirSync(path.dirname(prefsPath), { recursive: true });
    fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2), 'utf8');
  } catch (err) {
    console.error('[Launcher] Failed to patch Preferences:', err.message);
  }
}

// Bắt đầu một Profile
async function startProfile(profileId, overrides = {}) {
  const profile = db.getProfile(profileId);
  if (!profile) {
    throw new Error(`Profile ${profileId} not found in database`);
  }

  // Nếu profile đang chạy, trả về thông tin hiện tại
  if (_running.has(profileId)) {
    const existing = _running.get(profileId);
    if (cdp.isPidAlive(existing.pid)) {
      return {
        alreadyRunning: true,
        profileId,
        pid: existing.pid,
        port: existing.port,
        wsEndpoint: existing.wsEndpoint,
      };
    } else {
      _running.delete(profileId);
    }
  }

  // Xác định file thực thi Chromium (Hỗ trợ tự động fallback khi chuyển máy)
  let kernelPath = overrides.kernel_path || profile.kernel_path;
  if (!kernelPath || !fs.existsSync(kernelPath)) {
    const fallbackKernel = getDefaultKernelPath();
    if (fallbackKernel && fs.existsSync(fallbackKernel)) {
      console.log(`[Launcher] Nhân trình duyệt của profile "${profile.name}" (${kernelPath || 'chưa gán'}) không có trên máy này. Tự động chuyển sang: ${fallbackKernel}`);
      kernelPath = fallbackKernel;
    } else {
      throw new Error(`Không tìm thấy trình duyệt Chromium/Chrome/Edge nào trên máy tính! Vui lòng cài đặt Google Chrome hoặc Microsoft Edge để khởi chạy.`);
    }
  }

  // Lấy hoặc sinh bộ Fingerprint cho Profile
  let fp = null;
  if (profile.fingerprint) {
    try {
      fp = typeof profile.fingerprint === 'string' ? JSON.parse(profile.fingerprint) : profile.fingerprint;
    } catch {
      fp = null;
    }
  }
  if (!fp) {
    fp = fingerprint.generateFingerprint({
      cpu: profile.cpu_cores,
      memory: profile.ram_gb,
      resolution: { width: profile.screen_width, height: profile.screen_height },
      userAgent: profile.user_agent,
      canvasMode: profile.canvas_noise ? 'noise' : 'real',
      audioMode: profile.audio_noise ? 'noise' : 'real',
      webrtcMode: profile.webrtc_mode,
    });
    try {
      db.updateProfile(profileId, { fingerprint: fp });
    } catch {}
  }

  // Thư mục dữ liệu độc lập cho profile
  const userDataDir = path.join(PROFILES_DIR, profileId, 'chrome');
  fs.mkdirSync(userDataDir, { recursive: true });

  // Vá Preferences chống crash bubble
  preparePreferences(userDataDir);

  // Xây dựng danh sách tham số khởi động (Chế độ nhân sạch nguyên bản, không cờ rác can thiệp)
  const args = [
    `--user-data-dir=${userDataDir}`,
    '--no-sandbox',
    '--test-type', // Triệt tiêu hoàn toàn dải cảnh báo "cờ không được hỗ trợ: --no-sandbox"
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-mode',
    '--remote-debugging-port=0',
    '--remote-debugging-address=127.0.0.1',
    '--disable-session-crashed-bubble',
    '--disable-restore-session-state',
  ];

  if (fp.languages && fp.languages[0]) {
    args.push(`--lang=${fp.languages[0]}`);
  }

  // Kích thước & vị trí cửa sổ
  const width = overrides.screen_width || (fp.screen ? fp.screen.width : 1280);
  const height = overrides.screen_height || (fp.screen ? fp.screen.height : 800);
  args.push(`--window-size=${width},${height}`);

  if (overrides.window_x !== undefined && overrides.window_y !== undefined) {
    args.push(`--window-position=${overrides.window_x},${overrides.window_y}`);
  }

  // Tự động xoay IP trước khi mở nếu profile bật auto_rotate_proxy
  if (profile.auto_rotate_proxy && profile.proxy_id) {
    const proxyRecord = db.getProxy(profile.proxy_id);
    if (proxyRecord && proxyRecord.rotation_api_url) {
      try {
        console.log(`[Launcher] Profile "${profile.name}" yêu cầu tự động đổi IP mới qua API trước khi mở...`);
        const rotRes = await proxy.triggerProxyRotation(proxyRecord);
        console.log(`[Launcher] Xoay IP thành công cho "${profile.name}": IP mới ${rotRes.newProxyInfo?.ip || 'N/A'}`);
      } catch (rotErr) {
        console.warn(`[Launcher] Tự động xoay IP thất bại: ${rotErr.message}`);
      }
    }
  }

  // Cấu hình Proxy nếu có
  let proxyForwarder = null;
  let proxyUrl = overrides.proxy_url;

  if (!proxyUrl && profile.proxy_host && profile.proxy_port) {
    if (profile.proxy_user || (profile.proxy_type && profile.proxy_type.toLowerCase() === 'socks5')) {
      try {
        proxyForwarder = await proxy.createLocalProxyForwarder({
          type: profile.proxy_type || 'http',
          host: profile.proxy_host,
          port: profile.proxy_port,
          username: profile.proxy_user,
          password: profile.proxy_pass,
        });
        proxyUrl = proxyForwarder.url;
        console.log(`[Launcher] Local Proxy Forwarder running on ${proxyUrl} for ${profile.proxy_host}:${profile.proxy_port}`);
      } catch (err) {
        console.error('[Launcher] Error starting proxy forwarder:', err.message);
        proxyUrl = buildProxyUrl(profile);
      }
    } else {
      proxyUrl = buildProxyUrl(profile);
    }
  }

  if (proxyUrl) {
    args.push(`--proxy-server=${proxyUrl}`);
  }

  // Cấu hình User-Agent
  const ua = overrides.user_agent || fp.userAgent || profile.user_agent;
  if (ua && ua.trim()) {
    args.push(`--user-agent=${ua.trim()}`);
  }

  // Custom flags do người dùng cấu hình
  const customFlags = overrides.custom_flags || profile.custom_flags;
  if (customFlags && customFlags.trim()) {
    const tokens = customFlags.trim().split(/\s+/).filter(Boolean);
    args.push(...tokens);
  }

  // Nạp danh sách Extensions (Toàn cục + Riêng lẻ cho profile)
  try {
    const extPaths = db.getActiveExtensionPathsForProfile(profileId);
    if (extPaths && extPaths.length > 0) {
      const joinedExts = extPaths.join(',');
      args.push(`--load-extension=${joinedExts}`);
      args.push(`--disable-extensions-except=${joinedExts}`);
      console.log(`[Launcher] Loaded ${extPaths.length} extension(s) for profile ${profileId}`);
    }
  } catch (err) {
    console.warn('[Launcher] Warning loading extensions:', err.message);
  }

  let startUrl = overrides.start_url || profile.start_url || 'https://iphey.com';
  if (startUrl.startsWith('http://iphey.com')) {
    startUrl = startUrl.replace('http://iphey.com', 'https://iphey.com');
  }
  args.push(startUrl);

  // Dọn dẹp thư mục Sessions và Tabs cũ để tránh việc Chromium tự động khôi phục (restore) hàng loạt tab từ phiên trước
  const defaultDir = path.join(userDataDir, 'Default');
  const sessionTargets = ['Sessions', 'Sessions_Encrypted', 'Current Session', 'Current Tabs', 'Last Session', 'Last Tabs'];
  for (const sTarget of sessionTargets) {
    try {
      const fullP = path.join(defaultDir, sTarget);
      if (fs.existsSync(fullP)) {
        fs.rmSync(fullP, { recursive: true, force: true });
      }
    } catch {}
  }

  // Dọn dẹp tiến trình mồ côi hoặc lockfile cũ nếu có từ lần chạy trước
  const staleEp = cdp.readDevToolsEndpoint(userDataDir);
  if (staleEp) {
    try { await cdp.gracefulQuit(userDataDir, null, 1500); } catch {}
  }

  const staleFiles = ['DevToolsActivePort', 'lockfile', 'SingletonLock', 'SingletonCookie', 'SingletonSocket'];
  for (const f of staleFiles) {
    try {
      const targetP = path.join(userDataDir, f);
      if (fs.existsSync(targetP)) {
        fs.unlinkSync(targetP);
      }
    } catch {}
  }

  console.log(`[Launcher] Spawning: "${kernelPath}" with args:`, args.join(' '));

  let child = null;
  let pid = null;
  const spawnDesktopExe = path.join(path.resolve(__dirname, '..'), 'bin', 'spawn-desktop.exe');

  if (process.platform === 'win32' && fs.existsSync(spawnDesktopExe)) {
    try {
      const { execFileSync } = require('node:child_process');
      const out = execFileSync(spawnDesktopExe, [kernelPath, ...args], { encoding: 'utf8', windowsHide: true }).trim();
      const parsedPid = parseInt(out, 10);
      if (parsedPid && !isNaN(parsedPid)) {
        pid = parsedPid;
        console.log(`[Launcher] Spawned Chromium on WinSta0\\Default via spawn-desktop.exe (PID: ${pid})`);
      }
    } catch (spawnErr) {
      console.warn('[Launcher] Warning: spawn-desktop.exe failed, falling back to spawn():', spawnErr.message);
    }
  }

  if (!pid) {
    child = spawn(kernelPath, args, {
      detached: true,
      windowsHide: false,
      stdio: 'ignore',
    });
    child.unref();
    pid = child.pid;
  }

  if (!pid) {
    throw new Error('Failed to spawn Chromium process');
  }

  // Theo dõi khi tiến trình tắt
  if (child) {
    child.on('exit', (code, signal) => {
      console.log(`[Launcher] Profile ${profileId} (PID: ${pid}) process exit event (code: ${code}, signal: ${signal})`);
      const current = _running.get(profileId);
      if (current && current.cdpClient && current.cdpClient.ws && current.cdpClient.ws.readyState === 1) {
        console.log(`[Launcher] Profile ${profileId} browser session still active via CDP, maintaining running status.`);
        return;
      }
      if (proxyForwarder) {
        try { proxyForwarder.close(); } catch {}
      }
      _running.delete(profileId);
      events.emit('profile-exited', { profileId, pid, code, signal });
    });
  } else {
    const exitTimer = setInterval(() => {
      try {
        process.kill(pid, 0);
      } catch {
        clearInterval(exitTimer);
        console.log(`[Launcher] Profile ${profileId} (PID: ${pid}) process exited.`);
        const current = _running.get(profileId);
        if (current && current.cdpClient && current.cdpClient.ws && current.cdpClient.ws.readyState === 1) {
          return;
        }
        if (proxyForwarder) {
          try { proxyForwarder.close(); } catch {}
        }
        _running.delete(profileId);
        events.emit('profile-exited', { profileId, pid, code: 0, signal: null });
      }
    }, 1000);
  }

  // Chờ Chromium tạo file DevToolsActivePort để lấy cổng loopback CDP
  const ep = await cdp.waitForDevToolsEndpoint(userDataDir, 10000);
  const port = ep ? ep.port : null;
  const wsEndpoint = ep ? ep.wsEndpoint : null;

  let cdpClient = null;
  const pageSessions = new Map(); // targetId -> sessionId
  if (wsEndpoint) {
    try {
      cdpClient = new cdp.CdpClient(wsEndpoint);
      await cdpClient.connect(3000);

      // Lắng nghe khi trình duyệt đóng WebSocket CDP
      cdpClient.on('close', () => {
        console.log(`[Launcher] CDP connection closed for Profile ${profileId}`);
        if (proxyForwarder) {
          try { proxyForwarder.close(); } catch {}
        }
        _running.delete(profileId);
        events.emit('profile-exited', { profileId, pid });
      });

      // Xử lý xác thực tự động dự phòng nếu có request auth từ Chromium
      if (profile.proxy_user && profile.proxy_pass) {
        cdpClient.on('Fetch.authRequired', async (params, sessionId) => {
          try {
            await cdpClient.send('Fetch.continueWithAuth', {
              requestId: params.requestId,
              authChallengeResponse: {
                response: 'ProvideCredentials',
                username: profile.proxy_user,
                password: profile.proxy_pass,
              }
            }, sessionId || params.sessionId);
          } catch {}
        });
      }

      const setupSession = async (sId) => {
        try {
          await cdpClient.send('Page.enable', {}, sId).catch(() => {});
          await cdpClient.send('Page.bringToFront', {}, sId).catch(() => {});
          if (profile.proxy_user && profile.proxy_pass) {
            await cdpClient.send('Fetch.enable', { handleAuthRequests: true }, sId).catch(() => {});
          }
        } catch {}
      };

      // Lắng nghe tự động đính kèm (Auto-Attach) cho tab mới hoặc tab hiện tại
      cdpClient.on('Target.attachedToTarget', async (params) => {
        const sId = params.sessionId;
        if (params.targetInfo && params.targetInfo.type === 'page') {
          pageSessions.set(params.targetInfo.targetId, sId);
          try {
            await setupSession(sId);
          } catch {}
        }
        if (params.waitingForDebugger) {
          await cdpClient.send('Runtime.runIfWaitingForDebugger', {}, sId).catch(() => {});
        }
      });

      cdpClient.on('Target.detachedFromTarget', (params) => {
        if (params.targetId) pageSessions.delete(params.targetId);
      });

      // Kích hoạt tính năng tự động đính kèm (Auto-Attach) cho mọi tab/frame để quản lý phiên sạch sẽ
      await cdpClient.send('Target.setAutoAttach', {
        autoAttach: true,
        waitForDebuggerOnStart: false,
        flatten: true
      });

      console.log(`[CDP] Session connected cleanly in Pure Native Mode for Profile ${profileId}`);
    } catch (err) {
      console.warn(`[CDP] Warning: Could not inject dynamic fingerprint via CDP:`, err.message);
    }
  }

  const info = {
    profileId,
    pid,
    child,
    userDataDir,
    port,
    wsEndpoint,
    cdpClient,
    pageSessions: cdpClient ? pageSessions : new Map(),
    proxyForwarder,
    fingerprint: fp,
    startedAt: new Date().toISOString(),
  };

  _running.set(profileId, info);
  db.updateProfileLastRun(profileId);
  events.emit('profile-started', info);

  return {
    profileId,
    pid,
    port,
    wsEndpoint,
    cdpClient,
    pageSessions,
    fingerprint: fp,
    startedAt: info.startedAt,
  };
}

// Đóng một Profile (ưu tiên đóng êm qua CDP để flush cookie)
async function stopProfile(profileId, timeoutMs = 2500) {
  const info = _running.get(profileId);
  if (!info) {
    const userDataDir = path.join(PROFILES_DIR, profileId, 'chrome');
    await cdp.gracefulQuit(userDataDir, null, 1000).catch(() => {});
    return { success: true, message: 'Profile was not running' };
  }

  console.log(`[Launcher] Stopping Profile ${profileId} (PID: ${info.pid})...`);

  // Bước 1: Nếu cdpClient đang mở, gửi trực tiếp Browser.close để đóng an toàn
  let closedGracefully = false;
  if (info.cdpClient && info.cdpClient.ws && info.cdpClient.ws.readyState === 1) {
    try {
      await info.cdpClient.send('Browser.close').catch(() => {});
      const deadline = Date.now() + 1500;
      while (Date.now() < deadline) {
        if (!cdp.isPidAlive(info.pid)) {
          closedGracefully = true;
          break;
        }
        await new Promise(r => setTimeout(r, 100));
      }
    } catch {}
    try { info.cdpClient.close(); } catch {}
  } else {
    try {
      closedGracefully = await cdp.gracefulQuit(info.userDataDir, info.pid, timeoutMs);
    } catch {}
  }

  // Đóng local proxy forwarder nếu có
  if (info.proxyForwarder) {
    try { await info.proxyForwarder.close(); } catch {}
  }

  // Bước 2: Nếu chưa tắt, cưỡng chế kill bằng taskkill
  if (!closedGracefully && cdp.isPidAlive(info.pid)) {
    console.log(`[Launcher] Graceful quit timed out for PID ${info.pid}, force killing...`);
    forceKillPid(info.pid);
  }

  _running.delete(profileId);
  events.emit('profile-stopped', { profileId, pid: info.pid, graceful: closedGracefully });

  return {
    success: true,
    profileId,
    pid: info.pid,
    graceful: closedGracefully,
  };
}

// Kill cưỡng chế trên Windows
function forceKillPid(pid) {
  if (!pid) return;
  try {
    const { execSync } = require('node:child_process');
    execSync(`taskkill.exe /PID ${pid} /T /F`, { stdio: 'ignore', windowsHide: true });
  } catch (e) {
    try { process.kill(pid); } catch { /* ignore */ }
  }
}

function buildProxyUrl(profile) {
  if (!profile.proxy_host || !profile.proxy_port) return null;
  const type = profile.proxy_type || 'http';
  return `${type}://${profile.proxy_host}:${profile.proxy_port}`;
}

function getRunningProfiles() {
  const result = [];
  for (const [id, info] of _running.entries()) {
    if (isProfileRunning(id)) {
      result.push({
        profileId: id,
        pid: info.pid,
        port: info.port,
        wsEndpoint: info.wsEndpoint,
        startedAt: info.startedAt,
      });
    }
  }
  return result;
}

function isProfileRunning(profileId) {
  const info = _running.get(profileId);
  if (!info) return false;
  if (info.cdpClient && info.cdpClient.ws && info.cdpClient.ws.readyState === 1) {
    return true;
  }
  if (cdp.isPidAlive(info.pid)) {
    return true;
  }
  _running.delete(profileId);
  return false;
}

function getRunningInfo(profileId) {
  const info = _running.get(profileId);
  if (!info || !cdp.isPidAlive(info.pid)) return null;
  return info;
}

module.exports = {
  startProfile,
  stopProfile,
  getRunningProfiles,
  isProfileRunning,
  getRunningInfo,
  events,
};
