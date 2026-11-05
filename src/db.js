const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DB_PATH, ensureDirectories, getDefaultKernelPath } = require('./config');
const fingerprint = require('./fingerprint');

let _db = null;

function getDb() {
  if (!_db) {
    ensureDirectories();
    _db = new DatabaseSync(DB_PATH);
    _db.exec('PRAGMA journal_mode = WAL;');
    _db.exec('PRAGMA synchronous = FULL;');
    _db.exec('PRAGMA foreign_keys = ON;');
    initSchema();
    try { _db.exec('ALTER TABLE orders ADD COLUMN remote_order_id TEXT;'); } catch {} 
    try { _db.exec('ALTER TABLE orders ADD COLUMN remote_order_code TEXT;'); } catch {}
    try { _db.exec('ALTER TABLE users ADD COLUMN phone TEXT DEFAULT "";'); } catch {} 
    try { _db.exec('ALTER TABLE users ADD COLUMN google_id TEXT DEFAULT "";'); } catch {} 
    try { _db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT "";'); } catch {} 
    try { _db.exec('ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT "local";'); } catch {} 
    autoRepairKernelPaths();
  }
  return _db;
}

function initSchema() {
  _db.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#1890ff',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS proxies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'http',
      host TEXT NOT NULL,
      port INTEGER NOT NULL,
      username TEXT DEFAULT '',
      password TEXT DEFAULT '',
      status TEXT DEFAULT 'unknown',
      ip TEXT DEFAULT '',
      country TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      group_id TEXT,
      kernel_path TEXT NOT NULL,
      proxy_id TEXT,
      user_agent TEXT DEFAULT '',
      canvas_noise INTEGER DEFAULT 1,
      webgl_noise INTEGER DEFAULT 1,
      audio_noise INTEGER DEFAULT 1,
      webrtc_mode TEXT DEFAULT 'fake_ip',
      cpu_cores INTEGER DEFAULT 8,
      ram_gb INTEGER DEFAULT 8,
      screen_width INTEGER DEFAULT 1920,
      screen_height INTEGER DEFAULT 1080,
      custom_flags TEXT DEFAULT '',
      start_url TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      fingerprint TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_run_at TEXT,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL,
      FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT DEFAULT '',
      role TEXT DEFAULT 'user',
      plan TEXT DEFAULT 'Free Trial',
      plan_code TEXT DEFAULT 'FREE_TRIAL',
      license_key TEXT DEFAULT '',
      remote_order_id TEXT DEFAULT '',
      remote_order_code TEXT DEFAULT '',
      max_profiles INTEGER DEFAULT 50,
      expires_at TEXT,
      status TEXT DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      customer_email TEXT NOT NULL,
      customer_name TEXT DEFAULT '',
      customer_phone TEXT DEFAULT '',
      plan_code TEXT NOT NULL,
      plan_name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      duration_days INTEGER NOT NULL,
      max_profiles INTEGER NOT NULL,
      status TEXT DEFAULT 'PENDING',
      transfer_content TEXT NOT NULL,
      license_key TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      paid_at TEXT
    );

    CREATE TABLE IF NOT EXISTS extensions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT DEFAULT '1.0.0',
      description TEXT DEFAULT '',
      icon_url TEXT DEFAULT '',
      path TEXT NOT NULL,
      is_global INTEGER DEFAULT 1,
      enabled INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS automation_scripts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT DEFAULT 'general',
      icon TEXT DEFAULT '⚡',
      steps TEXT NOT NULL,
      is_preset INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      email TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      assigned_groups TEXT DEFAULT '[]',
      permissions TEXT DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Migrate schema
  try { _db.exec('ALTER TABLE profiles ADD COLUMN fingerprint TEXT;'); } catch {}
  try { _db.exec("ALTER TABLE profiles ADD COLUMN extension_ids TEXT DEFAULT '[]';"); } catch {}
  try { _db.exec("ALTER TABLE profiles ADD COLUMN auto_rotate_proxy INTEGER DEFAULT 0;"); } catch {}
  try { _db.exec("ALTER TABLE groups ADD COLUMN notes TEXT DEFAULT '';"); } catch {}
  try { _db.exec('ALTER TABLE proxies ADD COLUMN ping INTEGER DEFAULT 0;'); } catch {}
  try { _db.exec("ALTER TABLE proxies ADD COLUMN city TEXT DEFAULT '';"); } catch {}
  try { _db.exec("ALTER TABLE proxies ADD COLUMN isp TEXT DEFAULT '';"); } catch {}
  try { _db.exec("ALTER TABLE proxies ADD COLUMN rotation_api_url TEXT DEFAULT '';"); } catch {}
  try { _db.exec("ALTER TABLE profiles ADD COLUMN proxy_guard INTEGER DEFAULT 1;"); } catch {}
  try { _db.exec("ALTER TABLE profiles ADD COLUMN user_id TEXT DEFAULT '';"); } catch {}
  try { _db.exec("ALTER TABLE groups ADD COLUMN user_id TEXT DEFAULT '';"); } catch {}
  try { _db.exec("ALTER TABLE proxies ADD COLUMN user_id TEXT DEFAULT '';"); } catch {}
  try { _db.exec("ALTER TABLE users ADD COLUMN member_id TEXT DEFAULT '';"); } catch {}
  try { _db.exec("ALTER TABLE users ADD COLUMN owner_id TEXT DEFAULT '';"); } catch {}
  try { _db.exec("ALTER TABLE team_members ADD COLUMN assigned_groups TEXT DEFAULT '[]';"); } catch {}
  try { _db.exec("ALTER TABLE team_members ADD COLUMN permissions TEXT DEFAULT '{}';"); } catch {}

  seedDefaultUserIfEmpty();
}


function seedDefaultUserIfEmpty() {
  try {
    const row = _db.prepare('SELECT count(*) as count FROM users').get();
    if (row && row.count === 0) {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.scryptSync('TumyAdmin@2026!', salt, 64).toString('hex');
      const passwordHash = salt + ':' + hash;
      const now = new Date().toISOString();
      const insert = _db.prepare(`
        INSERT INTO users (id, email, password_hash, name, role, plan, plan_code, license_key, max_profiles, expires_at, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insert.run(
        crypto.randomUUID(),
        'cgt-license@cgtdev.space',
        passwordHash,
        'CGT Admin',
        'admin',
        'VIP Lifetime',
        'VIP_LIFETIME',
        'OMNI-JV6FN-6RFDQ-J00FP-FE7GS',
        5000,
        null,
        'ACTIVE',
        now,
        now
      );
      console.log('[DB] Khởi tạo tài khoản Quản trị viên mặc định: cgt-license@cgtdev.space');
    }
  } catch (err) {
    console.warn('[DB] seedDefaultUserIfEmpty error:', err.message);
  }
}

function createUser(user) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, plan, plan_code, license_key, max_profiles, expires_at, status, created_at, updated_at, phone, google_id, avatar_url, auth_provider)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    user.id,
    user.email,
    user.password_hash,
    user.name || '',
    user.role || 'user',
    user.plan || 'Free Trial',
    user.plan_code || 'FREE_TRIAL',
    user.license_key || '',
    user.max_profiles || 50,
    user.expires_at || null,
    user.status || 'ACTIVE',
    user.created_at || new Date().toISOString(),
    user.updated_at || new Date().toISOString(),
    user.phone || "",
    user.google_id || "",
    user.avatar_url || "",
    user.auth_provider || "local"
  );
  return user;
}

function getUserByEmail(email) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
}


function getUserByGoogleId(googleId) {
  if (!googleId) return null;
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId);
}

function getUserById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function updateUser(id, updates) {
  const db = getDb();
  const keys = Object.keys(updates);
  if (keys.length === 0) return getUserById(id);
  const setClauses = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => updates[k]);
  values.push(id);
  db.prepare(`UPDATE users SET ${setClauses} WHERE id = ?`).run(...values);
  return getUserById(id);
}

function createSession(token, userId, expiresAt) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO sessions (token, user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(token, userId, now, expiresAt);
}

function getSession(token) {
  const db = getDb();
  return db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
}

function deleteSession(token) {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

function listUsers() {
  const db = getDb();
  return db.prepare('SELECT id, email, name, role, plan, plan_code, max_profiles, expires_at, status, created_at FROM users ORDER BY created_at DESC').all();
}

function autoRepairKernelPaths() {
  try {
    const defaultKernel = getDefaultKernelPath();
    if (!defaultKernel) return;

    const rows = _db.prepare('SELECT id, name, kernel_path FROM profiles').all();
    const updateStmt = _db.prepare('UPDATE profiles SET kernel_path = ?, updated_at = ? WHERE id = ?');
    const now = new Date().toISOString();

    for (const r of rows) {
      if (!r.kernel_path || !fs.existsSync(r.kernel_path)) {
        console.log(`[DB Auto-Repair] Cập nhật profile "${r.name}" (${r.id.slice(0, 8)}) sang nhân Chromium khả dụng: ${defaultKernel}`);
        updateStmt.run(defaultKernel, now, r.id);
      }
    }
  } catch (err) {
    console.warn('[DB Auto-Repair] Không thể tự động vá đường dẫn kernel:', err.message);
  }
}

// ---------------- Profiles API ---------------- //

function listProfiles(userId = null) {
  const db = getDb();
  if (userId) {
    return db.prepare(`
      SELECT p.*, g.name AS group_name, g.color AS group_color,
             pr.type AS proxy_type, pr.host AS proxy_host, pr.port AS proxy_port,
             pr.username AS proxy_user, pr.password AS proxy_pass,
             pr.rotation_api_url AS proxy_rotation_api_url
      FROM profiles p
      LEFT JOIN groups g ON p.group_id = g.id
      LEFT JOIN proxies pr ON p.proxy_id = pr.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `).all(userId);
  }
  return db.prepare(`
    SELECT p.*, g.name AS group_name, g.color AS group_color,
           pr.type AS proxy_type, pr.host AS proxy_host, pr.port AS proxy_port,
           pr.username AS proxy_user, pr.password AS proxy_pass,
           pr.rotation_api_url AS proxy_rotation_api_url
    FROM profiles p
    LEFT JOIN groups g ON p.group_id = g.id
    LEFT JOIN proxies pr ON p.proxy_id = pr.id
    ORDER BY p.created_at DESC
  `).all();
}

function getProfile(id) {
  const db = getDb();
  return db.prepare(`
    SELECT p.*, g.name AS group_name, g.color AS group_color,
           pr.type AS proxy_type, pr.host AS proxy_host, pr.port AS proxy_port,
           pr.username AS proxy_user, pr.password AS proxy_pass,
           pr.rotation_api_url AS proxy_rotation_api_url
    FROM profiles p
    LEFT JOIN groups g ON p.group_id = g.id
    LEFT JOIN proxies pr ON p.proxy_id = pr.id
    WHERE p.id = ?
  `).get(id);
}

function createProfile(data) {
  const db = getDb();
  const id = data.id || crypto.randomUUID();
  const now = new Date().toISOString();
  let kernelPath = data.kernel_path;
  if (!kernelPath || !fs.existsSync(kernelPath)) {
    kernelPath = getDefaultKernelPath();
  }

  // Generate cohesive fingerprint if not explicitly provided
  let fp = data.fingerprint;
  if (!fp || typeof fp !== 'object') {
    fp = fingerprint.generateFingerprint({
      os: data.os || 'windows',
      cpu: data.cpu_cores,
      memory: data.ram_gb,
      resolution: { width: data.screen_width || 1920, height: data.screen_height || 1080 },
      userAgent: data.user_agent,
      canvasMode: data.canvas_noise === 0 ? 'real' : 'noise',
      audioMode: data.audio_noise === 0 ? 'real' : 'noise',
      webrtcMode: data.webrtc_mode,
    });
  }

  const userAgent = fp.userAgent || data.user_agent || '';
  const screenWidth = fp.screen ? fp.screen.width : (data.screen_width || 1920);
  const screenHeight = fp.screen ? fp.screen.height : (data.screen_height || 1080);
  const cpuCores = fp.hardwareConcurrency || data.cpu_cores || 8;
  const ramGb = fp.deviceMemory || data.ram_gb || 8;
  const fpJson = JSON.stringify(fp);

  let proxyId = data.proxy_id || null;
  if (!proxyId && data.proxy_url) {
    const proxyModule = require('./proxy');
    const parsed = proxyModule.parseProxyString(data.proxy_url);
    if (parsed) {
      const createdProxy = createProxy({
        name: `Proxy for ${data.name || id.slice(0, 8)}`,
        type: parsed.type,
        host: parsed.host,
        port: parsed.port,
        username: parsed.username,
        password: parsed.password,
      });
      proxyId = createdProxy.id;
    }
  }

  const extensionIds = Array.isArray(data.extension_ids)
    ? JSON.stringify(data.extension_ids)
    : (typeof data.extension_ids === 'string' ? data.extension_ids : '[]');

  const stmt = db.prepare(`
    INSERT INTO profiles (
      id, name, group_id, kernel_path, proxy_id, user_agent,
      canvas_noise, webgl_noise, audio_noise, webrtc_mode,
      cpu_cores, ram_gb, screen_width, screen_height,
      custom_flags, start_url, notes, fingerprint, extension_ids, auto_rotate_proxy, proxy_guard, user_id, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  stmt.run(
    id,
    data.name || `Profile ${id.slice(0, 8)}`,
    data.group_id || null,
    kernelPath,
    proxyId,
    userAgent,
    data.canvas_noise !== undefined ? (data.canvas_noise ? 1 : 0) : 1,
    data.webgl_noise !== undefined ? (data.webgl_noise ? 1 : 0) : 1,
    data.audio_noise !== undefined ? (data.audio_noise ? 1 : 0) : 1,
    data.webrtc_mode || 'fake_ip',
    cpuCores,
    ramGb,
    screenWidth,
    screenHeight,
    data.custom_flags || '',
    data.start_url !== undefined ? data.start_url : '',
    data.notes || '',
    fpJson,
    extensionIds,
    data.auto_rotate_proxy ? 1 : 0,
    data.proxy_guard !== undefined ? (data.proxy_guard ? 1 : 0) : 1,
    data.user_id || '',
    now,
    now
  );

  return getProfile(id);
}

function updateProfile(id, data) {
  const db = getDb();
  const current = getProfile(id);
  if (!current) return null;

  const now = new Date().toISOString();
  let fpJson = current.fingerprint;
  if (data.fingerprint) {
    fpJson = typeof data.fingerprint === 'object' ? JSON.stringify(data.fingerprint) : data.fingerprint;
  }

  let extensionIds = current.extension_ids || '[]';
  if (data.extension_ids !== undefined) {
    extensionIds = Array.isArray(data.extension_ids) ? JSON.stringify(data.extension_ids) : String(data.extension_ids);
  }

  const stmt = db.prepare(`
    UPDATE profiles SET
      name = ?, group_id = ?, kernel_path = ?, proxy_id = ?, user_agent = ?,
      canvas_noise = ?, webgl_noise = ?, audio_noise = ?, webrtc_mode = ?,
      cpu_cores = ?, ram_gb = ?, screen_width = ?, screen_height = ?,
      custom_flags = ?, start_url = ?, notes = ?, fingerprint = ?, extension_ids = ?, auto_rotate_proxy = ?, proxy_guard = ?, updated_at = ?
    WHERE id = ?
  `);

  let proxyId = data.proxy_id !== undefined ? data.proxy_id : current.proxy_id;
  if (data.proxy_url) {
    const proxyModule = require('./proxy');
    const parsed = proxyModule.parseProxyString(data.proxy_url);
    if (parsed) {
      const createdProxy = createProxy({
        name: `Proxy for ${data.name || current.name}`,
        type: parsed.type,
        host: parsed.host,
        port: parsed.port,
        username: parsed.username,
        password: parsed.password,
      });
      proxyId = createdProxy.id;
    }
  } else if (data.proxy_id === null || data.proxy_id === '') {
    proxyId = null;
  }

  let targetKernel = data.kernel_path ?? current.kernel_path;
  if (!targetKernel || !fs.existsSync(targetKernel)) {
    targetKernel = getDefaultKernelPath();
  }

  stmt.run(
    data.name ?? current.name,
    data.group_id !== undefined ? data.group_id : current.group_id,
    targetKernel,
    proxyId,
    data.user_agent ?? current.user_agent,
    data.canvas_noise !== undefined ? (data.canvas_noise ? 1 : 0) : current.canvas_noise,
    data.webgl_noise !== undefined ? (data.webgl_noise ? 1 : 0) : current.webgl_noise,
    data.audio_noise !== undefined ? (data.audio_noise ? 1 : 0) : current.audio_noise,
    data.webrtc_mode ?? current.webrtc_mode,
    data.cpu_cores ?? current.cpu_cores,
    data.ram_gb ?? current.ram_gb,
    data.screen_width ?? current.screen_width,
    data.screen_height ?? current.screen_height,
    data.custom_flags ?? current.custom_flags,
    data.start_url ?? current.start_url,
    data.notes ?? current.notes,
    fpJson,
    extensionIds,
    data.auto_rotate_proxy !== undefined ? (data.auto_rotate_proxy ? 1 : 0) : (current.auto_rotate_proxy || 0),
    data.proxy_guard !== undefined ? (data.proxy_guard ? 1 : 0) : (current.proxy_guard ?? 1),
    now,
    id
  );

  return getProfile(id);
}

function updateProfileLastRun(id) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE profiles SET last_run_at = ?, updated_at = ? WHERE id = ?').run(now, now, id);
}

function deleteProfile(id) {
  const db = getDb();
  return db.prepare('DELETE FROM profiles WHERE id = ?').run(id);
}

function bulkCreateProfiles(options = {}) {
  const count = Math.max(1, Math.min(Number(options.count) || 5, 200));
  const namePrefix = (options.namePrefix || 'Profile').trim();
  const groupId = options.groupId || null;
  const osOption = options.os || 'windows';
  const webrtcMode = options.webrtc_mode || 'fake_ip';
  const startUrl = options.start_url !== undefined ? options.start_url : '';
  const notes = options.notes || '';
  const extensionIds = Array.isArray(options.extension_ids) ? options.extension_ids : [];

  let assignedProxies = [];
  if (Array.isArray(options.proxyIds) && options.proxyIds.length > 0) {
    assignedProxies = options.proxyIds;
  } else if (Array.isArray(options.proxyList) && options.proxyList.length > 0) {
    const proxyModule = require('./proxy');
    for (let i = 0; i < options.proxyList.length; i++) {
      const pStr = options.proxyList[i];
      const parsed = proxyModule.parseProxyString(pStr);
      if (parsed) {
        const created = createProxy({
          name: `${namePrefix}_Proxy_${i + 1}`,
          type: parsed.type,
          host: parsed.host,
          port: parsed.port,
          username: parsed.username,
          password: parsed.password,
        });
        assignedProxies.push(created.id);
      }
    }
  }

  const createdList = [];
  const padLength = count >= 100 ? 3 : 2;

  for (let i = 1; i <= count; i++) {
    const profileName = `${namePrefix}_${String(i).padStart(padLength, '0')}`;
    let targetOs = osOption;
    if (osOption === 'random') {
      const osChoices = ['windows', 'windows', 'windows', 'mac', 'linux'];
      targetOs = osChoices[Math.floor(Math.random() * osChoices.length)];
    }

    const assignedProxyId = assignedProxies.length > 0
      ? assignedProxies[(i - 1) % assignedProxies.length]
      : null;

    const fp = fingerprint.generateFingerprint({
      os: targetOs,
      canvasMode: options.canvas_noise === 0 ? 'real' : 'noise',
      audioMode: options.audio_noise === 0 ? 'real' : 'noise',
      webrtcMode: webrtcMode,
    });

    const profile = createProfile({
      name: profileName,
      group_id: groupId,
      proxy_id: assignedProxyId,
      user_agent: fp.userAgent,
      cpu_cores: fp.hardwareConcurrency,
      ram_gb: fp.deviceMemory,
      screen_width: fp.screen ? fp.screen.width : 1920,
      screen_height: fp.screen ? fp.screen.height : 1080,
      canvas_noise: options.canvas_noise !== undefined ? options.canvas_noise : 1,
      webgl_noise: options.webgl_noise !== undefined ? options.webgl_noise : 1,
      audio_noise: options.audio_noise !== undefined ? options.audio_noise : 1,
      webrtc_mode: webrtcMode,
      start_url: startUrl,
      notes: notes,
      fingerprint: fp,
      extension_ids: extensionIds,
      auto_rotate_proxy: options.auto_rotate_proxy ? 1 : 0,
    });

    createdList.push(profile);
  }

  return createdList;
}

// ---------------- Groups & Proxies ---------------- //

function listGroups(userId = null) {
  const db = getDb();
  if (userId) {
    return db.prepare(`
      SELECT g.*, COUNT(p.id) AS profile_count
      FROM groups g
      LEFT JOIN profiles p ON p.group_id = g.id
      WHERE g.user_id = ? OR g.user_id = '' OR g.user_id IS NULL
      GROUP BY g.id
      ORDER BY g.created_at ASC
    `).all(userId);
  }
  return db.prepare(`
    SELECT g.*, COUNT(p.id) AS profile_count
    FROM groups g
    LEFT JOIN profiles p ON p.group_id = g.id
    GROUP BY g.id
    ORDER BY g.created_at ASC
  `).all();
}

function getGroup(id) {
  return getDb().prepare('SELECT * FROM groups WHERE id = ?').get(id);
}

function createGroup(name, color = '#1890ff', notes = '', userId = '') {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO groups (id, name, color, notes, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, name, color, notes, userId || '', now);
  return getGroup(id);
}

function updateGroup(id, data) {
  const db = getDb();
  const cur = getGroup(id);
  if (!cur) return null;
  db.prepare(`
    UPDATE groups SET
      name = ?, color = ?, notes = ?
    WHERE id = ?
  `).run(
    data.name ?? cur.name,
    data.color ?? cur.color,
    data.notes ?? cur.notes,
    id
  );
  return getGroup(id);
}

function deleteGroup(id) {
  const db = getDb();
  // Unlink profiles from this group
  db.prepare('UPDATE profiles SET group_id = NULL WHERE group_id = ?').run(id);
  return db.prepare('DELETE FROM groups WHERE id = ?').run(id);
}

function listProxies(userId = null) {
  const db = getDb();
  if (userId) {
    return db.prepare(`
      SELECT pr.*, COUNT(p.id) AS profile_count
      FROM proxies pr
      LEFT JOIN profiles p ON p.proxy_id = pr.id
      WHERE pr.user_id = ? OR pr.user_id = '' OR pr.user_id IS NULL
      GROUP BY pr.id
      ORDER BY pr.created_at DESC
    `).all(userId);
  }
  return db.prepare(`
    SELECT pr.*, COUNT(p.id) AS profile_count
    FROM proxies pr
    LEFT JOIN profiles p ON p.proxy_id = pr.id
    GROUP BY pr.id
    ORDER BY pr.created_at DESC
  `).all();
}

function getProxy(id) {
  return getDb().prepare('SELECT * FROM proxies WHERE id = ?').get(id);
}

function createProxy(data) {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO proxies (id, name, type, host, port, username, password, rotation_api_url, status, ping, ip, country, city, isp, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.name || `${data.host}:${data.port}`,
    data.type || 'http',
    data.host,
    Number(data.port),
    data.username || '',
    data.password || '',
    data.rotation_api_url || '',
    data.status || 'unknown',
    data.ping || 0,
    data.ip || '',
    data.country || '',
    data.city || '',
    data.isp || '',
    now
  );
  return getProxy(id);
}

function updateProxy(id, data) {
  const db = getDb();
  const cur = getProxy(id);
  if (!cur) return null;
  db.prepare(`
    UPDATE proxies SET
      name = ?, type = ?, host = ?, port = ?, username = ?, password = ?, rotation_api_url = ?,
      status = ?, ping = ?, ip = ?, country = ?, city = ?, isp = ?
    WHERE id = ?
  `).run(
    data.name ?? cur.name,
    data.type ?? cur.type,
    data.host ?? cur.host,
    data.port !== undefined ? Number(data.port) : cur.port,
    data.username !== undefined ? data.username : cur.username,
    data.password !== undefined ? data.password : cur.password,
    data.rotation_api_url !== undefined ? data.rotation_api_url : (cur.rotation_api_url || ''),
    data.status ?? cur.status,
    data.ping !== undefined ? Number(data.ping) : cur.ping,
    data.ip ?? cur.ip,
    data.country ?? cur.country,
    data.city ?? cur.city,
    data.isp ?? cur.isp,
    id
  );
  return getProxy(id);
}

function deleteProxy(id) {
  const db = getDb();
  db.prepare('UPDATE profiles SET proxy_id = NULL WHERE proxy_id = ?').run(id);
  return db.prepare('DELETE FROM proxies WHERE id = ?').run(id);
}

// ---------------- Extensions API ---------------- //

function listExtensions() {
  const db = getDb();
  return db.prepare('SELECT * FROM extensions ORDER BY created_at DESC').all();
}

function getExtension(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM extensions WHERE id = ?').get(id);
}

function createExtension(data) {
  const db = getDb();
  const id = data.id || ('ext_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12));
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO extensions (id, name, version, description, icon_url, path, is_global, enabled, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.name || 'Unnamed Extension',
    data.version || '1.0.0',
    data.description || '',
    data.icon_url || '',
    data.path,
    data.is_global !== undefined ? (data.is_global ? 1 : 0) : 1,
    data.enabled !== undefined ? (data.enabled ? 1 : 0) : 1,
    now
  );
  return getExtension(id);
}

function updateExtension(id, data) {
  const db = getDb();
  const cur = getExtension(id);
  if (!cur) return null;

  db.prepare(`
    UPDATE extensions SET
      name = ?, version = ?, description = ?, icon_url = ?, path = ?, is_global = ?, enabled = ?
    WHERE id = ?
  `).run(
    data.name ?? cur.name,
    data.version ?? cur.version,
    data.description ?? cur.description,
    data.icon_url ?? cur.icon_url,
    data.path ?? cur.path,
    data.is_global !== undefined ? (data.is_global ? 1 : 0) : cur.is_global,
    data.enabled !== undefined ? (data.enabled ? 1 : 0) : cur.enabled,
    id
  );
  return getExtension(id);
}

function toggleExtension(id) {
  const db = getDb();
  const cur = getExtension(id);
  if (!cur) return null;
  const newEnabled = cur.enabled ? 0 : 1;
  db.prepare('UPDATE extensions SET enabled = ? WHERE id = ?').run(newEnabled, id);
  return getExtension(id);
}

function toggleGlobalExtension(id) {
  const db = getDb();
  const cur = getExtension(id);
  if (!cur) return null;
  const newGlobal = cur.is_global ? 0 : 1;
  db.prepare('UPDATE extensions SET is_global = ? WHERE id = ?').run(newGlobal, id);
  return getExtension(id);
}

function deleteExtension(id) {
  const db = getDb();
  return db.prepare('DELETE FROM extensions WHERE id = ?').run(id);
}

function getActiveExtensionPathsForProfile(profileId) {
  const db = getDb();
  const profile = getProfile(profileId);
  if (!profile) return [];

  let profileExtIds = [];
  try {
    if (profile.extension_ids) {
      profileExtIds = typeof profile.extension_ids === 'string' ? JSON.parse(profile.extension_ids) : profile.extension_ids;
      if (!Array.isArray(profileExtIds)) profileExtIds = [];
    }
  } catch {
    profileExtIds = [];
  }

  const allExtensions = db.prepare('SELECT * FROM extensions WHERE enabled = 1').all();
  const validPaths = [];

  for (const ext of allExtensions) {
    const isTargeted = ext.is_global === 1 || profileExtIds.includes(ext.id);
    if (!isTargeted) continue;

    if (ext.path && fs.existsSync(ext.path)) {
      const manifestPath = path.join(ext.path, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        validPaths.push(ext.path);
      }
    }
  }

  return validPaths;
}


function deleteUser(id) {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  return db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

function updateUserStatus(id, status) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);
  if (status === 'BANNED') {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  }
  return getUserById(id);
}

function updateUserRole(id, role) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').run(role, now, id);
  return getUserById(id);
}

function resetUserPassword(id, passwordHash) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(passwordHash, now, id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  return getUserById(id);
}

function createOrder(order) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO orders (id, user_id, customer_email, customer_name, customer_phone, plan_code, plan_name, amount, duration_days, max_profiles, status, transfer_content, license_key, created_at, updated_at, paid_at, remote_order_id, remote_order_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    order.id,
    order.user_id || null,
    order.customer_email,
    order.customer_name || '',
    order.customer_phone || '',
    order.plan_code,
    order.plan_name,
    order.amount,
    order.duration_days,
    order.max_profiles,
    order.status || 'PENDING',
    order.transfer_content,
    order.license_key || '',
    order.created_at,
    order.updated_at,
    order.paid_at || null,
    order.remote_order_id || null,
    order.remote_order_code || null
  );
  return order;
}

function getOrderById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
}

function listOrders(limit = 100) {
  const db = getDb();
  return db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?').all(limit);
}

function updateOrder(id, updates) {
  const db = getDb();
  const keys = Object.keys(updates);
  if (keys.length === 0) return getOrderById(id);
  const setClauses = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => updates[k]);
  values.push(id);
  db.prepare(`UPDATE orders SET ${setClauses} WHERE id = ?`).run(...values);
  return getOrderById(id);
}

function getAdminStats() {
  const db = getDb();
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get()?.c || 0;
  const proUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE plan_code LIKE '%PRO%'").get()?.c || 0;
  const vipUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE plan_code LIKE '%VIP%'").get()?.c || 0;
  const activeUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'ACTIVE'").get()?.c || 0;
  const bannedUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'BANNED'").get()?.c || 0;
  const totalProfiles = db.prepare('SELECT COUNT(*) as c FROM profiles').get()?.c || 0;
  const totalOrders = db.prepare('SELECT COUNT(*) as c FROM orders').get()?.c || 0;
  const paidOrders = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'PAID'").get()?.c || 0;
  const revenue = db.prepare("SELECT SUM(amount) as s FROM orders WHERE status = 'PAID'").get()?.s || 0;

  return {
    totalUsers,
    proUsers,
    vipUsers,
    activeUsers,
    bannedUsers,
    totalProfiles,
    totalOrders,
    paidOrders,
    revenue
  };
}


// ---------------- Automation Scripts API ---------------- //

function listAutomationScripts() {
  const db = getDb();
  return db.prepare('SELECT * FROM automation_scripts ORDER BY is_preset DESC, created_at DESC').all();
}

function getAutomationScript(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM automation_scripts WHERE id = ?').get(id);
}

function createAutomationScript(data) {
  const db = getDb();
  const id = data.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const stepsJson = Array.isArray(data.steps) ? JSON.stringify(data.steps) : (data.steps || '[]');

  db.prepare(`
    INSERT INTO automation_scripts (id, name, description, category, icon, steps, is_preset, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.name || 'Kịch bản mới',
    data.description || '',
    data.category || 'custom',
    data.icon || '⚡',
    stepsJson,
    data.is_preset ? 1 : 0,
    now,
    now
  );
  return getAutomationScript(id);
}

function updateAutomationScript(id, data) {
  const db = getDb();
  const now = new Date().toISOString();
  const stepsJson = data.steps !== undefined ? (Array.isArray(data.steps) ? JSON.stringify(data.steps) : String(data.steps)) : null;

  const current = getAutomationScript(id);
  if (!current) return null;

  db.prepare(`
    UPDATE automation_scripts SET
      name = ?, description = ?, category = ?, icon = ?, steps = ?, updated_at = ?
    WHERE id = ?
  `).run(
    data.name ?? current.name,
    data.description ?? current.description,
    data.category ?? current.category,
    data.icon ?? current.icon,
    stepsJson ?? current.steps,
    now,
    id
  );
  return getAutomationScript(id);
}

function deleteAutomationScript(id) {
  const db = getDb();
  return db.prepare('DELETE FROM automation_scripts WHERE id = ? AND is_preset = 0').run(id);
}

function formatTeamMember(row) {
  if (!row) return null;
  let assignedGroups = [];
  try {
    assignedGroups = typeof row.assigned_groups === 'string' ? JSON.parse(row.assigned_groups || '[]') : (row.assigned_groups || []);
  } catch {
    assignedGroups = [];
  }
  let permissions = {};
  try {
    permissions = typeof row.permissions === 'string' ? JSON.parse(row.permissions || '{}') : (row.permissions || {});
  } catch {
    permissions = {};
  }
  return {
    ...row,
    assigned_groups: assignedGroups,
    permissions: permissions
  };
}

function createTeamMember(member) {
  const db = getDb();
  const id = member.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const assignedGroupsJson = JSON.stringify(member.assigned_groups || []);
  const permissionsJson = JSON.stringify(member.permissions || {
    safe_launch_only: member.role === 'staff',
    can_create_profile: member.role !== 'staff',
    can_edit_profile: true,
    can_delete_profile: member.role === 'admin',
    can_view_proxy: member.role !== 'staff',
    can_export: member.role !== 'staff',
  });

  const stmt = db.prepare(`
    INSERT INTO team_members (id, owner_id, email, full_name, role, assigned_groups, permissions, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    member.owner_id,
    (member.email || '').toLowerCase().trim(),
    (member.full_name || member.name || '').trim(),
    member.role || 'staff',
    assignedGroupsJson,
    permissionsJson,
    member.status || 'active',
    now,
    now
  );

  return getTeamMemberById(id);
}

function listTeamMembers(ownerId = null) {
  const db = getDb();
  let rows = [];
  if (ownerId) {
    rows = db.prepare('SELECT * FROM team_members WHERE owner_id = ? ORDER BY created_at DESC').all(ownerId);
  } else {
    rows = db.prepare('SELECT * FROM team_members ORDER BY created_at DESC').all();
  }
  return rows.map(formatTeamMember);
}

function getTeamMemberById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM team_members WHERE id = ?').get(id);
  return formatTeamMember(row);
}

function getTeamMemberByEmail(email) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM team_members WHERE LOWER(email) = LOWER(?)').get(email);
  return formatTeamMember(row);
}

function updateTeamMember(id, data) {
  const db = getDb();
  const current = getTeamMemberById(id);
  if (!current) throw new Error('Không tìm thấy thành viên đội ngũ');

  const fullName = data.full_name !== undefined ? data.full_name : current.full_name;
  const role = data.role !== undefined ? data.role : current.role;
  const status = data.status !== undefined ? data.status : current.status;
  const assignedGroups = data.assigned_groups !== undefined ? JSON.stringify(data.assigned_groups) : JSON.stringify(current.assigned_groups);
  const permissions = data.permissions !== undefined ? JSON.stringify(data.permissions) : JSON.stringify(current.permissions);
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE team_members
    SET full_name = ?, role = ?, status = ?, assigned_groups = ?, permissions = ?, updated_at = ?
    WHERE id = ?
  `);
  stmt.run(fullName, role, status, assignedGroups, permissions, now, id);

  return getTeamMemberById(id);
}

function deleteTeamMember(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM team_members WHERE id = ?');
  const res = stmt.run(id);
  try {
    db.prepare('DELETE FROM users WHERE member_id = ?').run(id);
  } catch {}
  return res.changes > 0;
}

module.exports = {
  createTeamMember,
  listTeamMembers,
  getTeamMemberById,
  getTeamMemberByEmail,
  updateTeamMember,
  deleteTeamMember,
  listAutomationScripts,
  getAutomationScript,
  createAutomationScript,
  updateAutomationScript,
  deleteAutomationScript,
  getDb,
  listProfiles,
  getProfile,
  createProfile,
  bulkCreateProfiles,
  updateProfile,
  updateProfileLastRun,
  deleteProfile,
  listGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  listProxies,
  getProxy,
  createProxy,
  updateProxy,
  deleteProxy,
  listExtensions,
  getExtension,
  createExtension,
  updateExtension,
  toggleExtension,
  toggleGlobalExtension,
  deleteExtension,
  getActiveExtensionPathsForProfile,
  createUser,
  getUserByEmail,
  getUserById,
  getUserByGoogleId,
  updateUser,
  createSession,
  getSession,
  deleteSession,
  listUsers,
  deleteUser,
  updateUserStatus,
  updateUserRole,
  resetUserPassword,
  createOrder,
  getOrderById,
  listOrders,
  updateOrder,
  getAdminStats,
};