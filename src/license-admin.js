const crypto = require('crypto');

const DEFAULT_ADMIN = {
  email: 'cgt-license@cgtdev.space',
  password: 'TumyAdmin@2026!',
  totpSecret: 'YZCWIL37U7ZO2MTKG5YJWYEHDNIWZART',
  serverUrl: 'https://lic.cgtdev.space',
};

let _cachedAdminSession = null;

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function totp(secret, step, digits = 6) {
  let bits = 0, value = 0; const bytes = [];
  for (const c of secret) {
    value = (value << 5) | alphabet.indexOf(c); bits += 5;
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(step));
  const h = crypto.createHmac('sha1', Buffer.from(bytes)).update(counter).digest();
  const n = h.readUInt32BE(h[19] & 15) & 0x7fffffff;
  return String(n % 10 ** digits).padStart(digits, '0');
}

async function getAdminSession(forceRefresh = false) {
  if (!forceRefresh && _cachedAdminSession && Date.now() < _cachedAdminSession.expiresAt) {
    try {
      const checkRes = await fetch(`${DEFAULT_ADMIN.serverUrl}/api/admin/catalog`, {
        headers: { 'Cookie': _cachedAdminSession.cookie }
      });
      if (checkRes.ok) {
        const cat = await checkRes.json();
        _cachedAdminSession.csrf = cat.csrfToken;
        _cachedAdminSession.catalog = cat;
        return _cachedAdminSession;
      }
    } catch {}
  }

  const loginRes = await fetch(`${DEFAULT_ADMIN.serverUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: DEFAULT_ADMIN.email, password: DEFAULT_ADMIN.password })
  });
  if (!loginRes.ok) throw new Error(`Đăng nhập License Server thất bại (HTTP ${loginRes.status}). Vui lòng chờ 1 phút.`);

  let cookie = loginRes.headers.get('set-cookie') ? loginRes.headers.get('set-cookie').split(';')[0] : '';
  const sRes = await fetch(`${DEFAULT_ADMIN.serverUrl}/api/auth/session`, { headers: { 'Cookie': cookie } });
  const sData = await sRes.json();

  if (!sData.verified) {
    const code = totp(DEFAULT_ADMIN.totpSecret, Math.floor(Date.now() / 30000));
    const vRes = await fetch(`${DEFAULT_ADMIN.serverUrl}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie, 'x-cgt-csrf': sData.csrfToken },
      body: JSON.stringify({ code })
    });
    if (!vRes.ok) throw new Error(`Xác thực 2FA thất bại (HTTP ${vRes.status})`);
    const vCookie = vRes.headers.get('set-cookie');
    if (vCookie) cookie = vCookie.split(';')[0];
  }

  const catRes = await fetch(`${DEFAULT_ADMIN.serverUrl}/api/admin/catalog`, { headers: { 'Cookie': cookie } });
  const cat = await catRes.json();

  _cachedAdminSession = {
    cookie,
    csrf: cat.csrfToken,
    user: sData.user,
    catalog: cat,
    expiresAt: Date.now() + 4 * 3600 * 1000 // 4 hours
  };

  return _cachedAdminSession;
}

async function issueKey({ planCode = 'VIP_LIFETIME', durationDays = 3650, notes = '' } = {}) {
  const session = await getAdminSession();
  const product = session.catalog.products?.find(p => p.code === 'ANTIDETECT');
  if (!product) throw new Error('Product ANTIDETECT not found on license server');

  const plan = session.catalog.plans?.find(p => p.product_id === product.id && p.code === planCode) || session.catalog.plans?.[0];
  if (!plan) throw new Error(`Plan ${planCode} not found`);

  const licAdminRes = await fetch(`${DEFAULT_ADMIN.serverUrl}/api/admin/licensing`, { headers: { 'Cookie': session.cookie } });
  const licAdmin = await licAdminRes.json();
  const customer = licAdmin.customers?.[0];

  const issueRes = await fetch(`${DEFAULT_ADMIN.serverUrl}/api/admin/licenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': session.cookie, 'x-cgt-csrf': session.csrf },
    body: JSON.stringify({
      request_id: crypto.randomUUID(),
      product_id: product.id,
      plan_id: plan.id,
      customer_id: customer?.id || null,
      kind: 'days',
      duration_days: durationDays,
      notes: notes || `Created by OmniBrowser Admin (${plan.name})`
    })
  });

  const issueData = await issueRes.json();
  if (!issueRes.ok || issueData.code) {
    throw new Error(issueData.message || 'Issue key failed');
  }

  const issued = issueData.issued?.[0];
  return {
    key: issued?.license_key,
    planName: plan.name,
    durationDays,
    expiresAt: issued?.expires_at,
    issued
  };
}

async function listAdminLicenses() {
  const session = await getAdminSession();
  const licAdminRes = await fetch(`${DEFAULT_ADMIN.serverUrl}/api/admin/licensing`, { headers: { 'Cookie': session.cookie } });
  const licAdmin = await licAdminRes.json();
  const product = session.catalog.products?.find(p => p.code === 'ANTIDETECT');
  const licenses = (licAdmin.licenses || []).filter(l => l.product_id === product?.id);
  return {
    product,
    total: licenses.length,
    licenses
  };
}

module.exports = {
  DEFAULT_ADMIN,
  getAdminSession,
  issueKey,
  listAdminLicenses
};
