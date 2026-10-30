const http = require('node:http');
const { URL } = require('node:url');

const config = require('./config');
const db = require('./db');
const launcher = require('./launcher');
const license = require('./license-manager');
const fingerprint = require('./fingerprint');
const proxy = require('./proxy');
const synchronizer = require('./synchronizer');
const extensions = require('./extensions');
const automation = require('./automation');
const cookiesModule = require('./cookies');
const kernelDownloader = require('./kernel-downloader');
const profileBackup = require('./profile-backup');

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data, null, 2));
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function parseBufferBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

const fs = require('node:fs');
const path = require('node:path');

const PUBLIC_DIR = path.join(config.BASE_DIR, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function serveStatic(res, filePath, isHead = false) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return false;
  }
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': mime,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Access-Control-Allow-Origin': '*',
  });
  if (isHead) {
    res.end();
  } else {
    fs.createReadStream(filePath).pipe(res);
  }
  return true;
}

function createServer() {
  const server = http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
      return res.end();
    }

    const reqUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    const pathname = reqUrl.pathname;
    const method = req.method;

    try {
      // 1. Static file serving
      if ((method === 'GET' || method === 'HEAD') && !pathname.startsWith('/api/')) {
        const targetFile = pathname === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, pathname);
        if (serveStatic(res, targetFile, method === 'HEAD')) {
          return;
        }
      }

      // 2. Health check & status
      if (pathname === '/api/health' || pathname === '/health') {
        return sendJson(res, 200, { status: 'ok', uptime: process.uptime() });
      }

      if (method === 'GET' && pathname === '/api/v1/status') {
        return sendJson(res, 200, {
          status: 'ok',
          name: 'Antidetect Profile Manager API',
          version: '1.0.0',
          kernels: config.getAvailableKernels(),
          defaultKernel: config.getDefaultKernelPath(),
          runningProfiles: launcher.getRunningProfiles(),
        });
      }

      // Kernel Management & In-App Auto Downloader API
      if (pathname === '/api/v1/kernel/status' && method === 'GET') {
        return sendJson(res, 200, {
          success: true,
          ...kernelDownloader.getKernelStatus(),
          kernels: config.getAvailableKernels(),
          defaultKernel: config.getDefaultKernelPath(),
        });
      }

      if (pathname === '/api/v1/kernel/download' && method === 'POST') {
        const body = await parseJsonBody(req);
        try {
          const result = await kernelDownloader.startDownload(body.url);
          return sendJson(res, 200, result);
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      if (pathname === '/api/v1/kernel/cancel' && method === 'POST') {
        const result = kernelDownloader.cancelDownload();
        return sendJson(res, 200, result);
      }

      if (pathname === '/api/v1/kernel/install-local' && method === 'POST') {
        const body = await parseJsonBody(req);
        const targetPath = body.path || 'C:\\Users\\Admin\\.gemini\\antigravity\\scratch\\MyBrowser-153-win64.zip';
        try {
          const result = await kernelDownloader.installFromLocalZip(targetPath);
          return sendJson(res, 200, result);
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      if (pathname === '/api/v1/kernel/open-folder' && method === 'POST') {
        const kernelDir = kernelDownloader.CHROMIUM_DIR || path.join(config.BASE_DIR, 'bin', 'chromium');
        if (!fs.existsSync(kernelDir)) {
          fs.mkdirSync(kernelDir, { recursive: true });
        }
        const { exec } = require('node:child_process');
        if (process.platform === 'win32') {
          exec(`cmd.exe /c start "" "${kernelDir}"`, (err) => {
            if (err) {
              exec(`powershell.exe -NoProfile -Command "Start-Process explorer.exe -ArgumentList '${kernelDir}'"`);
            }
          });
        } else if (process.platform === 'darwin') {
          exec(`open "${kernelDir}"`);
        } else {
          exec(`xdg-open "${kernelDir}"`);
        }
        return sendJson(res, 200, { success: true, path: kernelDir });
      }

      // Bulk Profiles Creation API
      if (method === 'POST' && pathname === '/api/v1/profiles/bulk-create') {
        const body = await parseJsonBody(req);
        const reqCount = Math.max(1, Math.min(Number(body.count) || 5, 200));
        const quota = license.canCreateProfile(reqCount);
        if (!quota.allowed) {
          return sendJson(res, 403, {
            success: false,
            error: quota.reason,
            limitExceeded: true,
            max_profiles: quota.max_profiles,
            current_profiles: quota.current_profiles,
            available_slots: quota.available_slots,
          });
        }
        try {
          const createdList = db.bulkCreateProfiles(body);
          return sendJson(res, 201, { success: true, count: createdList.length, profiles: createdList });
        } catch (err) {
          return sendJson(res, 500, { success: false, error: err.message });
        }
      }

      // Profile ZIP Import
      if (pathname === '/api/v1/profiles/import-zip' && method === 'POST') {
        const contentType = req.headers['content-type'] || '';
        try {
          let created = null;
          if (contentType.includes('application/json')) {
            const body = await parseJsonBody(req);
            if (!body.filePath) {
              return sendJson(res, 400, { success: false, error: 'Đường dẫn file zip (filePath) là bắt buộc' });
            }
            created = await profileBackup.importProfileFromZip(body.filePath, body.name);
          } else {
            const buffer = await parseBufferBody(req);
            if (!buffer || buffer.length === 0) {
              return sendJson(res, 400, { success: false, error: 'Dữ liệu file zip trống' });
            }
            created = await profileBackup.importProfileFromZip(buffer);
          }
          return sendJson(res, 201, { success: true, profile: created });
        } catch (err) {
          return sendJson(res, 500, { success: false, error: err.message });
        }
      }

      // 2. Profiles CRUD
      if (method === 'GET' && pathname === '/api/v1/profiles') {
        const list = db.listProfiles().map(p => ({
          ...p,
          isRunning: launcher.isProfileRunning(p.id),
        }));
        return sendJson(res, 200, { success: true, count: list.length, profiles: list });
      }

      if (method === 'POST' && pathname === '/api/v1/profiles') {
        // Kiểm tra hạn mức License
        const quota = license.canCreateProfile();
        if (!quota.allowed) {
          return sendJson(res, 403, {
            success: false,
            error: quota.reason,
            limitExceeded: true,
            max_profiles: quota.max_profiles,
            current_profiles: quota.current_profiles,
          });
        }
        const body = await parseJsonBody(req);
        const created = db.createProfile(body);
        return sendJson(res, 201, { success: true, profile: created });
      }

      // 3. Fingerprint Presets & Generator API
      if (method === 'GET' && pathname === '/api/v1/fingerprints/presets') {
        return sendJson(res, 200, {
          success: true,
          osList: Object.keys(fingerprint.OS_PRESETS),
          renderers: fingerprint.WEBGL_RENDERERS,
          resolutions: fingerprint.RESOLUTIONS,
          cpuCores: fingerprint.CPU_CORES,
          ramSizes: fingerprint.RAM_SIZES,
        });
      }

      if (method === 'POST' && pathname === '/api/v1/fingerprints/generate') {
        const body = await parseJsonBody(req);
        const fp = fingerprint.generateFingerprint(body);
        return sendJson(res, 200, { success: true, fingerprint: fp });
      }

      // 4. License API (CGT-License Engine)
      if (method === 'GET' && pathname === '/api/v1/license') {
        return sendJson(res, 200, { success: true, license: license.getLicenseStatus() });
      }

      if (method === 'POST' && pathname === '/api/v1/license/activate') {
        const body = await parseJsonBody(req);
        try {
          const result = await license.activateLicense(body.key);
          return sendJson(res, 200, { success: true, license: result });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      if (method === 'POST' && pathname === '/api/v1/license/deactivate') {
        const result = await license.deactivateLicense();
        return sendJson(res, 200, { success: true, license: result });
      }

      // Batch Profiles Control
      if (method === 'POST' && pathname === '/api/v1/profiles/batch-start') {
        const body = await parseJsonBody(req);
        const ids = Array.isArray(body.profileIds) ? body.profileIds : [];
        const results = [];
        for (const pid of ids) {
          try {
            const resData = await launcher.startProfile(pid);
            results.push({ profileId: pid, success: true, ...resData });
          } catch (err) {
            results.push({ profileId: pid, success: false, error: err.message });
          }
        }
        return sendJson(res, 200, { success: true, count: results.length, results });
      }

      if (method === 'POST' && pathname === '/api/v1/profiles/batch-stop') {
        const body = await parseJsonBody(req);
        const ids = Array.isArray(body.profileIds) ? body.profileIds : [];
        const results = [];
        for (const pid of ids) {
          try {
            const resData = await launcher.stopProfile(pid);
            results.push({ profileId: pid, success: true, ...resData });
          } catch (err) {
            results.push({ profileId: pid, success: false, error: err.message });
          }
        }
        return sendJson(res, 200, { success: true, count: results.length, results });
      }

      // Batch Profiles Proxy Update
      if (method === 'POST' && pathname === '/api/v1/profiles/batch-proxy') {
        const body = await parseJsonBody(req);
        const { profileIds, mode, proxyId, proxyList } = body;
        if (!Array.isArray(profileIds) || !profileIds.length) {
          return sendJson(res, 400, { success: false, error: 'profileIds required' });
        }
        const updated = [];
        if (mode === 'direct') {
          for (const pid of profileIds) {
            db.updateProfile(pid, { proxy_id: null });
            updated.push(pid);
          }
        } else if (mode === 'single') {
          for (const pid of profileIds) {
            db.updateProfile(pid, { proxy_id: proxyId || null });
            updated.push(pid);
          }
        } else if (mode === 'sequential' && Array.isArray(proxyList) && proxyList.length > 0) {
          for (let i = 0; i < profileIds.length; i++) {
            const pid = profileIds[i];
            const pStr = proxyList[i % proxyList.length];
            if (pStr) {
              const parsed = proxy.parseProxyString(pStr);
              if (parsed) {
                const created = db.createProxy({
                  name: `Batch Proxy ${i + 1}`,
                  type: parsed.type,
                  host: parsed.host,
                  port: parsed.port,
                  username: parsed.username,
                  password: parsed.password
                });
                db.updateProfile(pid, { proxy_id: created.id });
                updated.push(pid);
              }
            }
          }
        }
        return sendJson(res, 200, { success: true, count: updated.length, updated });
      }

      // Batch Delete
      if (method === 'POST' && pathname === '/api/v1/profiles/batch-delete') {
        const body = await parseJsonBody(req);
        const ids = Array.isArray(body.profileIds) ? body.profileIds : [];
        for (const pid of ids) {
          if (launcher.isProfileRunning(pid)) {
            await launcher.stopProfile(pid).catch(() => {});
          }
          db.deleteProfile(pid);
        }
        return sendJson(res, 200, { success: true, count: ids.length });
      }

      // Automation Endpoints
      if (method === 'POST' && pathname === '/api/v1/automation/warmup') {
        const body = await parseJsonBody(req);
        const { profileId } = body;
        if (!profileId) return sendJson(res, 400, { success: false, error: 'profileId required' });
        try {
          const result = await automation.runProfileWarmup(profileId);
          return sendJson(res, 200, result);
        } catch (err) {
          return sendJson(res, 500, { success: false, error: err.message });
        }
      }

      if (method === 'POST' && pathname === '/api/v1/automation/iphey') {
        const body = await parseJsonBody(req);
        const { profileId } = body;
        if (!profileId) return sendJson(res, 400, { success: false, error: 'profileId required' });
        try {
          const result = await automation.runIpheyAudit(profileId);
          return sendJson(res, 200, result);
        } catch (err) {
          return sendJson(res, 500, { success: false, error: err.message });
        }
      }

      if (method === 'POST' && pathname === '/api/v1/automation/facebook') {
        const body = await parseJsonBody(req);
        const { profileId } = body;
        if (!profileId) return sendJson(res, 400, { success: false, error: 'profileId required' });
        try {
          const result = await automation.triggerFacebookAutomation(profileId);
          return sendJson(res, 200, result);
        } catch (err) {
          return sendJson(res, 500, { success: false, error: err.message });
        }
      }

      // Profiles with :id
      const profileMatch = pathname.match(/^\/api\/v1\/profiles\/([a-zA-Z0-9_-]+)(?:\/(start|stop|active|cookies|export-zip|rotate-proxy))?$/);
      if (profileMatch) {
        const profileId = profileMatch[1];
        const action = profileMatch[2];

        // Export Profile to ZIP
        if (method === 'GET' && action === 'export-zip') {
          try {
            const { zipFilePath, zipFileName } = await profileBackup.exportProfileToZip(profileId);
            res.writeHead(200, {
              'Content-Type': 'application/zip',
              'Content-Disposition': `attachment; filename="${zipFileName}"`,
              'Access-Control-Allow-Origin': '*',
            });
            fs.createReadStream(zipFilePath).pipe(res);
            return;
          } catch (err) {
            return sendJson(res, 500, { success: false, error: err.message });
          }
        }

        // Rotate Proxy for Profile
        if (method === 'POST' && action === 'rotate-proxy') {
          try {
            const profile = db.getProfile(profileId);
            if (!profile) return sendJson(res, 404, { success: false, error: 'Profile not found' });
            if (!profile.proxy_id) return sendJson(res, 400, { success: false, error: 'Profile này chưa được gắn Proxy nào' });
            const p = db.getProxy(profile.proxy_id);
            if (!p) return sendJson(res, 404, { success: false, error: 'Proxy không tồn tại' });
            if (!p.rotation_api_url) return sendJson(res, 400, { success: false, error: 'Proxy này chưa được cài đặt link API Xoay IP (rotation_api_url)' });

            const rotRes = await proxy.triggerProxyRotation(p);
            const updated = db.updateProxy(p.id, {
              status: rotRes.newProxyInfo?.live ? 'live' : 'dead',
              ping: rotRes.newProxyInfo?.ping,
              ip: rotRes.newProxyInfo?.ip,
              country: rotRes.newProxyInfo?.country,
              city: rotRes.newProxyInfo?.city,
              isp: rotRes.newProxyInfo?.isp,
            });
            return sendJson(res, 200, { success: true, proxy: updated, result: rotRes });
          } catch (err) {
            return sendJson(res, 500, { success: false, error: err.message });
          }
        }

        // Cookies Export
        if (method === 'GET' && action === 'cookies') {
          try {
            const result = await cookiesModule.exportCookies(profileId);
            return sendJson(res, 200, result);
          } catch (err) {
            return sendJson(res, 500, { success: false, error: err.message });
          }
        }

        // Cookies Import
        if (method === 'POST' && action === 'cookies') {
          try {
            const body = await parseJsonBody(req);
            const cookiesList = Array.isArray(body.cookies) ? body.cookies : [];
            const result = await cookiesModule.importCookies(profileId, cookiesList);
            return sendJson(res, 200, result);
          } catch (err) {
            return sendJson(res, 500, { success: false, error: err.message });
          }
        }

        // Start profile
        if (method === 'POST' && action === 'start') {
          const body = await parseJsonBody(req);
          const result = await launcher.startProfile(profileId, body);
          return sendJson(res, 200, { success: true, ...result });
        }

        // Stop profile
        if (method === 'POST' && action === 'stop') {
          const body = await parseJsonBody(req);
          const result = await launcher.stopProfile(profileId, body.timeoutMs || 4000);
          return sendJson(res, 200, { success: true, ...result });
        }

        // Check active / CDP endpoint
        if (method === 'GET' && action === 'active') {
          const running = launcher.isProfileRunning(profileId);
          const list = launcher.getRunningProfiles();
          const info = list.find(x => x.profileId === profileId);
          return sendJson(res, 200, {
            success: true,
            profileId,
            isRunning: running,
            ...(info || {})
          });
        }

        // Get single profile
        if (method === 'GET' && !action) {
          const profile = db.getProfile(profileId);
          if (!profile) return sendJson(res, 404, { success: false, error: 'Profile not found' });
          return sendJson(res, 200, {
            success: true,
            profile: { ...profile, isRunning: launcher.isProfileRunning(profileId) }
          });
        }

        // Update single profile
        if (method === 'PUT' && !action) {
          const body = await parseJsonBody(req);
          const updated = db.updateProfile(profileId, body);
          if (!updated) return sendJson(res, 404, { success: false, error: 'Profile not found' });
          return sendJson(res, 200, { success: true, profile: updated });
        }

        // Delete single profile
        if (method === 'DELETE' && !action) {
          if (launcher.isProfileRunning(profileId)) {
            await launcher.stopProfile(profileId);
          }
          db.deleteProfile(profileId);
          return sendJson(res, 200, { success: true, message: 'Profile deleted' });
        }
      }

      // 5. Groups API (Full CRUD)
      const groupMatch = pathname.match(/^\/api\/v1\/groups(?:\/([a-zA-Z0-9_-]+))?$/);
      if (groupMatch) {
        const groupId = groupMatch[1];
        if (method === 'GET' && !groupId) {
          return sendJson(res, 200, { success: true, groups: db.listGroups() });
        }
        if (method === 'POST' && !groupId) {
          const body = await parseJsonBody(req);
          if (!body.name || !body.name.trim()) {
            return sendJson(res, 400, { success: false, error: 'Tên nhóm không được để trống' });
          }
          const group = db.createGroup(body.name.trim(), body.color || '#1890ff', body.notes || '');
          return sendJson(res, 201, { success: true, group });
        }
        if (method === 'GET' && groupId) {
          const group = db.getGroup(groupId);
          if (!group) return sendJson(res, 404, { success: false, error: 'Group not found' });
          return sendJson(res, 200, { success: true, group });
        }
        if (method === 'PUT' && groupId) {
          const body = await parseJsonBody(req);
          const updated = db.updateGroup(groupId, body);
          if (!updated) return sendJson(res, 404, { success: false, error: 'Group not found' });
          return sendJson(res, 200, { success: true, group: updated });
        }
        if (method === 'DELETE' && groupId) {
          db.deleteGroup(groupId);
          return sendJson(res, 200, { success: true, message: 'Group deleted' });
        }
      }

      // 6. Proxies API (Full CRUD, Batch Import & Live Check)
      if (method === 'POST' && pathname === '/api/v1/proxies/test-custom') {
        try {
          const body = await parseJsonBody(req);
          if (!body.host || !body.port) {
            return sendJson(res, 400, { success: false, error: 'Host và Port của proxy là bắt buộc để kiểm tra' });
          }
          const checkRes = await proxy.checkProxy({
            type: body.type || 'http',
            host: body.host,
            port: parseInt(body.port, 10),
            username: body.username || '',
            password: body.password || '',
          });
          return sendJson(res, 200, {
            success: true,
            status: checkRes.live ? 'live' : 'die',
            ip: checkRes.ip,
            ping: checkRes.ping,
            country: checkRes.country,
            city: checkRes.city,
            isp: checkRes.isp,
            error: checkRes.error,
            result: checkRes
          });
        } catch (err) {
          return sendJson(res, 500, { success: false, error: err.message });
        }
      }

      if (method === 'POST' && pathname === '/api/v1/proxies/check-all') {
        const list = db.listProxies();
        const results = [];
        for (const p of list) {
          const checkRes = await proxy.checkProxy(p);
          const updated = db.updateProxy(p.id, {
            status: checkRes.live ? 'live' : 'dead',
            ping: checkRes.ping,
            ip: checkRes.ip,
            country: checkRes.country,
            city: checkRes.city,
            isp: checkRes.isp,
          });
          results.push(updated);
        }
        const liveCount = results.filter(p => p.status === 'live').length;
        return sendJson(res, 200, { success: true, total: results.length, liveCount, proxies: results });
      }

      const proxyMatch = pathname.match(/^\/api\/v1\/proxies(?:\/([a-zA-Z0-9_-]+)(?:\/(check|rotate))?)?$/);
      if (proxyMatch) {
        const proxyId = proxyMatch[1];
        const subAction = proxyMatch[2];

        // Rotate single proxy via API
        if (method === 'POST' && proxyId && subAction === 'rotate') {
          const cur = db.getProxy(proxyId);
          if (!cur) return sendJson(res, 404, { success: false, error: 'Proxy not found' });
          if (!cur.rotation_api_url) return sendJson(res, 400, { success: false, error: 'Proxy này chưa được cài đặt link API Xoay IP (rotation_api_url)' });
          try {
            const rotRes = await proxy.triggerProxyRotation(cur);
            const updated = db.updateProxy(proxyId, {
              status: rotRes.newProxyInfo?.live ? 'live' : 'dead',
              ping: rotRes.newProxyInfo?.ping,
              ip: rotRes.newProxyInfo?.ip,
              country: rotRes.newProxyInfo?.country,
              city: rotRes.newProxyInfo?.city,
              isp: rotRes.newProxyInfo?.isp,
            });
            return sendJson(res, 200, { success: true, proxy: updated, result: rotRes });
          } catch (err) {
            return sendJson(res, 500, { success: false, error: err.message });
          }
        }

        // Check single proxy
        if (method === 'POST' && proxyId && subAction === 'check') {
          const cur = db.getProxy(proxyId);
          if (!cur) return sendJson(res, 404, { success: false, error: 'Proxy not found' });
          const checkRes = await proxy.checkProxy(cur);
          const updated = db.updateProxy(proxyId, {
            status: checkRes.live ? 'live' : 'dead',
            ping: checkRes.ping,
            ip: checkRes.ip,
            country: checkRes.country,
            city: checkRes.city,
            isp: checkRes.isp,
          });
          return sendJson(res, 200, {
            success: true,
            proxy: updated,
            result: checkRes,
            error: checkRes.error || null
          });
        }

        // List proxies
        if (method === 'GET' && !proxyId) {
          return sendJson(res, 200, { success: true, proxies: db.listProxies() });
        }

        // Create or Batch Import proxies
        if (method === 'POST' && !proxyId) {
          const body = await parseJsonBody(req);
          
          // Bulk text import (lines)
          const bulkRaw = body.bulk_text || body.raw;
          if (bulkRaw && typeof bulkRaw === 'string') {
            const lines = bulkRaw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
            const created = [];
            for (const line of lines) {
              const parsed = proxy.parseProxyString(line);
              if (parsed) {
                const item = db.createProxy({
                  name: body.name || `${parsed.host}:${parsed.port}`,
                  type: parsed.type,
                  host: parsed.host,
                  port: parsed.port,
                  username: parsed.username,
                  password: parsed.password,
                });
                created.push(item);
              }
            }
            return sendJson(res, 201, { success: true, count: created.length, proxies: created });
          }

          // Single proxy create
          let parsedData = body;
          if (body.proxyString) {
            const p = proxy.parseProxyString(body.proxyString);
            if (p) parsedData = { ...body, ...p };
          }
          if (!parsedData.host || !parsedData.port) {
            return sendJson(res, 400, { success: false, error: 'Host và Port của proxy là bắt buộc' });
          }
          const created = db.createProxy(parsedData);
          return sendJson(res, 201, { success: true, proxy: created });
        }

        // Get single proxy
        if (method === 'GET' && proxyId) {
          const p = db.getProxy(proxyId);
          if (!p) return sendJson(res, 404, { success: false, error: 'Proxy not found' });
          return sendJson(res, 200, { success: true, proxy: p });
        }

        // Update single proxy
        if (method === 'PUT' && proxyId) {
          const body = await parseJsonBody(req);
          const updated = db.updateProxy(proxyId, body);
          if (!updated) return sendJson(res, 404, { success: false, error: 'Proxy not found' });
          return sendJson(res, 200, { success: true, proxy: updated });
        }

        // Delete single proxy
        if (method === 'DELETE' && proxyId) {
          db.deleteProxy(proxyId);
          return sendJson(res, 200, { success: true, message: 'Proxy deleted' });
        }
      }

      // 7. Multi-Window Synchronizer & Tile Grid API (Bước 4)
      if (pathname === '/api/v1/sync/status' && method === 'GET') {
        return sendJson(res, 200, { success: true, ...synchronizer.getSyncStatus() });
      }

      if (pathname === '/api/v1/sync/start' && method === 'POST') {
        const body = await parseJsonBody(req);
        try {
          const status = await synchronizer.startSync({
            masterId: body.masterId,
            slaveIds: body.slaveIds,
            options: body.options,
          });
          return sendJson(res, 200, { success: true, ...status });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      if (pathname === '/api/v1/sync/stop' && method === 'POST') {
        const result = await synchronizer.stopSync();
        return sendJson(res, 200, { success: true, ...result });
      }

      if (pathname === '/api/v1/sync/tile-grid' && method === 'POST') {
        const body = await parseJsonBody(req);
        try {
          const result = await synchronizer.tileWindows({
            layout: body.layout || 'auto',
            screenWidth: body.screenWidth || 1920,
            screenHeight: body.screenHeight || 1040,
            profileIds: body.profileIds || null,
          });
          return sendJson(res, 200, { success: true, ...result });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      // 8. Extensions Hub API (Bước 5: Quản lý Tiện ích MMO & Facebook)
      if (pathname.startsWith('/api/v1/extensions')) {
        // Cài đặt / cập nhật các tiện ích mẫu (Presets)
        if (pathname === '/api/v1/extensions/install-presets' && method === 'POST') {
          extensions.ensurePresetsInDatabase();
          const list = db.listExtensions();
          return sendJson(res, 200, { success: true, count: list.length, extensions: list });
        }

        // Parse manifest từ thư mục cục bộ (trước khi lưu)
        if (pathname === '/api/v1/extensions/parse' && method === 'POST') {
          const body = await parseJsonBody(req);
          if (!body.path) return sendJson(res, 400, { success: false, error: 'Path is required' });
          try {
            const parsed = extensions.parseExtensionFromFolder(body.path);
            return sendJson(res, 200, { success: true, manifest: parsed });
          } catch (e) {
            return sendJson(res, 400, { success: false, error: e.message });
          }
        }

        // Danh sách tiện ích
        if (pathname === '/api/v1/extensions' && method === 'GET') {
          const list = db.listExtensions();
          return sendJson(res, 200, { success: true, extensions: list });
        }

        // Thêm tiện ích mới từ thư mục
        if (pathname === '/api/v1/extensions' && method === 'POST') {
          const body = await parseJsonBody(req);
          if (!body.path) return sendJson(res, 400, { success: false, error: 'Vui lòng cung cấp đường dẫn thư mục tiện ích' });

          let parsed = {};
          try {
            parsed = extensions.parseExtensionFromFolder(body.path);
          } catch (e) {
            return sendJson(res, 400, { success: false, error: e.message });
          }

          const created = db.createExtension({
            name: body.name || parsed.name,
            version: parsed.version || '1.0.0',
            description: body.description || parsed.description || '',
            icon_url: parsed.icon_url || '🧩',
            path: body.path,
            is_global: body.is_global !== undefined ? (body.is_global ? 1 : 0) : 1,
            enabled: 1,
          });
          return sendJson(res, 201, { success: true, extension: created });
        }

        // Bật / Tắt hoặc Xoá từng tiện ích
        const extMatch = pathname.match(/^\/api\/v1\/extensions\/([^\/]+)(\/(toggle|toggle-global))?$/);
        if (extMatch) {
          const extId = extMatch[1];
          const subAction = extMatch[3];

          if (method === 'GET' && !subAction) {
            const ext = db.getExtension(extId);
            if (!ext) return sendJson(res, 404, { success: false, error: 'Extension not found' });
            return sendJson(res, 200, { success: true, extension: ext });
          }

          if (method === 'POST' && subAction === 'toggle') {
            const toggled = db.toggleExtension(extId);
            if (!toggled) return sendJson(res, 404, { success: false, error: 'Extension not found' });
            return sendJson(res, 200, { success: true, extension: toggled });
          }

          if (method === 'POST' && subAction === 'toggle-global') {
            const toggled = db.toggleGlobalExtension(extId);
            if (!toggled) return sendJson(res, 404, { success: false, error: 'Extension not found' });
            return sendJson(res, 200, { success: true, extension: toggled });
          }

          if (method === 'PUT' && !subAction) {
            const body = await parseJsonBody(req);
            const updated = db.updateExtension(extId, body);
            if (!updated) return sendJson(res, 404, { success: false, error: 'Extension not found' });
            return sendJson(res, 200, { success: true, extension: updated });
          }

          if (method === 'DELETE' && !subAction) {
            db.deleteExtension(extId);
            return sendJson(res, 200, { success: true, message: 'Extension deleted' });
          }
        }
      }

      // 404
      return sendJson(res, 404, { success: false, error: 'Endpoint not found' });
    } catch (err) {
      console.error('[Server Error]', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  });

  return server;
}

function startServer(port = config.API_PORT) {
  try {
    extensions.ensurePresetsInDatabase();
  } catch (err) {
    console.warn('[Extensions] Failed to auto-init presets:', err.message);
  }

  const server = createServer();
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      console.log(`[API Server] Running at http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

module.exports = {
  createServer,
  startServer,
};
