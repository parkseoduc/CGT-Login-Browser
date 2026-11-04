const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const EventEmitter = require('node:events');

const { PROFILES_DIR, getDefaultKernelPath, BASE_DIR } = require('./config');
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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Đảm bảo extension nội bộ tự động gắn tên Profile vào tiêu đề trang và tab trình duyệt.
 * Giúp người dùng nhận diện ngay profile trên Taskbar Windows, Alt+Tab, và tiêu đề tab (kể cả với SPA như YouTube).
 */
function ensureProfileTitleExtension(userDataDir, profileName) {
  const extDir = path.join(userDataDir, 'title_extension');
  fs.mkdirSync(extDir, { recursive: true });

  const safeName = (profileName || 'Profile').trim();
  const manifest = {
    manifest_version: 3,
    name: `Profile Tag: ${safeName}`,
    version: '1.0.0',
    description: 'Internal profile title tagger for taskbar and tab identification',
    content_scripts: [
      {
        matches: ['<all_urls>'],
        js: ['content.js'],
        run_at: 'document_start',
        all_frames: false,
      },
    ],
  };

  const contentScript = `(() => {
  const TAG = '[' + ${JSON.stringify(safeName)} + ']';
  let isSetting = false;

  function formatTitle(raw) {
    if (!raw) return TAG;
    const trimmed = raw.trim();
    if (trimmed.startsWith(TAG)) return trimmed;
    return TAG + ' ' + trimmed;
  }

  function applyTitle() {
    if (isSetting) return;
    const cur = document.title || '';
    if (!cur && document.readyState === 'loading') {
      return;
    }
    if (!cur.startsWith(TAG)) {
      isSetting = true;
      try {
        const next = formatTitle(cur);
        document.title = next;
      } catch (e) {
        try {
          let t = document.querySelector('title');
          if (!t) {
            t = document.createElement('title');
            (document.head || document.documentElement).appendChild(t);
          }
          t.textContent = formatTitle(cur);
        } catch {}
      } finally {
        Promise.resolve().then(() => {
          isSetting = false;
        });
      }
    }
  }

  // 1. Chạy ngay khi nạp trang
  applyTitle();

  // 2. Chạy khi DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyTitle, { once: true });
  }

  // 3. Chạy khi window load
  window.addEventListener('load', applyTitle, { once: true });

  // 4. Quan sát DOM mutations cho SPA (YouTube chuyển bài, Facebook chuyển tab động...)
  const observer = new MutationObserver(() => {
    applyTitle();
  });

  const checkAndObserve = () => {
    const target = document.querySelector('head') || document.documentElement;
    if (target) {
      observer.observe(target, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      return true;
    }
    return false;
  };

  if (!checkAndObserve()) {
    const poll = setInterval(() => {
      if (checkAndObserve()) clearInterval(poll);
    }, 50);
  }
})();
`;

  fs.writeFileSync(path.join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  fs.writeFileSync(path.join(extDir, 'content.js'), contentScript, 'utf8');

  return extDir;
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

  // Xác định file thực thi Chromium (Tôn trọng lựa chọn nhân của Profile, chỉ fallback khi nhân không tồn tại)
  let kernelPath = overrides.kernel_path || profile.kernel_path;
  const portableKernel = path.join(BASE_DIR, 'bin', 'chromium', process.platform === 'win32' ? 'chrome.exe' : 'chrome');
  const hasPortable = fs.existsSync(portableKernel);

  if (!kernelPath || !fs.existsSync(kernelPath)) {
    if (hasPortable) {
      console.log(`[Launcher] Nhân của profile "${profile.name}" chưa gán hoặc không có trên máy, tự động dùng MyBrowser 153 Portable.`);
      kernelPath = portableKernel;
    } else {
      const fallbackKernel = getDefaultKernelPath();
      if (fallbackKernel && fs.existsSync(fallbackKernel)) {
        console.log(`[Launcher] Nhân trình duyệt của profile "${profile.name}" không tồn tại. Tự động chuyển sang: ${fallbackKernel}`);
        kernelPath = fallbackKernel;
      } else {
        throw new Error(`Không tìm thấy trình duyệt Chromium/Chrome/Edge nào trên máy tính! Vui lòng cài đặt Google Chrome hoặc Microsoft Edge để khởi chạy.`);
      }
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

  // Xây dựng danh sách tham số khởi động chuẩn ổn định (Pure Native Stability Matrix)
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

    // 1. Chống nổ mã ngắt Win11 STATUS_BREAKPOINT & vòng lặp dump WerFault gây nghẽn CPU 100%
    '--disable-breakpad',
    '--disable-crash-reporter',
    '--noerrdialogs',

    // 2. Triệt tiêu toàn bộ tác vụ ngầm ngốn CPU, RAM và băng thông mạng
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-domain-reliability',
    '--disable-sync',
    '--disable-client-side-phishing-detection',
    '--no-pings',
    '--disable-features=MediaRouter',

    // 3. Ổn định GPU cho môi trường Remote Desktop / RDP / Máy ảo và giới hạn bộ nhớ đệm
    '--disable-gpu-watchdog',
    '--disk-cache-size=104857600',
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

  // -------------------------------------------------------------
  // PRE-LAUNCH PROXY GUARD (Chống ngắt kết nối Disconnected Muse AI)
  // -------------------------------------------------------------
  const isGuardEnabled = (profile.proxy_guard !== 0) && !overrides.bypass_proxy_guard;
  if (isGuardEnabled && profile.proxy_host && profile.proxy_port) {
    console.log(`[ProxyGuard] Đang kiểm tra an toàn Proxy (${profile.proxy_host}:${profile.proxy_port}) cho profile "${profile.name}"...`);
    const guardCheck = await proxy.checkProxy({
      type: profile.proxy_type || 'http',
      host: profile.proxy_host,
      port: profile.proxy_port,
      username: profile.proxy_user,
      password: profile.proxy_pass,
    }, 4000);

    if (!guardCheck.live) {
      const errMsg = `Proxy (${profile.proxy_host}:${profile.proxy_port}) mất kết nối hoặc phản hồi quá chậm (${guardCheck.error || 'Connection Timeout'}). Hệ thống đã tạm chặn mở trình duyệt để bảo vệ tài khoản Muse AI không bị ngắt kết nối (Disconnected).`;
      console.warn(`[ProxyGuard] ⚠️ CHẶN MỞ PROFILE: ${errMsg}`);
      const err = new Error(errMsg);
      err.code = 'PROXY_GUARD_FAILED';
      err.proxyHost = profile.proxy_host;
      err.proxyPort = profile.proxy_port;
      err.proxyError = guardCheck.error || 'Connection Timeout';
      err.proxyId = profile.proxy_id;
      err.profileId = profile.id;
      err.profileName = profile.name;
      err.rotationApiUrl = profile.proxy_rotation_api_url;
      throw err;
    }
    console.log(`[ProxyGuard] PASS: Proxy ${profile.proxy_host}:${profile.proxy_port} LIVE! Ping: ${guardCheck.ping}ms, IP: ${guardCheck.ip}, ISP: ${guardCheck.isp || 'N/A'}`);
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

  // Nạp danh sách Extensions (Extension nội bộ gắn tên Profile vào tiêu đề + Extension người dùng)
  try {
    const titleExtDir = ensureProfileTitleExtension(userDataDir, profile.name);
    const userExtPaths = db.getActiveExtensionPathsForProfile(profileId) || [];
    const allExts = [titleExtDir, ...userExtPaths];
    const joinedExts = allExts.join(',');
    args.push(`--load-extension=${joinedExts}`);
    args.push(`--disable-extensions-except=${joinedExts}`);
    console.log(`[Launcher] Loaded Profile Title Extension + ${userExtPaths.length} extension(s) for "${profile.name}"`);
  } catch (err) {
    console.warn('[Launcher] Warning loading extensions:', err.message);
  }

  let rawUrl = (overrides.start_url !== undefined ? overrides.start_url : profile.start_url) || '';
  let startUrl = rawUrl.trim();
  if (startUrl.startsWith('http://iphey.com')) {
    startUrl = startUrl.replace('http://iphey.com', 'https://iphey.com');
  }

  // Khởi động mượt mà (Cold-Boot Graceful Splash & Welcome):
  // Giúp GPU Process và ANGLE D3D11 device khởi tạo ấm êm 350ms trước khi tải các trang fingerprint nặng
  // Đồng thời gán sẵn tên Profile vào tiêu đề trang và tab để người dùng nhận biết ngay trên Taskbar
  let launchTarget = startUrl;
  const splashPath = path.join(userDataDir, 'start.html');
  const safeProfileDisplayName = (profile.name || 'OmniBrowser').trim();

  if (startUrl && startUrl !== 'about:blank' && !startUrl.startsWith('data:')) {
    const splashContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="referrer" content="no-referrer">
  <title>[${escapeHtml(safeProfileDisplayName)}] OmniBrowser Workstation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0f172a;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      user-select: none;
    }
    .card { text-align: center; padding: 24px; }
    .spinner {
      width: 42px;
      height: 42px;
      margin: 0 auto 16px;
      border: 3px solid rgba(59, 130, 246, 0.2);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .badge {
      display: inline-block;
      padding: 4px 14px;
      margin-bottom: 12px;
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.35);
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      color: #60a5fa;
    }
    h3 { font-size: 18px; font-weight: 600; margin-bottom: 6px; letter-spacing: -0.01em; }
    p { font-size: 13px; color: #94a3b8; }
  </style>
  <script>
    setTimeout(() => {
      window.location.replace(${JSON.stringify(startUrl)});
    }, 350);
  </script>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <div class="badge">[${escapeHtml(safeProfileDisplayName)}]</div>
    <h3>OmniBrowser Workstation</h3>
    <p>Đang chuẩn bị môi trường bảo mật...</p>
  </div>
</body>
</html>`;
    try {
      fs.writeFileSync(splashPath, splashContent, 'utf8');
      launchTarget = splashPath;
    } catch {}
  } else if (!startUrl) {
    // Khi người dùng để trống Start URL, mở trang Chào mừng có gắn sẵn tên hồ sơ
    const welcomeContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="referrer" content="no-referrer">
  <title>[${escapeHtml(safeProfileDisplayName)}] OmniBrowser Workstation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0f172a;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      user-select: none;
    }
    .card {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 36px 44px;
      text-align: center;
      max-width: 580px;
      width: 100%;
      box-shadow: 0 20px 40px -15px rgba(0,0,0,0.5);
    }
    .badge {
      display: inline-block;
      padding: 6px 16px;
      margin-bottom: 16px;
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.35);
      border-radius: 9999px;
      font-size: 15px;
      font-weight: 700;
      color: #60a5fa;
      letter-spacing: 0.02em;
    }
    h2 { font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #ffffff; }
    p.desc { font-size: 14px; color: #94a3b8; margin-bottom: 24px; line-height: 1.5; }
    .search-box {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
    }
    .search-box input {
      flex: 1;
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 12px 16px;
      color: #fff;
      font-size: 14px;
      outline: none;
    }
    .search-box input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
    }
    .search-box button {
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 0 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .search-box button:hover { background: #1d4ed8; }
    .quick-links {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
    }
    .quick-links a {
      color: #cbd5e1;
      text-decoration: none;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      transition: all 0.2s;
    }
    .quick-links a:hover {
      background: rgba(59, 130, 246, 0.2);
      border-color: #3b82f6;
      color: #93c5fd;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">[${escapeHtml(safeProfileDisplayName)}]</div>
    <h2>OmniBrowser Workstation</h2>
    <p class="desc">Môi trường trình duyệt sạch, biệt lập vân tay đã sẵn sàng hoạt động.</p>
    <form class="search-box" action="https://www.google.com/search" method="GET">
      <input type="text" name="q" placeholder="Tìm kiếm trên Google hoặc nhập URL..." autofocus>
      <button type="submit">Tìm kiếm</button>
    </form>
    <div class="quick-links">
      <a href="https://iphey.com" target="_self">🛡️ Kiểm tra Iphey</a>
      <a href="https://pixelscan.net" target="_self">🔍 Pixelscan</a>
      <a href="https://whoer.net" target="_self">🌐 Whoer</a>
      <a href="https://youtube.com" target="_self">▶️ YouTube</a>
      <a href="https://facebook.com" target="_self">📘 Facebook</a>
    </div>
  </div>
</body>
</html>`;
    try {
      fs.writeFileSync(splashPath, welcomeContent, 'utf8');
      launchTarget = splashPath;
    } catch {}
  }
  if (launchTarget) {
    args.push(launchTarget);
  }

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

  // Hàm dọn dẹp phiên profile chuẩn mực, triệt tiêu hoàn toàn rò rỉ bộ nhớ & tiến trình mồ côi
  const cleanupProfile = (code = 0, signal = null) => {
    const current = _running.get(profileId);
    if (!current) return;
    if (current.cdpClient) {
      try { current.cdpClient.close(); } catch {}
    }
    if (proxyForwarder) {
      try { proxyForwarder.close(); } catch {}
    }
    // Dọn sạch toàn bộ cây tiến trình con (GPU, Renderer, Crashpad)
    if (pid) {
      forceKillPid(pid);
    }
    cleanupOrphansForProfile(profileId);
    _running.delete(profileId);
    events.emit('profile-exited', { profileId, pid, code, signal });
  };

  // Theo dõi khi tiến trình tắt
  if (child) {
    child.on('exit', (code, signal) => {
      console.log(`[Launcher] Profile ${profileId} (PID: ${pid}) process exit event (code: ${code}, signal: ${signal})`);
      cleanupProfile(code, signal);
    });
  } else {
    const exitTimer = setInterval(() => {
      try {
        process.kill(pid, 0);
      } catch {
        clearInterval(exitTimer);
        console.log(`[Launcher] Profile ${profileId} (PID: ${pid}) process exited.`);
        cleanupProfile();
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
        cleanupProfile();
      });

      // Bắt sự kiện Crash của Target/Inspector để ngắt kết nối an toàn, tránh treo và vòng lặp CPU
      cdpClient.on('Target.targetCrashed', (params) => {
        console.warn(`[CDP] Target ${params.targetId} crashed: status=${params.status}, errorCode=${params.errorCode}`);
        pageSessions.delete(params.targetId);
        events.emit('profile-crashed', { profileId, targetId: params.targetId, status: params.status, errorCode: params.errorCode });
      });

      cdpClient.on('Inspector.targetCrashed', () => {
        console.warn(`[CDP] Inspector target crashed for Profile ${profileId}`);
        events.emit('profile-crashed', { profileId });
      });

      // Pure Native Stability Mode: Không can thiệp CDP Target.setAutoAttach hay Fetch.enable vào Web Workers
      // Toàn bộ việc xác thực Proxy đã được xử lý 100% độc lập và an toàn tại Local Proxy Forwarder (src/proxy.js)
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

  // Bước 2: Dọn sạch toàn bộ tiến trình thuộc cây PID và tiến trình mồ côi
  if (info.pid) {
    forceKillPid(info.pid);
  }
  cleanupOrphansForProfile(profileId);

  // Bước 3: Dọn dẹp triệt để lockfiles và devtools port để giải phóng hoàn toàn profile
  const staleFiles = ['DevToolsActivePort', 'lockfile', 'SingletonLock', 'SingletonCookie', 'SingletonSocket'];
  for (const f of staleFiles) {
    try {
      const targetP = path.join(info.userDataDir, f);
      if (fs.existsSync(targetP)) fs.unlinkSync(targetP);
    } catch {}
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

// Dọn dẹp các tiến trình Chromium mồ côi liên quan đến profile
function cleanupOrphansForProfile(profileId) {
  if (process.platform !== 'win32' || !profileId) return;
  try {
    const { execSync } = require('node:child_process');
    const script = `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*${profileId}*' } | Stop-Process -Force`;
    const b64 = Buffer.from(script, 'utf16le').toString('base64');
    execSync(`powershell.exe -NoProfile -NonInteractive -EncodedCommand ${b64}`, { stdio: 'ignore', windowsHide: true });
  } catch {}
}

// Đóng toàn bộ các Profile đang chạy
async function stopAllProfiles(timeoutMs = 2000) {
  const running = getRunningProfiles();
  const results = [];
  for (const p of running) {
    try {
      const res = await stopProfile(p.profileId, timeoutMs);
      results.push({ profileId: p.profileId, success: true, ...res });
    } catch (e) {
      results.push({ profileId: p.profileId, success: false, error: e.message });
    }
  }
  return { success: true, count: results.length, results };
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
  stopAllProfiles,
  cleanupOrphansForProfile,
  getRunningProfiles,
  isProfileRunning,
  getRunningInfo,
  events,
};
