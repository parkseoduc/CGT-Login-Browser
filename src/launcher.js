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

  // Xây dựng danh sách tham số khởi động
  const args = [
    `--user-data-dir=${userDataDir}`,
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--remote-debugging-port=0',
    '--remote-debugging-address=127.0.0.1',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-mode',
    '--password-store=basic',
    '--disable-features=CalculateNativeWinOcclusion,FlashDeprecationWarning',
    '--force-color-profile=srgb',
    '--webrtc-ip-handling-policy=disable_non_proxied_udp',
    '--force-webrtc-ip-handling-policy',
    '--no-session-restore',
    '--disable-session-crashed-bubble',
    '--disable-restore-session-state',
    // === CÁC CỜ TỐI ƯU HÓA TÀI NGUYÊN RAM / CPU & CHỐNG TẢI RÁC NGẦM ===
    '--disable-component-update',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-default-apps',
    '--disable-client-side-phishing-detection',
    '--disable-hang-monitor',
    '--disable-popup-blocking',
    '--disable-prompt-on-repost',
    '--disable-domain-reliability',
    '--disable-features=OptimizationGuideModelDownloading,OptimizationHints,MediaRouter,DialMediaRouteProvider,CalculateNativeWinOcclusion,FlashDeprecationWarning',
    '--disk-cache-size=20971520', // Khống chế bộ đệm ổ đĩa tối đa 20MB
    '--media-cache-size=10485760', // Khống chế cache đa phương tiện 10MB
    '--js-flags=--max-old-space-size=256', // Khống chế heap engine V8 chống phình RAM
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

  const startUrl = overrides.start_url || profile.start_url || 'https://iphey.com';
  args.push(startUrl);

  // Dọn dẹp thư mục Sessions và Tabs cũ để tránh việc Chromium tự động khôi phục (restore) hàng loạt tab từ phiên trước
  const sessionsDir = path.join(userDataDir, 'Default', 'Sessions');
  try {
    if (fs.existsSync(sessionsDir)) {
      fs.rmSync(sessionsDir, { recursive: true, force: true });
    }
  } catch {}

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

  // Khởi chạy tiến trình Chromium tách biệt hoàn toàn khỏi background shell
  const child = spawn(kernelPath, args, {
    detached: true,
    windowsHide: false,
    stdio: 'ignore',
  });
  child.unref();

  const pid = child.pid;
  if (!pid) {
    throw new Error('Failed to spawn Chromium process');
  }

  // Theo dõi khi tiến trình tắt
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

  // Chờ Chromium tạo file DevToolsActivePort để lấy cổng loopback CDP
  const ep = await cdp.waitForDevToolsEndpoint(userDataDir, 10000);
  const port = ep ? ep.port : null;
  const wsEndpoint = ep ? ep.wsEndpoint : null;

  let cdpClient = null;
  if (wsEndpoint) {
    try {
      cdpClient = new cdp.CdpClient(wsEndpoint);
      await cdpClient.connect(3000);

      // Kích hoạt tính năng tự động đính kèm (Auto-Attach) cho mọi tab/frame
      await cdpClient.send('Target.setAutoAttach', {
        autoAttach: true,
        waitForDebuggerOnStart: false,
        flatten: true
      });

      const injectionScript = fingerprint.getInjectionScript(fp);

      // Lấy danh sách các trang/tab hiện tại để tiêm script
      const targets = await cdpClient.send('Target.getTargets');
      for (const t of targets.targetInfos || []) {
        if (t.type === 'page') {
          try {
            const { sessionId } = await cdpClient.send('Target.attachToTarget', {
              targetId: t.targetId,
              flatten: true
            });
            await cdpClient.send('Page.enable', {}, sessionId);
            await cdpClient.send('Runtime.enable', {}, sessionId).catch(() => {});
            await cdpClient.send('Runtime.evaluate', { expression: injectionScript }, sessionId).catch(() => {});
            await cdpClient.send('Page.addScriptToEvaluateOnNewDocument', {
              source: injectionScript
            }, sessionId);
            // Vô hiệu hóa Runtime ngay để ngăn chặn bẫy phát hiện bot CDP (Iphey, CreepJS, DataDome)
            await cdpClient.send('Runtime.disable', {}, sessionId).catch(() => {});
            if (fp.timezone) {
              await cdpClient.send('Emulation.setTimezoneOverride', {
                timezoneId: fp.timezone
              }, sessionId).catch(() => {});
            }
            if (profile.proxy_user && profile.proxy_pass) {
              await cdpClient.send('Fetch.enable', { handleAuthRequests: true }, sessionId).catch(() => {});
            }
          } catch {
            // ignore initial attach error
          }
        }
      }

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

      // Lắng nghe khi có tab mới mở ra để tự động tiêm script
      cdpClient.on('Target.attachedToTarget', async (params) => {
        if (params.targetInfo && params.targetInfo.type === 'page') {
          try {
            const sId = params.sessionId;
            await cdpClient.send('Page.enable', {}, sId);
            await cdpClient.send('Runtime.enable', {}, sId).catch(() => {});
            await cdpClient.send('Runtime.evaluate', { expression: injectionScript }, sId).catch(() => {});
            await cdpClient.send('Page.addScriptToEvaluateOnNewDocument', {
              source: injectionScript
            }, sId);
            // Vô hiệu hóa Runtime để tránh lộ bẫy CDP bot detector
            await cdpClient.send('Runtime.disable', {}, sId).catch(() => {});
            if (fp.timezone) {
              await cdpClient.send('Emulation.setTimezoneOverride', {
                timezoneId: fp.timezone
              }, sId).catch(() => {});
            }
            if (profile.proxy_user && profile.proxy_pass) {
              await cdpClient.send('Fetch.enable', { handleAuthRequests: true }, sId).catch(() => {});
            }
          } catch {
            // ignore
          }
        }
      });
      console.log(`[CDP] Dynamic Fingerprint injected successfully for Profile ${profileId}`);
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
