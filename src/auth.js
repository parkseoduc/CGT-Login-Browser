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

  return {
    id: user.id,
    email: user.email,
    maskedEmail,
    name: user.name || user.email.split('@')[0],
    role: user.role || 'user',
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
async function activateKeyForUser(userId, licenseKey) {
  if (!userId) throw new Error('Cần đăng nhập để kích hoạt bản quyền cho tài khoản');
  if (!licenseKey || !licenseKey.trim()) throw new Error('Vui lòng nhập License Key hợp lệ');

  const cleanKey = licenseKey.trim().toUpperCase();
  const user = db.getUserById(userId);
  if (!user) throw new Error('Tài khoản không tồn tại');

  let plan = 'Pro Plus';
  let planCode = 'PRO_PLUS';
  let maxProfiles = 1000;
  let expiresAt = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(); // 1 năm

  // Nhận diện loại key
  if (cleanKey.includes('VIP') || cleanKey.includes('LIFE') || cleanKey.startsWith('OMNI-JV6FN')) {
    plan = 'VIP Lifetime';
    planCode = 'VIP_LIFETIME';
    maxProfiles = 5000;
    expiresAt = null; // Vĩnh viễn
  } else if (cleanKey.includes('ENT')) {
    plan = 'Enterprise';
    planCode = 'ENTERPRISE';
    maxProfiles = 10000;
    expiresAt = null;
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

module.exports = {
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
