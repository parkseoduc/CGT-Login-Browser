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
      start_url TEXT DEFAULT 'https://iphey.com',
      notes TEXT DEFAULT '',
      fingerprint TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_run_at TEXT,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL,
      FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE SET NULL
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
  `);

  // Migrate schema
  try { _db.exec('ALTER TABLE profiles ADD COLUMN fingerprint TEXT;'); } catch {}
  try { _db.exec("ALTER TABLE profiles ADD COLUMN extension_ids TEXT DEFAULT '[]';"); } catch {}
  try { _db.exec("ALTER TABLE groups ADD COLUMN notes TEXT DEFAULT '';"); } catch {}
  try { _db.exec('ALTER TABLE proxies ADD COLUMN ping INTEGER DEFAULT 0;'); } catch {}
  try { _db.exec("ALTER TABLE proxies ADD COLUMN city TEXT DEFAULT '';"); } catch {}
  try { _db.exec("ALTER TABLE proxies ADD COLUMN isp TEXT DEFAULT '';"); } catch {}
}

// ---------------- Profiles API ---------------- //

function listProfiles() {
  const db = getDb();
  return db.prepare(`
    SELECT p.*, g.name AS group_name, g.color AS group_color,
           pr.type AS proxy_type, pr.host AS proxy_host, pr.port AS proxy_port,
           pr.username AS proxy_user, pr.password AS proxy_pass
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
           pr.username AS proxy_user, pr.password AS proxy_pass
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
  const kernelPath = data.kernel_path || getDefaultKernelPath();

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
      custom_flags, start_url, notes, fingerprint, extension_ids, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?
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
    data.start_url || 'https://iphey.com',
    data.notes || '',
    fpJson,
    extensionIds,
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
      custom_flags = ?, start_url = ?, notes = ?, fingerprint = ?, extension_ids = ?, updated_at = ?
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

  stmt.run(
    data.name ?? current.name,
    data.group_id !== undefined ? data.group_id : current.group_id,
    data.kernel_path ?? current.kernel_path,
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

// ---------------- Groups & Proxies ---------------- //

function listGroups() {
  const db = getDb();
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

function createGroup(name, color = '#1890ff', notes = '') {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO groups (id, name, color, notes, created_at) VALUES (?, ?, ?, ?, ?)').run(id, name, color, notes, now);
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

function listProxies() {
  const db = getDb();
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
    INSERT INTO proxies (id, name, type, host, port, username, password, status, ping, ip, country, city, isp, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.name || `${data.host}:${data.port}`,
    data.type || 'http',
    data.host,
    Number(data.port),
    data.username || '',
    data.password || '',
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
      name = ?, type = ?, host = ?, port = ?, username = ?, password = ?,
      status = ?, ping = ?, ip = ?, country = ?, city = ?, isp = ?
    WHERE id = ?
  `).run(
    data.name ?? cur.name,
    data.type ?? cur.type,
    data.host ?? cur.host,
    data.port !== undefined ? Number(data.port) : cur.port,
    data.username !== undefined ? data.username : cur.username,
    data.password !== undefined ? data.password : cur.password,
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

module.exports = {
  getDb,
  listProfiles,
  getProfile,
  createProfile,
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
};
