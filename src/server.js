const http = require('node:http');
const { URL } = require('node:url');

const config = require('./config');
const db = require('./db');
const launcher = require('./launcher');
const license = require('./license-manager');
const licenseAdmin = require('./license-admin');
const auth = require('./auth');
const checkout = require('./checkout');
const mailer = require('./mailer');
const fingerprint = require('./fingerprint');
const proxy = require('./proxy');
const synchronizer = require('./synchronizer');
const extensions = require('./extensions');
const automation = require('./automation');
const automationEngine = require('./automation-engine');

let automationState = {
  isRunning: false,
  scriptName: '',
  progress: { total: 0, completed: 0, percent: 0, successCount: 0, failCount: 0 },
  logs: []
};
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


async function requireAdmin(req, res) {
  const user = await auth.getUserFromRequest(req);
  if (!user || user.role !== 'admin') {
    sendJson(res, 403, { success: false, error: 'Yêu cầu quyền Quản trị viên hệ thống (Admin)' });
    return null;
  }
  return user;
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

      if ((pathname === '/api/v1/system/browse-folder' || pathname === '/api/v1/extensions/browse-folder') && (method === 'GET' || method === 'POST')) {
        const { execFile } = require('node:child_process');
        if (process.platform === 'win32') {
          const spawnDesktopExe = path.join(config.BASE_DIR, 'bin', 'spawn-desktop.exe');
          const pickerExe = path.join(config.BASE_DIR, 'bin', 'pick-folder.exe');
          const tmpDir = path.join(config.BASE_DIR, 'tmp');
          if (!fs.existsSync(tmpDir)) {
            try { fs.mkdirSync(tmpDir, { recursive: true }); } catch {}
          }
          const outFile = path.join(tmpDir, `picked_folder_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.txt`);

          if (fs.existsSync(spawnDesktopExe) && fs.existsSync(pickerExe)) {
            // Launch via spawn-desktop.exe with --wait to guarantee execution on WinSta0\Default interactive desktop
            execFile(spawnDesktopExe, ['--wait', pickerExe, outFile], { timeout: 120000, windowsHide: false }, (err) => {
              let selected = '';
              if (fs.existsSync(outFile)) {
                try {
                  selected = fs.readFileSync(outFile, 'utf8').trim();
                  fs.unlinkSync(outFile);
                } catch {}
              }
              return sendJson(res, 200, { success: !!selected, path: selected });
            });
            return;
          }

          if (fs.existsSync(pickerExe)) {
            execFile(pickerExe, [outFile], { timeout: 120000, windowsHide: false, encoding: 'utf8' }, (err, stdout) => {
              let selected = stdout ? stdout.trim() : '';
              if (!selected && fs.existsSync(outFile)) {
                try {
                  selected = fs.readFileSync(outFile, 'utf8').trim();
                  fs.unlinkSync(outFile);
                } catch {}
              }
              return sendJson(res, 200, { success: !!selected, path: selected });
            });
            return;
          }

          // Fallback via PowerShell EncodedCommand (avoids quoting & escaping issues completely)
          const psScript = `
            [System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms") | Out-Null
            $form = New-Object System.Windows.Forms.Form
            $form.TopMost = $true
            $form.ShowInTaskbar = $false
            $form.WindowState = [System.Windows.Forms.FormWindowState]::Minimized
            $form.Show()
            $form.Activate()
            $f = New-Object System.Windows.Forms.FolderBrowserDialog
            $f.Description = "Chọn thư mục Extension đã giải nén (chứa manifest.json)"
            $f.ShowNewFolderButton = $true
            $res = $f.ShowDialog($form)
            $form.Close()
            if ($res -eq [System.Windows.Forms.DialogResult]::OK -and $f.SelectedPath) {
              [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
              [Console]::WriteLine($f.SelectedPath)
            }
          `;
          const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
          execFile('powershell.exe', ['-NoProfile', '-STA', '-WindowStyle', 'Hidden', '-EncodedCommand', encoded], { timeout: 120000, encoding: 'utf8' }, (err, stdout) => {
            const selected = stdout ? stdout.trim() : '';
            return sendJson(res, 200, { success: !!selected, path: selected });
          });
        } else {
          return sendJson(res, 200, { success: false, error: 'Not supported on this OS' });
        }
        return;
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
        const user = await auth.getUserFromRequest(req);
        const quota = license.canCreateProfile(reqCount, user);
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
          if (user) body.user_id = user.id;
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

      // -------------------------------------------------------------
      // Team Members & Workspace Permissions API (Lượt 3 - Strict RBAC & Plan Tiers)
      // -------------------------------------------------------------
      const teamMatch = pathname.match(/^\/api\/v1\/team\/members(?:\/([a-zA-Z0-9_-]+))?$/);
      if (teamMatch) {
        const memberId = teamMatch[1];
        const user = await auth.getUserFromRequest(req);
        
        // Resolve Effective Caller Role (Admin / Leader / Staff)
        let callerRole = auth.resolveUserRole ? auth.resolveUserRole(user) : (user?.role || 'admin');
        const previewRoleHeader = req.headers['x-team-preview-role'];
        if (callerRole === 'admin' && previewRoleHeader && ['admin', 'leader', 'staff'].includes(previewRoleHeader)) {
          callerRole = previewRoleHeader;
        }

        // Plan Tier Verification (Free vs Plus vs Pro)
        const previewPlanHeader = req.headers['x-team-preview-plan'];
        let effectivePlanCode = user?.plan_code || 'PRO_MONTHLY';
        let effectivePlanName = user?.plan || 'Gói Pro';

        if (previewPlanHeader && ['free', 'plus', 'pro'].includes(previewPlanHeader)) {
          if (previewPlanHeader === 'free') {
            effectivePlanCode = 'FREE_TRIAL';
            effectivePlanName = 'Gói Free (Miễn Phí)';
          } else if (previewPlanHeader === 'plus') {
            effectivePlanCode = 'PLUS';
            effectivePlanName = 'Gói Plus (Tối đa 5 thành viên)';
          } else {
            effectivePlanCode = 'PRO_MONTHLY';
            effectivePlanName = 'Gói Pro (Doanh nghiệp)';
          }
        }

        const effectiveUser = {
          ...user,
          plan_code: effectivePlanCode,
          plan: effectivePlanName
        };

        // Gating Check: Free accounts CANNOT use the Team feature
        const isTeamAllowed = auth.isTeamFeatureAllowed ? auth.isTeamFeatureAllowed(effectiveUser) : true;
        if (!isTeamAllowed) {
          return sendJson(res, 403, {
            success: false,
            featureLocked: true,
            currentPlan: effectivePlanName,
            requiredPlans: ['PLUS', 'PRO'],
            error: '🔒 Tính năng Quản lý Đội ngũ chỉ dành cho Gói Plus và Pro. Vui lòng nâng cấp tài khoản để sử dụng.'
          });
        }

        // List team members
        if (method === 'GET' && !memberId) {
          const ownerId = (user && user.id) || null;
          let members = db.listTeamMembers(ownerId);
          // Seed sample demo members if completely empty
          if (members.length === 0) {
            try {
              const defaultOwner = db.getDb().prepare("SELECT id FROM users ORDER BY created_at ASC LIMIT 1").get();
              const defaultOwnerId = (user && user.id) || (defaultOwner && defaultOwner.id);
              if (!db.getUserByEmail('leader-muse@cgtdev.space')) {
                await auth.createTeamMemberAccount({
                  ownerId: defaultOwnerId,
                  email: 'leader-muse@cgtdev.space',
                  password: 'OmniTeam@2026!',
                  fullName: 'Nguyễn Văn Tuấn (Leader)',
                  role: 'leader',
                  assignedGroups: [],
                  permissions: { safe_launch_only: false, can_create_profile: true, can_edit_profile: true, can_delete_profile: false }
                });
              }
              if (!db.getUserByEmail('staff-safe@cgtdev.space')) {
                await auth.createTeamMemberAccount({
                  ownerId: defaultOwnerId,
                  email: 'staff-safe@cgtdev.space',
                  password: 'OmniTeam@2026!',
                  fullName: 'Lê Thị Mai (Staff Safe Launch)',
                  role: 'staff',
                  assignedGroups: [],
                  permissions: { safe_launch_only: true, can_create_profile: false, can_edit_profile: false, can_delete_profile: false }
                });
              }
              members = db.listTeamMembers(ownerId);
            } catch {}
          }
          return sendJson(res, 200, {
            success: true,
            callerRole,
            count: members.length,
            members
          });
        }

        // Create team member (Strict RBAC)
        if (method === 'POST' && !memberId) {
          try {
            if (callerRole === 'staff') {
              return sendJson(res, 403, {
                success: false,
                error: '🛡️ Quyền bị từ chối: Chế độ Nhân viên (Staff Safe Launch) chỉ có quyền xem, không thể tạo hoặc mời thành viên mới.'
              });
            }

            const body = await parseJsonBody(req);
            const targetRole = body.role || 'staff';

            if (callerRole === 'leader' && targetRole !== 'staff') {
              return sendJson(res, 403, {
                success: false,
                error: '🛡️ Quyền bị từ chối: Trưởng nhóm (Leader) chỉ có quyền tạo Nhân viên (Staff), không thể tạo thêm Trưởng nhóm hoặc Quản trị viên.'
              });
            }

            const defaultOwner = db.getDb().prepare("SELECT id FROM users ORDER BY created_at ASC LIMIT 1").get();
            const ownerId = (user && user.id) || (defaultOwner && defaultOwner.id);

            // Seat Limit Check based on Plan (Plus: max 5, Pro: max 50)
            const memberLimit = auth.getTeamMemberLimit ? auth.getTeamMemberLimit(effectiveUser) : 50;
            const currentMembers = db.listTeamMembers(ownerId);
            if (currentMembers.length >= memberLimit) {
              return sendJson(res, 400, {
                success: false,
                limitReached: true,
                limit: memberLimit,
                error: `⚠️ Bạn đã đạt giới hạn tối đa ${memberLimit} thành viên của ${effectivePlanName}. Vui lòng nâng cấp lên Gói Pro để mở rộng thêm thành viên đội ngũ.`
              });
            }
            const created = await auth.createTeamMemberAccount({
              ownerId,
              email: body.email,
              password: body.password || 'OmniTeam@2026!',
              fullName: body.full_name || body.name,
              role: targetRole,
              assignedGroups: body.assigned_groups || [],
              permissions: body.permissions || {}
            });
            return sendJson(res, 201, { success: true, member: created });
          } catch (err) {
            return sendJson(res, 400, { success: false, error: err.message });
          }
        }

        // Get single member
        if (method === 'GET' && memberId) {
          const m = db.getTeamMemberById(memberId);
          if (!m) return sendJson(res, 404, { success: false, error: 'Không tìm thấy thành viên' });
          return sendJson(res, 200, { success: true, member: m });
        }

        // Update team member / Lock / Unlock (Strict RBAC)
        if ((method === 'PUT' || method === 'POST') && memberId) {
          try {
            const target = db.getTeamMemberById(memberId);
            if (!target) return sendJson(res, 404, { success: false, error: 'Không tìm thấy thành viên cần sửa' });

            // 1. Staff is strictly read-only
            if (callerRole === 'staff') {
              return sendJson(res, 403, {
                success: false,
                error: '🛡️ Quyền bị từ chối: Bạn đang ở quyền Nhân viên (Staff). Không thể chỉnh sửa cấu hình hoặc khóa tài khoản của người khác.'
              });
            }

            // 2. Leader can only modify Staff accounts
            if (callerRole === 'leader') {
              if (target.role === 'admin' || target.role === 'leader') {
                return sendJson(res, 403, {
                  success: false,
                  error: '🛡️ Quyền bị từ chối: Trưởng nhóm (Leader) không có quyền can thiệp, chỉnh sửa hoặc khóa tài khoản của Trưởng nhóm hoặc Quản trị viên.'
                });
              }
            }

            const body = await parseJsonBody(req);

            // Leader cannot promote staff to leader or admin
            if (callerRole === 'leader' && body.role && body.role !== 'staff') {
              return sendJson(res, 403, {
                success: false,
                error: '🛡️ Quyền bị từ chối: Trưởng nhóm (Leader) không thể thăng cấp tài khoản lên Trưởng nhóm hoặc Quản trị viên.'
              });
            }

            // Self protection for Admin
            if (user && (target.email === user.email || target.id === user.member_id) && body.status === 'suspended') {
              return sendJson(res, 400, {
                success: false,
                error: 'Bạn không thể tự khóa tài khoản của chính mình.'
              });
            }

            const updated = db.updateTeamMember(memberId, body);
            if (body.password && body.password.length >= 6) {
              const u = db.getUserByEmail(updated.email);
              if (u) {
                const passwordHash = auth.hashPassword(body.password);
                db.getDb().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, u.id);
              }
            }
            return sendJson(res, 200, { success: true, member: updated });
          } catch (err) {
            return sendJson(res, 400, { success: false, error: err.message });
          }
        }

        // Delete team member (Strict RBAC)
        if (method === 'DELETE' && memberId) {
          try {
            const target = db.getTeamMemberById(memberId);
            if (!target) return sendJson(res, 404, { success: false, error: 'Không tìm thấy thành viên cần xóa' });

            // 1. Staff cannot delete anyone
            if (callerRole === 'staff') {
              return sendJson(res, 403, {
                success: false,
                error: '🛡️ Quyền bị từ chối: Bạn đang ở quyền Nhân viên (Staff). Không có quyền xóa thành viên khỏi Đội Ngũ.'
              });
            }

            // 2. Leader can only delete Staff
            if (callerRole === 'leader') {
              if (target.role === 'admin' || target.role === 'leader') {
                return sendJson(res, 403, {
                  success: false,
                  error: '🛡️ Quyền bị từ chối: Trưởng nhóm (Leader) không có quyền xóa tài khoản của Trưởng nhóm hoặc Quản trị viên.'
                });
              }
            }

            // Self protection
            if (user && (target.email === user.email || target.id === user.member_id)) {
              return sendJson(res, 400, {
                success: false,
                error: 'Bạn không thể tự xóa tài khoản của chính mình.'
              });
            }

            const ok = db.deleteTeamMember(memberId);
            return sendJson(res, 200, { success: ok });
          } catch (err) {
            return sendJson(res, 500, { success: false, error: err.message });
          }
        }
      }

      // 2. Profiles CRUD
      if (method === 'GET' && pathname === '/api/v1/profiles') {
        const user = await auth.getUserFromRequest(req);
        const effectiveUserId = (user && user.owner_id) ? user.owner_id : (user ? user.id : null);
        let list = db.listProfiles(effectiveUserId).map(p => ({
          ...p,
          isRunning: launcher.isProfileRunning(p.id),
        }));

        // Workspace Group Assignment filter for Staff / Leader
        if (user && (user.role === 'staff' || user.role === 'leader') && Array.isArray(user.assigned_groups) && user.assigned_groups.length > 0) {
          list = list.filter(p => user.assigned_groups.includes(p.group_id));
        }

        // Staff Safe Launch Mode: Mask sensitive Proxy passwords & ISP credentials
        if (user && (user.safe_launch_mode || user.role === 'staff')) {
          list = list.map(p => {
            const safe = { ...p };
            if (safe.proxy_password) safe.proxy_password = '••••••••';
            if (safe.proxy_raw) safe.proxy_raw = safe.proxy_raw.replace(/:[^:@]+@/, ':••••••••@');
            return safe;
          });
        }

        return sendJson(res, 200, { success: true, count: list.length, profiles: list });
      }

      if (method === 'POST' && pathname === '/api/v1/profiles') {
        // Kiểm tra hạn mức License
        const user = await auth.getUserFromRequest(req);
        const quota = license.canCreateProfile(1, user);
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
        if (user) body.user_id = user.id;
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

      
      // ----------------- AUTH & USER ACCOUNT API ----------------- //
      // API Gửi mã OTP xác nhận email đăng ký
      if (method === 'POST' && pathname === '/api/v1/auth/send-otp') {
        const body = await parseJsonBody(req);
        try {
          const { code } = auth.sendRegistrationOtp(body.email);
          const mailResult = await mailer.sendOtpEmail({ toEmail: body.email, otpCode: code });
          return sendJson(res, 200, {
            success: true,
            message: mailResult.isMock
              ? `Mã xác nhận: ${code} (Hệ thống đang chạy chế độ thử nghiệm nội bộ, mã hiển thị tại đây để bạn tiện test)`
              : 'Mã xác nhận 6 số đã được gửi đến hòm thư của bạn. Vui lòng kiểm tra hộp thư đến (hoặc thư mục Spam).',
            isMock: mailResult.isMock,
            debugOtp: mailResult.isMock ? code : undefined
          });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      // API Cấu hình SMTP Email (Hỗ trợ cấu hình Gmail gửi thư)
      if (method === 'GET' && pathname === '/api/v1/system/smtp-config') {
        const cfg = mailer.getSmtpConfig();
        return sendJson(res, 200, {
          success: true,
          config: {
            host: cfg.host,
            port: cfg.port,
            secure: cfg.secure,
            user: cfg.user,
            pass: cfg.pass ? '••••••••' : '',
            from: cfg.from,
            isConfigured: Boolean(cfg.user && cfg.pass)
          }
        });
      }

      if (method === 'POST' && pathname === '/api/v1/system/smtp-config') {
        const adminUser = await requireAdmin(req, res);
        if (!adminUser) return;
        try {
          const body = await parseJsonBody(req);
          const smtpConfigFile = path.join(__dirname, '..', 'data', 'smtp_config.json');
          const current = mailer.getSmtpConfig();
          const updated = {
            ...current,
            host: body.host || current.host || 'smtp.gmail.com',
            port: Number(body.port) || current.port || 465,
            secure: body.secure !== undefined ? Boolean(body.secure) : current.secure,
            user: body.user !== undefined ? body.user.trim() : current.user,
            pass: body.pass ? body.pass.trim() : current.pass,
            from: body.from ? body.from.trim() : (body.user ? `OmniBrowser <${body.user.trim()}>` : current.from)
          };
          fs.writeFileSync(smtpConfigFile, JSON.stringify(updated, null, 2), 'utf8');
          return sendJson(res, 200, { success: true, message: 'Đã lưu cấu hình Gmail SMTP thành công', isConfigured: Boolean(updated.user && updated.pass) });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      if (method === 'POST' && pathname === '/api/v1/auth/register') {
        const body = await parseJsonBody(req);
        try {
          const result = await auth.register(body);
          return sendJson(res, 201, { success: true, ...result });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      if (method === 'POST' && pathname === '/api/v1/auth/login') {
        const body = await parseJsonBody(req);
        try {
          const result = await auth.login(body);
          return sendJson(res, 200, { success: true, ...result });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      if (method === 'GET' && pathname === '/api/v1/auth/google/callback') {
        const callbackHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Google Authentication</title>
</head>
<body style="font-family:sans-serif; text-align:center; padding:40px; background:#f8fafc;">
  <h3>Đang kết nối tài khoản Google...</h3>
  <script>
    (async function() {
      try {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash || window.location.search);
        const accessToken = params.get('access_token');
        const code = params.get('code');
        const error = params.get('error');

        if (error) {
          if (window.opener) {
            window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error }, '*');
          }
          window.close();
          return;
        }

        if (accessToken) {
          // Lấy thông tin user trực tiếp từ Google UserInfo API
          const uRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: 'Bearer ' + accessToken }
          });
          const profile = await uRes.json();
          if (window.opener) {
            window.opener.postMessage({
              type: 'GOOGLE_AUTH_SUCCESS',
              accessToken,
              googleProfile: profile,
              email: profile.email,
              name: profile.name,
              avatar: profile.picture
            }, '*');
          }
          window.close();
          return;
        }

        if (window.opener) {
          window.opener.postMessage({ type: 'GOOGLE_AUTH_CODE', code }, '*');
        }
        window.close();
      } catch (err) {
        if (window.opener) {
          window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: err.message }, '*');
        }
        window.close();
      }
    })();
  </script>
</body>
</html>`;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(callbackHtml);
        return;
      }

      if (method === 'POST' && pathname === '/api/v1/auth/google') {
        const body = await parseJsonBody(req);
        try {
          const result = await auth.googleAuth(body);
          return sendJson(res, 200, { success: true, ...result });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      if (method === 'GET' && pathname === '/api/v1/auth/google-config') {
        try {
          const config = auth.getGoogleConfig();
          return sendJson(res, 200, { success: true, config });
        } catch (err) {
          return sendJson(res, 500, { success: false, error: err.message });
        }
      }

      if (method === 'POST' && pathname === '/api/v1/auth/google-config') {
        const body = await parseJsonBody(req);
        try {
          const config = auth.saveGoogleConfig(body);
          return sendJson(res, 200, { success: true, config, message: 'Đã lưu cấu hình Google Client ID' });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      if (method === 'GET' && pathname === '/api/v1/auth/me') {
        try {
          const user = await auth.getUserFromRequest(req);
          return sendJson(res, 200, { success: true, user: user || null });
        } catch (err) {
          return sendJson(res, 500, { success: false, error: err.message });
        }
      }

      if (method === 'POST' && pathname === '/api/v1/auth/logout') {
        try {
          const token = req.headers['authorization'] || req.headers['x-auth-token'];
          await auth.logout(token);
          return sendJson(res, 200, { success: true, message: 'Đã đăng xuất' });
        } catch (err) {
          return sendJson(res, 500, { success: false, error: err.message });
        }
      }

      if (method === 'POST' && pathname === '/api/v1/auth/change-password') {
        try {
          const user = await auth.getUserFromRequest(req);
          if (!user) return sendJson(res, 401, { success: false, error: 'Chưa đăng nhập' });
          const body = await parseJsonBody(req);
          await auth.changePassword(user.id, body.oldPassword, body.newPassword);
          return sendJson(res, 200, { success: true, message: 'Đổi mật khẩu thành công' });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      // ----------------- CHECKOUT & PRICING API ----------------- //
      if (method === 'GET' && (pathname === '/api/v1/checkout/plans' || pathname === '/api/v1/license/packages')) {
        const forceRefresh = reqUrl.searchParams.get('refresh') === '1' || reqUrl.searchParams.get('force') === '1';
        const [plans, bankInfo] = await Promise.all([
          checkout.getPlans(forceRefresh),
          checkout.getBankConfig(forceRefresh)
        ]);
        return sendJson(res, 200, {
          success: true,
          server_url: licenseAdmin.DEFAULT_ADMIN.serverUrl,
          synced_at: new Date().toISOString(),
          plans,
          bankInfo
        });
      }

      if ((method === 'POST' || method === 'GET') && pathname === '/api/v1/license/sync') {
        const [plans, bankInfo] = await Promise.all([
          checkout.getPlans(true),
          checkout.getBankConfig(true)
        ]);
        return sendJson(res, 200, {
          success: true,
          server_url: licenseAdmin.DEFAULT_ADMIN.serverUrl,
          synced_at: new Date().toISOString(),
          plans,
          bankInfo,
          message: 'Đồng bộ danh mục gói thành công từ máy chủ lic.cgtdev.space'
        });
      }

      if (method === 'POST' && pathname === '/api/v1/checkout/create-order') {
        try {
          const body = await parseJsonBody(req);
          const currentUser = await auth.getUserFromRequest(req);
          const result = await checkout.createOrder({
            userId: currentUser?.id || null,
            email: body.email || currentUser?.email,
            name: body.name || currentUser?.name,
            phone: body.phone || '',
            planCode: body.planCode || 'PRO_MONTHLY',
            forceNew: Boolean(body.forceNew)
          });
          return sendJson(res, 201, { success: true, ...result });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      if (method === 'POST' && pathname === '/api/v1/checkout/expire-order') {
        try {
          const body = await parseJsonBody(req);
          const order = await checkout.expireOrder(body.orderId);
          return sendJson(res, 200, { success: true, order });
        } catch (err) {
          return sendJson(res, 500, { success: false, error: err.message });
        }
      }

      if (method === 'POST' && pathname === '/api/v1/checkout/confirm') {
        try {
          const body = await parseJsonBody(req);
          const currentUser = await auth.getUserFromRequest(req);
          const result = await checkout.confirmOrder({
            orderId: body.orderId,
            userId: currentUser?.id || null
          });
          return sendJson(res, 200, { success: true, ...result });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      // Webhook tự động duyệt thanh toán (SePay, Casso, MB Bank Bot, IPN)
      if (method === 'POST' && (pathname === '/api/v1/checkout/webhook' || pathname === '/api/v1/payment/webhook')) {
        try {
          const body = await parseJsonBody(req);
          const result = await checkout.processPaymentWebhook(body);
          return sendJson(res, result.success ? 200 : 400, result);
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      // Kiểm tra trạng thái đơn hàng thời gian thực (Polling khi đang mở VietQR & tự động đồng bộ từ lic.cgtdev.space)
      if (method === 'GET' && pathname === '/api/v1/checkout/order-status') {
        const orderId = reqUrl.searchParams.get('orderId');
        const order = await checkout.getOrderStatus(orderId);
        if (!order) return sendJson(res, 404, { success: false, error: 'Đơn hàng không tồn tại' });
        return sendJson(res, 200, {
          success: true,
          status: order.status,
          is_paid: order.status === 'PAID',
          is_expired: order.status === 'EXPIRED',
          license_key: order.license_key || '',
          plan_name: order.plan_name,
          paid_at: order.paid_at
        });
      }

      // ----------------- ADMIN USERS & SYSTEM MANAGEMENT API ----------------- //
      if (method === 'GET' && pathname === '/api/v1/admin/users') {
        const adminUser = await requireAdmin(req, res);
        if (!adminUser) return;
        const users = db.listUsers();
        return sendJson(res, 200, { success: true, users });
      }

      if (method === 'GET' && pathname === '/api/v1/admin/stats') {
        const adminUser = await requireAdmin(req, res);
        if (!adminUser) return;
        const stats = db.getAdminStats();
        return sendJson(res, 200, { success: true, stats });
      }

      if (method === 'GET' && pathname === '/api/v1/admin/orders') {
        const adminUser = await requireAdmin(req, res);
        if (!adminUser) return;
        const orders = db.listOrders(100);
        return sendJson(res, 200, { success: true, orders });
      }

      if (method === 'POST' && pathname === '/api/v1/admin/orders/approve') {
        const adminUser = await requireAdmin(req, res);
        if (!adminUser) return;
        try {
          const body = await parseJsonBody(req);
          const result = await checkout.confirmOrder({ orderId: body.orderId });
          return sendJson(res, 200, { success: true, ...result });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      if (method === 'POST' && pathname.startsWith('/api/v1/admin/users/') && pathname.endsWith('/plan')) {
        const adminUser = await requireAdmin(req, res);
        if (!adminUser) return;
        try {
          const targetUserId = pathname.split('/')[5];
          const targetUser = db.getUserById(targetUserId);
          if (!targetUser) return sendJson(res, 404, { success: false, error: 'Không tìm thấy tài khoản người dùng' });

          const body = await parseJsonBody(req);
          const planCode = body.planCode || 'PRO_MONTHLY';
          let issuedKey = null;

          if (planCode === 'FREE_TRIAL') {
            db.updateUser(targetUserId, {
              plan: 'Free Trial',
              plan_code: 'FREE_TRIAL',
              max_profiles: 50,
              expires_at: null,
              license_key: '',
              updated_at: new Date().toISOString()
            });
          } else {
            const durationDays = body.durationDays || (planCode === 'VIP_LIFETIME' ? 3650 : 30);
            try {
              const issued = await licenseAdmin.issueKey({
                planCode,
                durationDays,
                notes: `Cấp bởi Admin cho ${targetUser.email}`,
                customer: { name: targetUser.name, email: targetUser.email }
              });
              if (issued && issued.key) issuedKey = issued.key;
            } catch (licErr) {
              console.warn('[AdminUsers] Online issue key failed, using fallback:', licErr.message);
              const prefix = planCode === 'VIP_LIFETIME' ? 'OMNI-VIP' : 'OMNI-PRO';
              issuedKey = `${prefix}-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
            }

            const planName = planCode === 'VIP_LIFETIME' ? 'VIP Lifetime' : (durationDays <= 31 ? 'Pro 30 Ngày' : 'Pro Plus');
            const maxProfiles = planCode === 'VIP_LIFETIME' ? 2000 : 500;
            await auth.activateKeyForUser(targetUserId, issuedKey, {
              durationDays,
              plan: planName,
              planCode,
              maxProfiles
            });
          }

          const updated = db.getUserById(targetUserId);
          return sendJson(res, 200, { success: true, user: auth.publicUser(updated), key: issuedKey });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      if (method === 'POST' && pathname.startsWith('/api/v1/admin/users/') && pathname.endsWith('/status')) {
        const adminUser = await requireAdmin(req, res);
        if (!adminUser) return;
        try {
          const targetUserId = pathname.split('/')[5];
          if (targetUserId === adminUser.id) {
            return sendJson(res, 400, { success: false, error: 'Không thể tự khóa tài khoản của chính mình' });
          }
          const body = await parseJsonBody(req);
          const newStatus = body.status === 'BANNED' ? 'BANNED' : 'ACTIVE';
          const updated = db.updateUserStatus(targetUserId, newStatus);
          return sendJson(res, 200, { success: true, user: auth.publicUser(updated) });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      if (method === 'POST' && pathname.startsWith('/api/v1/admin/users/') && pathname.endsWith('/role')) {
        const adminUser = await requireAdmin(req, res);
        if (!adminUser) return;
        try {
          const targetUserId = pathname.split('/')[5];
          if (targetUserId === adminUser.id) {
            return sendJson(res, 400, { success: false, error: 'Không thể tự thay đổi vai trò của chính mình' });
          }
          const body = await parseJsonBody(req);
          const newRole = body.role === 'admin' ? 'admin' : 'user';
          const updated = db.updateUserRole(targetUserId, newRole);
          return sendJson(res, 200, { success: true, user: auth.publicUser(updated) });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      if (method === 'POST' && pathname.startsWith('/api/v1/admin/users/') && pathname.endsWith('/reset-password')) {
        const adminUser = await requireAdmin(req, res);
        if (!adminUser) return;
        try {
          const targetUserId = pathname.split('/')[5];
          const body = await parseJsonBody(req);
          const newPassword = body.newPassword || 'OmniBrowser@2026';
          const hash = auth.hashPassword(newPassword);
          db.resetUserPassword(targetUserId, hash);
          return sendJson(res, 200, { success: true, message: 'Đã đặt lại mật khẩu thành công', newPassword });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      if (method === 'DELETE' && pathname.startsWith('/api/v1/admin/users/')) {
        const adminUser = await requireAdmin(req, res);
        if (!adminUser) return;
        try {
          const targetUserId = pathname.split('/')[5];
          if (targetUserId === adminUser.id) {
            return sendJson(res, 400, { success: false, error: 'Không thể xóa tài khoản của chính mình' });
          }
          db.deleteUser(targetUserId);
          return sendJson(res, 200, { success: true, message: 'Đã xóa tài khoản thành công' });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      if (method === 'POST' && pathname === '/api/v1/auth/activate-key') {
        try {
          const user = await auth.getUserFromRequest(req);
          if (!user) return sendJson(res, 401, { success: false, error: 'Vui lòng đăng nhập để kích hoạt bản quyền cho tài khoản' });
          const body = await parseJsonBody(req);
          const updatedUser = await auth.activateKeyForUser(user.id, body.key);
          return sendJson(res, 200, { success: true, user: updatedUser });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      // 4. License API (CGT-License Engine)
      if (method === 'GET' && pathname === '/api/v1/license') {
        const user = await auth.getUserFromRequest(req);
        return sendJson(res, 200, { success: true, license: license.getLicenseStatus(user) });
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

      // CGT-License Admin Integration
      if (method === 'GET' && pathname === '/api/v1/license/admin/info') {
        return sendJson(res, 200, {
          success: true,
          email: licenseAdmin.DEFAULT_ADMIN.email,
          server_url: licenseAdmin.DEFAULT_ADMIN.serverUrl,
          product_code: 'ANTIDETECT',
          has_2fa: true,
          active_key: 'OMNI-JV6FN-6RFDQ-J00FP-FE7GS'
        });
      }

      if (method === 'POST' && pathname === '/api/v1/license/admin/auto-activate') {
        try {
          let key = 'OMNI-JV6FN-6RFDQ-J00FP-FE7GS';
          try {
            const issued = await licenseAdmin.issueKey({
              planCode: 'VIP_LIFETIME',
              durationDays: 3650,
              notes: 'Tự động kích hoạt VIP OmniBrowser'
            });
            if (issued && issued.key) key = issued.key;
          } catch (issueErr) {
            console.warn('[LicenseAdmin] Issue new key fallback to initial VIP key:', issueErr.message);
          }
          const result = await license.activateLicense(key);
          return sendJson(res, 200, { success: true, license: result, key });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      if (method === 'POST' && pathname === '/api/v1/license/admin/issue') {
        const body = await parseJsonBody(req);
        try {
          const result = await licenseAdmin.issueKey({
            planCode: body.planCode || 'VIP_LIFETIME',
            durationDays: Number(body.durationDays) || 3650,
            notes: body.notes || 'Created via OmniBrowser Admin Portal'
          });
          return sendJson(res, 200, { success: true, ...result });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      if (method === 'GET' && pathname === '/api/v1/license/admin/list') {
        try {
          const result = await licenseAdmin.listAdminLicenses();
          return sendJson(res, 200, { success: true, ...result });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
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

      // Stop All Running Profiles
      if (method === 'POST' && pathname === '/api/v1/profiles/stop-all') {
        const result = await launcher.stopAllProfiles();
        return sendJson(res, 200, result);
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

      // Automation No-code & Script Management Endpoints
      if (method === 'GET' && pathname === '/api/v1/automation/scripts') {
        const scripts = db.listAutomationScripts().map(s => ({
          ...s,
          steps: typeof s.steps === 'string' ? JSON.parse(s.steps || '[]') : s.steps
        }));
        return sendJson(res, 200, { success: true, scripts });
      }

      if (method === 'POST' && pathname === '/api/v1/automation/scripts') {
        try {
          const body = await parseJsonBody(req);
          const script = db.createAutomationScript(body);
          return sendJson(res, 201, { success: true, script });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      if (method === 'PUT' && pathname.startsWith('/api/v1/automation/scripts/')) {
        try {
          const scriptId = pathname.split('/')[5];
          const body = await parseJsonBody(req);
          const updated = db.updateAutomationScript(scriptId, body);
          return sendJson(res, 200, { success: true, script: updated });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      if (method === 'DELETE' && pathname.startsWith('/api/v1/automation/scripts/')) {
        try {
          const scriptId = pathname.split('/')[5];
          db.deleteAutomationScript(scriptId);
          return sendJson(res, 200, { success: true });
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message });
        }
      }

      if (method === 'GET' && pathname === '/api/v1/automation/status') {
        return sendJson(res, 200, {
          success: true,
          status: {
            is_running: !!automationState.isRunning,
            script_name: automationState.scriptName,
            total: (automationState.progress && automationState.progress.total) || 0,
            completed: (automationState.progress && automationState.progress.completed) || 0,
            running: automationState.isRunning ? Math.max(0, (automationState.progress.total || 0) - (automationState.progress.completed || 0)) : 0,
            failed: (automationState.progress && automationState.progress.failCount) || 0,
            concurrency: automationState.concurrency || 2,
            recent_logs: (automationState.logs || []).slice(-50).map(l => typeof l === 'string' ? l : `[${l.time || ''}] ${l.message || ''}`)
          },
          ...automationState,
          logs: automationState.logs.slice(-60)
        });
      }

      if (method === 'POST' && pathname === '/api/v1/automation/run') {
        try {
          const body = await parseJsonBody(req);
          const rawIds = body.profileIds || body.profile_ids || (body.profileId ? [body.profileId] : (body.profile_id ? [body.profile_id] : []));
          const profileIds = Array.isArray(rawIds) ? rawIds : [];
          if (profileIds.length === 0) {
            return sendJson(res, 400, { success: false, error: 'Vui lòng chọn ít nhất 1 hồ sơ để chạy kịch bản' });
          }

          let steps = body.steps;
          let scriptName = body.scriptName || body.script_name || 'Kịch bản tùy chỉnh';
          const scriptId = body.scriptId || body.script_id;

          if (!steps && scriptId) {
            const sc = db.getAutomationScript(scriptId);
            if (sc) {
              scriptName = sc.name;
              steps = typeof sc.steps === 'string' ? JSON.parse(sc.steps) : sc.steps;
            }
          }

          if (!steps || !Array.isArray(steps) || steps.length === 0) {
            return sendJson(res, 400, { success: false, error: 'Kịch bản không có bước thực thi nào' });
          }

          if (automationState.isRunning) {
            return sendJson(res, 409, { success: false, error: 'Đang có một tiến trình tự động hóa khác đang chạy' });
          }

          // Reset state & start async
          automationState.isRunning = true;
          automationState.scriptName = scriptName;
          automationState.concurrency = body.concurrency || 2;
          automationState.progress = { total: profileIds.length, completed: 0, percent: 0, successCount: 0, failCount: 0 };
          automationState.logs = [{
            time: new Date().toLocaleTimeString('vi-VN'),
            message: `🚀 Bắt đầu chạy kịch bản "${scriptName}" trên ${profileIds.length} hồ sơ...`,
            level: 'info'
          }];

          const options = {
            concurrency: body.concurrency || 2,
            autoClose: body.autoClose !== undefined ? body.autoClose : (body.auto_close !== undefined ? body.auto_close : true),
            bypassProxyGuard: body.bypassProxyGuard !== undefined ? body.bypassProxyGuard : (body.bypass_proxy_guard !== undefined ? body.bypass_proxy_guard : false)
          };

          // Chạy nền
          automationEngine.executeBatch(
            profileIds,
            steps,
            options,
            (prog) => {
              automationState.progress = prog;
            },
            (logItem) => {
              automationState.logs.push(logItem);
              if (automationState.logs.length > 300) automationState.logs.shift();
            }
          ).then(batchResult => {
            automationState.isRunning = false;
            automationState.logs.push({
              time: new Date().toLocaleTimeString('vi-VN'),
              message: `🎉 HOÀN THÀNH TẤT CẢ! Thành công: ${batchResult.successCount}/${batchResult.total}, Thất bại: ${batchResult.failCount}`,
              level: 'success'
            });
          }).catch(batchErr => {
            automationState.isRunning = false;
            automationState.logs.push({
              time: new Date().toLocaleTimeString('vi-VN'),
              message: `❌ Lỗi hàng loạt: ${batchErr.message}`,
              level: 'error'
            });
          });

          return sendJson(res, 200, {
            success: true,
            message: `Đã kích hoạt chạy kịch bản trên ${profileIds.length} hồ sơ`,
            totalProfiles: profileIds.length
          });
        } catch (err) {
          return sendJson(res, 500, { success: false, error: err.message });
        }
      }

      if (method === 'POST' && pathname === '/api/v1/automation/stop') {
        automationState.isRunning = false;
        automationState.logs.push({
          time: new Date().toLocaleTimeString('vi-VN'),
          message: '⏹️ Đã dừng tiến trình tự động hóa bởi người dùng',
          level: 'warning'
        });
        return sendJson(res, 200, { success: true });
      }

      // Legacy Automation Endpoints
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
          const user = await auth.getUserFromRequest(req);
          if (user && (user.safe_launch_mode || user.role === 'staff')) {
            return sendJson(res, 403, {
              success: false,
              safeLaunchBlocked: true,
              error: '🛡️ Chế độ Staff Safe Launch: Bạn không có quyền xuất dữ liệu hồ sơ (Export ZIP) nhằm bảo vệ an toàn tài nguyên MMO của chủ sở hữu.'
            });
          }
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
          const user = await auth.getUserFromRequest(req);
          if (user && (user.safe_launch_mode || user.role === 'staff')) {
            return sendJson(res, 403, {
              success: false,
              safeLaunchBlocked: true,
              error: '🛡️ Chế độ Staff Safe Launch: Bạn không có quyền xem hoặc xuất Cookie thô nhằm bảo mật tài nguyên MMO.'
            });
          }
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

        // Start profile with Pre-launch Proxy Guard
        if (method === 'POST' && action === 'start') {
          try {
            const body = await parseJsonBody(req);
            const result = await launcher.startProfile(profileId, body);
            return sendJson(res, 200, { success: true, ...result });
          } catch (err) {
            const isGuardFailed = err.code === 'PROXY_GUARD_FAILED' || (err.message && err.message.includes('PROXY_GUARD_FAILED'));
            return sendJson(res, isGuardFailed ? 400 : 500, {
              success: false,
              proxyGuardFailed: isGuardFailed,
              error: err.message,
              proxyHost: err.proxyHost,
              proxyPort: err.proxyPort,
              proxyError: err.proxyError,
              proxyId: err.proxyId,
              profileId: err.profileId || profileId,
              profileName: err.profileName,
              rotationApiUrl: err.rotationApiUrl
            });
          }
        }

        // Check proxy safety for profile
        if (method === 'POST' && action === 'check-proxy') {
          try {
            const profile = db.getProfile(profileId);
            if (!profile) return sendJson(res, 404, { success: false, error: 'Không tìm thấy profile' });
            if (!profile.proxy_host || !profile.proxy_port) {
              return sendJson(res, 200, { success: true, hasProxy: false, live: true, message: 'Profile không dùng proxy (Direct)' });
            }
            const checkRes = await proxy.checkProxy({
              type: profile.proxy_type || 'http',
              host: profile.proxy_host,
              port: profile.proxy_port,
              username: profile.proxy_user,
              password: profile.proxy_pass
            }, 5000);
            return sendJson(res, 200, { success: true, hasProxy: true, ...checkRes });
          } catch (err) {
            return sendJson(res, 500, { success: false, error: err.message });
          }
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
          const user = await auth.getUserFromRequest(req);
          const effectiveUserId = (user && user.owner_id) ? user.owner_id : (user ? user.id : null);
          let list = db.listProxies(effectiveUserId);
          if (user && (user.safe_launch_mode || user.role === 'staff')) {
            list = list.map(p => ({
              ...p,
              password: '••••••••',
              username: p.username ? (p.username.slice(0, 2) + '***') : '',
              rotation_api_url: p.rotation_api_url ? '••••••••' : '',
            }));
          }
          return sendJson(res, 200, { success: true, proxies: list });
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
