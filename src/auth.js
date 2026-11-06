const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const db = require('./db');

function hashPassword(password) {
  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const computedHash = crypto.scryptSync(String(password || ''), salt, 64).toString('hex');
  const a = Buffer.from(computedHash, 'hex');
  const b = Buffer.from(originalHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function publicUser(user) {
  if (!user) return null;
  
  // Tính số ngày còn lại
  let daysRemaining = null;
  let isExpired = false;
  if (user.expires_at) {
    const diffMs = new Date(user.expires_at).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    if (diffMs <= 0) isExpired = true;
  }

  // Mask email for privacy like PolyLogin: pdu***@gmail.com
  let maskedEmail = user.email;
  const parts = user.email.split('@');
  if (parts.length === 2) {
    const namePart = parts[0];
    const prefix = namePart.slice(0, 3);
    maskedEmail = `${prefix}***@${parts[1]}`;
  }

  let assignedGroups = [];
  let permissions = {};
  let memberRole = user.role || 'user';
  let memberId = user.member_id || null;
  let ownerId = user.owner_id || null;

  try {
    const tm = memberId ? db.getTeamMemberById(memberId) : db.getTeamMemberByEmail(user.email);
    if (tm) {
      memberId = tm.id;
      ownerId = tm.owner_id;
      memberRole = tm.role;
      assignedGroups = tm.assigned_groups || [];
      permissions = tm.permissions || {};
    }
  } catch {}

  // Workspace Owner has role 'admin'
  if (!memberId && (memberRole === 'user' || memberRole === 'admin')) {
    memberRole = 'admin';
  }

  const isStaff = memberRole === 'staff';
  const safeLaunchMode = isStaff || Boolean(permissions && permissions.safe_launch_only);

  return {
    id: user.id,
    email: user.email,
    maskedEmail,
    name: user.name || user.email.split('@')[0],
    role: memberRole,
    member_id: memberId,
    owner_id: ownerId,
    assigned_groups: assignedGroups,
    permissions: permissions,
    safe_launch_mode: safeLaunchMode,
    plan: user.plan || 'Free Trial',
    plan_code: user.plan_code || 'FREE_TRIAL',
    license_key: user.license_key || '',
    max_profiles: user.max_profiles || 50,
    expires_at: user.expires_at,
    days_remaining: daysRemaining,
    is_lifetime: !user.expires_at && user.plan_code !== 'FREE_TRIAL',
    is_expired: isExpired,
    status: user.status || 'ACTIVE',
    created_at: user.created_at,
    phone: user.phone || "",
    avatar_url: user.avatar_url || "",
    auth_provider: user.auth_provider || "local",
  };
}

async function register({ email, password, name }) {
  if (!email || !email.includes('@')) {
    throw new Error('Email không hợp lệ');
  }
  const cleanEmail = email.trim().toLowerCase();
  
  const existing = db.getUserByEmail(cleanEmail);
  if (existing) {
    throw new Error('Email này đã được đăng ký trong hệ thống');
  }

  const WEAK_PASSWORDS = new Set([
    '123456', '12345678', '123456789', '1234567890',
    'password', 'password123', 'pass1234', 'qwerty', '111111', '000000',
    '123123', 'admin123', 'admin1234', '654321', '666666', '888888',
    'abcdef', 'iloveyou', 'secret', 'admin'
  ]);
  if (WEAK_PASSWORDS.has(password.trim().toLowerCase()) || /^(.)\1+$/.test(password)) {
    throw new Error('Mật khẩu quá đơn giản và dễ bị lộ. Vui lòng đặt mật khẩu an toàn hơn (kết hợp cả chữ và số).');
  }

  const userId = crypto.randomUUID();
  const passwordHash = hashPassword(password);
  const now = new Date().toISOString();

  const user = {
    id: userId,
    email: cleanEmail,
    password_hash: passwordHash,
    name: (name || '').trim() || cleanEmail.split('@')[0],
    role: 'user',
    plan: 'Free Trial',
    plan_code: 'FREE_TRIAL',
    license_key: '',
    max_profiles: 50,
    expires_at: null,
    status: 'ACTIVE',
    created_at: now,
    updated_at: now
  };

  db.createUser(user);

  // Tạo token phiên đăng nhập (30 ngày)
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  db.createSession(token, userId, expiresAt);

  return {
    user: publicUser(user),
    token
  };
}

async function login({ email, password }) {
  if (!email || !password) {
    throw new Error('Vui lòng nhập đầy đủ Email và Mật khẩu');
  }
  const cleanEmail = email.trim().toLowerCase();
  const user = db.getUserByEmail(cleanEmail);

  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new Error('Email hoặc mật khẩu không chính xác');
  }

  if (user.status === 'BANNED') {
    throw new Error('Tài khoản của bạn đã bị khóa bởi Quản trị viên. Vui lòng liên hệ hỗ trợ.');
  }

  // Tạo phiên đăng nhập 30 ngày
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  db.createSession(token, user.id, expiresAt);

  return {
    user: publicUser(user),
    token
  };
}

async function getSessionUser(token) {
  if (!token) return null;
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  const session = db.getSession(cleanToken);
  if (!session) return null;

  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.deleteSession(cleanToken);
    return null;
  }

  const user = db.getUserById(session.user_id);
  if (!user || user.status === 'BANNED') {
    return null;
  }
  return publicUser(user);
}

async function logout(token) {
  if (!token) return true;
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  db.deleteSession(cleanToken);
  return true;
}

async function changePassword(userId, oldPassword, newPassword) {
  const user = db.getUserById(userId);
  if (!user) throw new Error('Không tìm thấy tài khoản');

  if (!verifyPassword(oldPassword, user.password_hash)) {
    throw new Error('Mật khẩu hiện tại không chính xác');
  }

  const newHash = hashPassword(newPassword);
  db.updateUser(userId, {
    password_hash: newHash,
    updated_at: new Date().toISOString()
  });

  return true;
}

// Kích hoạt License Key vào Tài khoản người dùng
async function activateKeyForUser(userId, licenseKey, options = {}) {
  if (!userId) throw new Error('Cần đăng nhập để kích hoạt bản quyền cho tài khoản');
  if (!licenseKey || !licenseKey.trim()) throw new Error('Vui lòng nhập License Key hợp lệ');

  const cleanKey = licenseKey.trim().toUpperCase();
  const user = db.getUserById(userId);
  if (!user) throw new Error('Tài khoản không tồn tại');

  let durationDays = options.durationDays !== undefined && options.durationDays !== null ? Number(options.durationDays) : null;
  let plan = options.plan || 'Pro 30 Ngày';
  let planCode = options.planCode || 'PRO_MONTHLY';
  let maxProfiles = options.maxProfiles || 500;
  let expiresAt = null;

  // Xác định gói VIP Lifetime (Vĩnh viễn)
  const isVipOrLifetime = cleanKey.includes('VIP') || cleanKey.includes('LIFE') || cleanKey.startsWith('OMNI-JV6FN') || planCode === 'VIP_LIFETIME' || (durationDays !== null && durationDays >= 3650);

  if (isVipOrLifetime) {
    plan = options.plan || 'VIP Lifetime';
    planCode = options.planCode || 'VIP_LIFETIME';
    maxProfiles = options.maxProfiles || 2000;
    expiresAt = null; // Vĩnh viễn
  } else if (cleanKey.includes('ENT') || planCode === 'ENTERPRISE') {
    plan = options.plan || 'Enterprise';
    planCode = options.planCode || 'ENTERPRISE';
    maxProfiles = options.maxProfiles || 10000;
    expiresAt = null;
  } else {
    // Gói Pro tính theo số ngày cụ thể (mặc định 30 ngày nếu không chỉ định)
    if (durationDays === null || isNaN(durationDays) || durationDays <= 0) {
      durationDays = 30;
    }
    expiresAt = new Date(Date.now() + durationDays * 24 * 3600 * 1000).toISOString();
    if (!options.plan) {
      plan = durationDays <= 31 ? 'Pro 30 Ngày' : (durationDays <= 366 ? 'Pro 1 Năm' : 'Pro Plus');
    }
    if (!options.planCode) {
      planCode = durationDays <= 31 ? 'PRO_MONTHLY' : 'PRO_PLUS';
    }
  }

  // Thử kết nối xác thực với License Server lic.cgtdev.space nếu khả dụng
  try {
    const licenseAdmin = require('./license-admin');
    const checkRes = await fetch(`${licenseAdmin.DEFAULT_ADMIN.serverUrl}/api/store/license`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key: cleanKey })
    });
    if (checkRes.ok) {
      const serverLic = await checkRes.json();
      if (serverLic && serverLic.plan_name) {
        plan = serverLic.plan_name;
        planCode = serverLic.plan_code || planCode;
        if (serverLic.expires_at) expiresAt = serverLic.expires_at;
      }
    }
  } catch (netErr) {
    console.warn('[Auth] License server lookup offline fallback:', netErr.message);
  }

  if (options.expiresAt !== undefined) {
    expiresAt = options.expiresAt;
  }

  const updates = {
    license_key: cleanKey,
    plan,
    plan_code: planCode,
    max_profiles: maxProfiles,
    expires_at: expiresAt,
    status: 'ACTIVE',
    updated_at: new Date().toISOString()
  };

  db.updateUser(userId, updates);
  const updatedUser = db.getUserById(userId);
  return publicUser(updatedUser);
}

function getUserFromRequest(req) {
  const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
  if (!authHeader) return null;
  return getSessionUser(authHeader);
}

async function createTeamMemberAccount({ ownerId, email, password, fullName, role, assignedGroups, permissions }) {
  if (!email || !email.includes('@')) {
    throw new Error('Email thành viên không hợp lệ');
  }
  const cleanEmail = email.trim().toLowerCase();
  const existingMember = db.getTeamMemberByEmail(cleanEmail);
  if (existingMember) {
    throw new Error('Email này đã tồn tại trong danh sách Đội Ngũ');
  }

  const memberId = crypto.randomUUID();
  const tm = db.createTeamMember({
    id: memberId,
    owner_id: ownerId,
    email: cleanEmail,
    full_name: fullName || cleanEmail.split('@')[0],
    role: role || 'staff',
    assigned_groups: assignedGroups || [],
    permissions: permissions || {},
    status: 'active'
  });

  // Check if user account already exists in users table
  let existingUser = db.getUserByEmail(cleanEmail);
  if (!existingUser) {
    const passwordHash = hashPassword(password || 'OmniTeam@2026!');
    const now = new Date().toISOString();
    const newUser = {
      id: crypto.randomUUID(),
      email: cleanEmail,
      password_hash: passwordHash,
      name: (fullName || cleanEmail.split('@')[0]).trim(),
      role: role || 'staff',
      plan: 'Team Member',
      plan_code: 'TEAM_MEMBER',
      license_key: '',
      max_profiles: 100,
      expires_at: null,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    };
    db.createUser(newUser);
    try {
      db.getDb().prepare('UPDATE users SET member_id = ?, owner_id = ? WHERE id = ?').run(memberId, ownerId, newUser.id);
    } catch {}
  } else {
    try {
      db.getDb().prepare('UPDATE users SET member_id = ?, owner_id = ?, role = ? WHERE id = ?').run(memberId, ownerId, role || 'staff', existingUser.id);
      if (password && password.length >= 6) {
        const passwordHash = hashPassword(password);
        db.getDb().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, existingUser.id);
      }
    } catch {}
  }

  return tm;
}


const GOOGLE_CONFIG_FILE = path.join(__dirname, '..', 'data', '.google_sso_config.json');

function getGoogleConfig() {
  let clientId = process.env.GOOGLE_CLIENT_ID || '';
  let clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  if (fs.existsSync(GOOGLE_CONFIG_FILE)) {
    try {
      const raw = fs.readFileSync(GOOGLE_CONFIG_FILE, 'utf8').replace(/^\uFEFF/, '');
      const cfg = JSON.parse(raw);
      if (cfg && cfg.clientId) clientId = cfg.clientId;
      if (cfg && cfg.clientSecret) clientSecret = cfg.clientSecret;
    } catch (err) {
      console.warn('[Google SSO] Lỗi đọc GOOGLE_CONFIG_FILE:', err.message);
    }
  }
  return {
    clientId: (clientId || '').trim(),
    clientSecret: (clientSecret || '').trim(),
    enabled: Boolean(clientId && clientId.trim().length > 5)
  };
}

function saveGoogleConfig({ clientId, clientSecret }) {
  const dir = path.dirname(GOOGLE_CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(GOOGLE_CONFIG_FILE, JSON.stringify({
    clientId: (clientId || '').trim(),
    clientSecret: (clientSecret || '').trim(),
    updatedAt: new Date().toISOString()
  }, null, 2), 'utf8');
  return getGoogleConfig();
}

/**
 * Xác thực & Đăng nhập Google SSO (OAuth 2.0 / Google Identity Services)
 */
async function googleAuth({ credential, accessToken, googleProfile, email, name, avatar, code, redirectUri }) {
  let userEmail = '';
  let userName = '';
  let userPicture = '';
  let googleId = '';

  // 0. Nếu gửi Authorization Code -> Exchange lấy token từ Google token endpoint
  if (code) {
    try {
      const cfg = getGoogleConfig();
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
          redirect_uri: redirectUri || 'http://127.0.0.1:51888/api/v1/auth/google/callback',
          grant_type: 'authorization_code'
        }).toString()
      });
      const tokenData = await tokenRes.json();
      if (tokenData.access_token) accessToken = tokenData.access_token;
      if (tokenData.id_token) credential = tokenData.id_token;
    } catch (codeErr) {
      console.warn('[GoogleSSO] Exchange authorization code warning:', codeErr.message);
    }
  }

  // 1. Nếu có accessToken nhưng chưa có thông tin user, gọi Google UserInfo API
  if (accessToken && !userEmail) {
    try {
      const uRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (uRes.ok) {
        const u = await uRes.json();
        userEmail = u.email || '';
        userName = u.name || (userEmail ? userEmail.split('@')[0] : '');
        userPicture = u.picture || '';
        googleId = u.sub || '';
      }
    } catch (uErr) {
      console.warn('[GoogleSSO] Userinfo fetch warning:', uErr.message);
    }
  }

  if (credential && !userEmail) {
    // 1. Thử xác thực trực tuyến qua Google tokeninfo API chính thức
    try {
      const tokeninfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
      if (tokeninfoRes.ok) {
        const info = await tokeninfoRes.json();
        if (info.email && (info.email_verified === 'true' || info.email_verified === true)) {
          userEmail = info.email;
          userName = info.name || info.given_name || userEmail.split('@')[0];
          userPicture = info.picture || '';
          googleId = info.sub || '';
        }
      }
    } catch (netErr) {
      console.warn('[GoogleSSO] tokeninfo online check warning:', netErr.message);
    }

    // 2. Nếu tokeninfo chưa lấy được (offline/mạng chậm), giải mã payload JWT
    if (!userEmail) {
      try {
        const parts = credential.split('.');
        if (parts.length === 3) {
          const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
          const payload = JSON.parse(payloadJson);
          userEmail = payload.email;
          userName = payload.name || payload.given_name || userEmail.split('@')[0];
          userPicture = payload.picture || '';
          googleId = payload.sub || '';
        }
      } catch (parseErr) {
        throw new Error('Mã xác thực Google (JWT) không hợp lệ: ' + parseErr.message);
      }
    }
  } else if (googleProfile) {
    userEmail = googleProfile.email;
    userName = googleProfile.name || userEmail.split('@')[0];
    userPicture = googleProfile.picture || googleProfile.avatar || '';
    googleId = googleProfile.id || googleProfile.sub || '';
  } else if (email) {
    userEmail = email;
    userName = name || email.split('@')[0];
    userPicture = avatar || '';
  }

  if (!userEmail || !userEmail.includes('@')) {
    throw new Error('Không thể xác định địa chỉ Gmail hợp lệ từ tài khoản Google.');
  }

  const cleanEmail = userEmail.trim().toLowerCase();
  const now = new Date().toISOString();

  let user = db.getUserByEmail(cleanEmail);

  if (!user) {
    // Tự động khởi tạo tài khoản mới với Google Gmail
    const userId = crypto.randomUUID();
    user = {
      id: userId,
      email: cleanEmail,
      password_hash: crypto.randomBytes(32).toString('hex'), // Mật khẩu ngẫu nhiên an toàn cho tài khoản SSO
      name: userName || cleanEmail.split('@')[0],
      phone: '',
      google_id: googleId,
      avatar_url: userPicture,
      auth_provider: 'google',
      role: 'user',
      plan: 'Free Trial',
      plan_code: 'FREE_TRIAL',
      license_key: '',
      max_profiles: 50,
      expires_at: null,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    };
    db.createUser(user);
    console.log(`[Auth] Tạo mới tài khoản qua Google SSO thành công: ${cleanEmail}`);
  } else {
    // Cập nhật thông tin Google cho tài khoản hiện có
    const updates = { updated_at: now };
    if (!user.google_id && googleId) updates.google_id = googleId;
    if (!user.avatar_url && userPicture) updates.avatar_url = userPicture;
    if (user.auth_provider !== 'google') updates.auth_provider = 'google';
    user = db.updateUser(user.id, updates);
    console.log(`[Auth] Đăng nhập Google SSO thành công: ${cleanEmail}`);
  }

  if (user.status === 'BANNED') {
    throw new Error('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.');
  }

  // Khởi tạo token phiên đăng nhập (30 ngày)
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  db.createSession(token, user.id, expiresAt);

  return {
    user: publicUser(user),
    token
  };
}

module.exports = {
  googleAuth,
  getGoogleConfig,
  saveGoogleConfig,
  isTeamFeatureAllowed,
  getTeamMemberLimit,
  resolveUserRole,
  createTeamMemberAccount,
  hashPassword,
  verifyPassword,
  publicUser,
  register,
  login,
  getSessionUser,
  logout,
  changePassword,
  activateKeyForUser,
  getUserFromRequest
};


function resolveUserRole(user) {
  if (!user) return 'admin';
  if (user.role === 'staff' || user.safe_launch_mode) return 'staff';
  if (user.role === 'leader') return 'leader';
  if (user.role === 'admin') return 'admin';
  if (!user.member_id) return 'admin';
  return 'staff';
}

function isTeamFeatureAllowed(user) {
  if (!user) return false;
  // If the user was invited as a team member, they are part of a Plus/Pro team
  if (user.member_id && user.owner_id) return true;

  const planCode = String(user.plan_code || '').toUpperCase();
  const planName = String(user.plan || '').toUpperCase();

  // Free accounts cannot use team feature
  if (planCode === 'FREE' || planCode === 'FREE_TRIAL' || planName.includes('FREE')) {
    return false;
  }

  // Plus, Pro, VIP, Enterprise, Team accounts CAN use team feature
  if (
    planCode.includes('PLUS') ||
    planCode.includes('PRO') ||
    planCode.includes('VIP') ||
    planCode.includes('ENTERPRISE') ||
    planCode.includes('TEAM') ||
    planName.includes('PLUS') ||
    planName.includes('PRO') ||
    planName.includes('VIP')
  ) {
    return true;
  }

  return false;
}

function getTeamMemberLimit(user) {
  if (!user) return 0;
  const planCode = String(user.plan_code || '').toUpperCase();
  const planName = String(user.plan || '').toUpperCase();

  if (planCode === 'FREE' || planCode === 'FREE_TRIAL' || planName.includes('FREE')) {
    return 0; // Free cannot add members
  }

  if (planCode === 'PLUS' || planName.includes('PLUS')) {
    return 5; // Plus allows up to 5 members
  }

  // Pro, VIP, Enterprise allows up to 50 members
  return 50;
}
