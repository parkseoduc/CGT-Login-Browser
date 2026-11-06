const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_ADMIN = {
  email: 'cgt-license@cgtdev.space',
  password: 'TumyAdmin@2026!',
  totpSecret: 'YZCWIL37U7ZO2MTKG5YJWYEHDNIWZART',
  serverUrl: 'https://lic.cgtdev.space',
};

const SESSION_FILE = path.join(__dirname, '..', 'data', '.license_session.json');

let _cachedAdminSession = null;

function loadSessionFromDisk() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
      if (data && data.cookie && Date.now() < data.expiresAt) {
        return data;
      }
    }
  } catch {}
  return null;
}

function saveSessionToDisk(sess) {
  try {
    const dir = path.dirname(SESSION_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sess, null, 2), 'utf8');
  } catch {}
}

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
  if (!forceRefresh) {
    if (!_cachedAdminSession) {
      _cachedAdminSession = loadSessionFromDisk();
    }
    if (_cachedAdminSession && Date.now() < _cachedAdminSession.expiresAt) {
      try {
        const checkRes = await fetch(`${DEFAULT_ADMIN.serverUrl}/api/admin/catalog`, {
          headers: { 'Cookie': _cachedAdminSession.cookie }
        });
        if (checkRes.ok) {
          const cat = await checkRes.json();
          _cachedAdminSession.csrf = cat.csrfToken;
          _cachedAdminSession.catalog = cat;
          saveSessionToDisk(_cachedAdminSession);
          return _cachedAdminSession;
        }
      } catch {}
    }
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
  saveSessionToDisk(_cachedAdminSession);

  return _cachedAdminSession;
}

/**
 * Tìm hoặc tạo Customer trên lic.cgtdev.space
 */
async function findOrCreateCustomer({ name, email, phone = '', notes = '' } = {}) {
  const session = await getAdminSession();
  const licAdminRes = await fetch(`${DEFAULT_ADMIN.serverUrl}/api/admin/licensing`, { headers: { 'Cookie': session.cookie } });
  if (licAdminRes.ok) {
    const licAdmin = await licAdminRes.json();
    const existing = (licAdmin.customers || []).find(c => c.email && c.email.toLowerCase() === (email || '').toLowerCase());
    if (existing) {
      return existing;
    }
  }

  // Tạo customer mới trên lic.cgtdev.space
  const createRes = await fetch(`${DEFAULT_ADMIN.serverUrl}/api/admin/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': session.cookie, 'x-cgt-csrf': session.csrf },
    body: JSON.stringify({
      name: name || email.split('@')[0],
      email: email,
      phone: phone || '',
      notes: notes || 'Tự động tạo từ OmniBrowser'
    })
  });
  if (createRes.ok) {
    const createData = await createRes.json();
    return createData.data || createData;
  }
  return null;
}

/**
 * Cấp License Key mới liên kết khách hàng
 */
async function issueKey({ planCode = 'VIP_LIFETIME', durationDays = 3650, notes = '', customer = null } = {}) {
  const session = await getAdminSession();
  const product = session.catalog.products?.find(p => p.code === 'ANTIDETECT');
  if (!product) throw new Error('Product ANTIDETECT not found on license server');

  const antidetectPlans = (session.catalog.plans || []).filter(p => p.product_id === product.id);
  const plan = antidetectPlans.find(p => 
    p.code === planCode || 
    (planCode === 'VIP_LIFETIME' && (p.code === 'PRO' || p.code === 'VIP_LIFETIME' || (p.duration_days && p.duration_days >= 365))) ||
    (planCode === 'PRO' && (p.code === 'PRO' || (p.duration_days && p.duration_days >= 365))) ||
    ((planCode === 'PRO_MONTHLY' || planCode === 'PLUS') && (p.code === 'PRO_MONTHLY' || (p.duration_days && p.duration_days <= 31)))
  ) || antidetectPlans[0];

  if (!plan) throw new Error(`Plan ${planCode} not found for ANTIDETECT`);

  let customerId = customer?.id || null;
  if (!customerId && customer?.email) {
    const remoteCust = await findOrCreateCustomer(customer);
    if (remoteCust) customerId = remoteCust.id;
  }

  if (!customerId) {
    try {
      const licAdminRes = await fetch(`${DEFAULT_ADMIN.serverUrl}/api/admin/licensing`, { headers: { 'Cookie': session.cookie } });
      if (licAdminRes.ok) {
        const licAdmin = await licAdminRes.json();
        customerId = licAdmin.customers?.[0]?.id || null;
      }
    } catch {}
  }

  const effectiveDuration = durationDays || plan.duration_days || 30;

  const issueRes = await fetch(`${DEFAULT_ADMIN.serverUrl}/api/admin/licenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': session.cookie, 'x-cgt-csrf': session.csrf },
    body: JSON.stringify({
      request_id: crypto.randomUUID(),
      product_id: product.id,
      plan_id: plan.id,
      customer_id: customerId,
      kind: 'days',
      duration_days: effectiveDuration,
      notes: notes || `Created by OmniBrowser (${plan.name})`
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
    planCode: plan.code,
    durationDays: effectiveDuration,
    expiresAt: issued?.expires_at,
    issued,
    customerId
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
    licenses,
    customers: licAdmin.customers || []
  };
}


const PACKAGES_CACHE_FILE = path.join(__dirname, '..', 'data', '.packages_cache.json');

/**
 * Tự động đồng bộ các gói sản phẩm của OmniBrowser từ lic.cgtdev.space
 */
async function getCatalogPackages({ forceRefresh = false } = {}) {
  if (!forceRefresh && fs.existsSync(PACKAGES_CACHE_FILE)) {
    try {
      const cached = JSON.parse(fs.readFileSync(PACKAGES_CACHE_FILE, 'utf8'));
      if (cached && Array.isArray(cached.packages) && cached.packages.length > 0 && (Date.now() - (cached.timestamp || 0) < 60 * 1000)) {
        return cached.packages;
      }
    } catch {}
  }

  // 1. Lấy trực tiếp từ Public Store API của lic.cgtdev.space (Không cần session admin, không bị 429)
  try {
    const res = await fetch(`${DEFAULT_ADMIN.serverUrl}/api/store/products`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });
    if (res.ok) {
      const data = await res.json();
      const product = (data.products || []).find(p => p.code === 'ANTIDETECT');
      if (product && Array.isArray(product.plans) && product.plans.length > 0) {
        const mapped = product.plans.map(p => {
          const featObj = {};
          (p.features || []).forEach(f => {
            if (f.code) featObj[f.code] = f.value;
          });

          const isLifetime = Boolean(p.duration_days && p.duration_days >= 365);
          const durationDays = Number(p.duration_days) || 30;
          let durationStr;
          if (durationDays >= 3650) {
            durationStr = 'trọn đời (10 năm)';
          } else if (durationDays >= 365) {
            durationStr = `${Math.round(durationDays / 365)} năm`;
          } else {
            durationStr = `${durationDays} ngày`;
          }

          const isPro = (p.code && p.code.includes('PRO')) || (p.name && p.name.toLowerCase().includes('pro'));
          const maxProfiles = Number(featObj.MAX_PROFILES) || (isPro ? 2000 : 500);
          const maxThreads = Number(featObj.MAX_CONCURRENCY) || (isPro ? 50 : 20);
          const teamMembers = Number(featObj.TEAM) || (isPro ? 50 : 5);
          const tag = isLifetime ? 'VIP Trọn Đời' : (isPro ? 'Gói Pro' : 'Phổ Biến');

          return {
            id: p.id,
            code: p.code,
            name: p.name,
            tag: tag,
            badge: `${maxProfiles.toLocaleString('vi-VN')} Hồ Sơ`,
            description: p.description || `${p.name} (${durationStr})`,
            duration_days: durationDays,
            price: Number(p.price_vnd) || 0,
            original_price: Number(p.original_price_vnd) || ((Number(p.price_vnd) || 0) * 2),
            price_formatted: `${(Number(p.price_vnd) || 0).toLocaleString('vi-VN')} đ / ${durationStr}`,
            max_profiles: maxProfiles,
            max_threads: maxThreads,
            team_members: teamMembers,
            sync_actions: featObj.SYNC_ACTIONS ?? true,
            chromium_153: featObj.CHROMIUM_153 ?? true,
            features: [
              `${maxProfiles.toLocaleString('vi-VN')} Hồ sơ Antidetect cao cấp độc lập`,
              `Chạy đồng thời tối đa ${maxThreads} luồng độc lập`,
              `Tối đa ${teamMembers} thành viên Đội Ngũ (Workspace Team)`,
              'Đồng bộ hóa thao tác chuột & bàn phím',
              'Tự động tích hợp Proxy xoay 4G / IPv6',
              'Nhân Chromium 153 Core (Pass 100% Iphey & Pixelscan)',
              isPro ? 'Ưu tiên hỗ trợ kỹ thuật 24/7 trực tiếp từ CGT Dev' : 'Hỗ trợ kỹ thuật qua Telegram / Zalo'
            ]
          };
        });

        mapped.sort((a, b) => (a.duration_days || 0) - (b.duration_days || 0) || (a.price || 0) - (b.price || 0));

        try {
          const dir = path.dirname(PACKAGES_CACHE_FILE);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(PACKAGES_CACHE_FILE, JSON.stringify({
            timestamp: Date.now(),
            packages: mapped
          }, null, 2), 'utf8');
        } catch {}

        return mapped;
      }
    }
  } catch (err) {
    console.warn('[LicenseAdmin] Lỗi lấy gói từ store/products:', err.message);
  }

  // 2. Dự phòng: Thử lấy qua Admin Session
  try {
    const session = await getAdminSession(forceRefresh);
    const product = session.catalog?.products?.find(p => p.code === 'ANTIDETECT');
    if (product) {
      const featuresMap = new Map((session.catalog.features || []).map(f => [f.id, f]));
      const plans = (session.catalog.plans || []).filter(p => p.product_id === product.id && p.status === 'active');

      const mapped = plans.map(p => {
        const featObj = {};
        (p.features || []).forEach(f => {
          const def = featuresMap.get(f.feature_id);
          if (def) featObj[def.code] = f.value;
        });

        const isLifetime = Boolean(p.duration_days && p.duration_days >= 365);
        const durationDays = Number(p.duration_days) || 30;
        let durationStr;
        if (durationDays >= 3650) {
          durationStr = 'trọn đời (10 năm)';
        } else if (durationDays >= 365) {
          durationStr = `${Math.round(durationDays / 365)} năm`;
        } else {
          durationStr = `${durationDays} ngày`;
        }

        const isPro = (p.code && p.code.includes('PRO')) || (p.name && p.name.includes('Pro') && !p.name.includes('Plus'));
        const maxProfiles = Number(featObj.MAX_PROFILES) || (isPro ? 2000 : 500);
        const maxThreads = Number(featObj.MAX_CONCURRENCY) || (isPro ? 50 : 20);
        const teamMembers = Number(featObj.TEAM) || (isPro ? 50 : 5);
        const tag = isLifetime ? 'VIP Trọn Đời' : (isPro ? 'Gói Pro' : 'Phổ Biến');

        return {
          id: p.id,
          code: p.code,
          name: p.name,
          tag: tag,
          badge: `${maxProfiles.toLocaleString('vi-VN')} Hồ Sơ`,
          description: p.description || `${p.name} ${durationStr}`,
          duration_days: durationDays,
          price: Number(p.price_vnd) || 0,
          original_price: Number(p.original_price_vnd) || ((Number(p.price_vnd) || 0) * 2),
          price_formatted: `${(Number(p.price_vnd) || 0).toLocaleString('vi-VN')} đ / ${durationStr}`,
          max_profiles: maxProfiles,
          max_threads: maxThreads,
          team_members: teamMembers,
          sync_actions: featObj.SYNC_ACTIONS ?? true,
          chromium_153: featObj.CHROMIUM_153 ?? true,
          features: [
            `${maxProfiles.toLocaleString('vi-VN')} Hồ sơ Antidetect cao cấp độc lập`,
            `Chạy đồng thời tối đa ${maxThreads} luồng độc lập`,
            `Tối đa ${teamMembers} thành viên Đội Ngũ (Workspace Team)`,
            'Đồng bộ hóa thao tác chuột & bàn phím',
            'Tự động tích hợp Proxy xoay 4G / IPv6',
            'Nhân Chromium 153 Core (Pass 100% Iphey & Pixelscan)',
            isPro ? 'Ưu tiên hỗ trợ kỹ thuật 24/7 trực tiếp từ CGT Dev' : 'Hỗ trợ kỹ thuật qua Telegram / Zalo'
          ]
        };
      });

      mapped.sort((a, b) => (a.duration_days || 0) - (b.duration_days || 0) || (a.price || 0) - (b.price || 0));
      return mapped;
    }
  } catch (err) {
    console.warn('[LicenseAdmin] Lỗi lấy gói từ catalog admin:', err.message);
  }

  // 3. Fallback cache file
  if (fs.existsSync(PACKAGES_CACHE_FILE)) {
    try {
      const cached = JSON.parse(fs.readFileSync(PACKAGES_CACHE_FILE, 'utf8'));
      if (cached && Array.isArray(cached.packages) && cached.packages.length > 0) {
        return cached.packages;
      }
    } catch {}
  }

  // Gói dự phòng mặc định khớp với license server
  return [
    {
      id: '51f31667-7c8c-46d7-82e8-95f2bf3fc64c',
      code: 'PRO_MONTHLY',
      name: 'OmniBrowser Plus',
      tag: 'Phổ Biến',
      badge: '500 Hồ Sơ',
      description: 'Gói Plus 30 ngày cho cá nhân và đội ngũ (Tối đa 500 hồ sơ)',
      duration_days: 30,
      price: 3000,
      original_price: 399000,
      price_formatted: '3.000 đ / 30 ngày',
      max_profiles: 500,
      max_threads: 20,
      team_members: 5,
      sync_actions: true,
      chromium_153: true,
      features: [
        '500 Hồ sơ Antidetect cao cấp độc lập',
        'Chạy đồng thời tối đa 20 luồng độc lập',
        'Tối đa 5 thành viên Đội Ngũ (Workspace Team)',
        'Đồng bộ hóa thao tác chuột & bàn phím',
        'Tự động tích hợp Proxy xoay 4G / IPv6',
        'Nhân Chromium 153 Core (Pass 100% Iphey & Pixelscan)',
        'Hỗ trợ kỹ thuật qua Telegram / Zalo'
      ]
    },
    {
      id: '1f23582e-e1eb-4db5-b40e-7781b61021af',
      code: 'PRO',
      name: 'OmniBrowser Pro',
      tag: 'Gói Pro',
      badge: '2.000 Hồ Sơ',
      description: 'Gói Pro 30 ngày (Tối đa 2000 hồ sơ)',
      duration_days: 30,
      price: 3000,
      original_price: 4990000,
      price_formatted: '3.000 đ / 30 ngày',
      max_profiles: 2000,
      max_threads: 50,
      team_members: 50,
      sync_actions: true,
      chromium_153: true,
      features: [
        '2.000 Hồ sơ Antidetect cao cấp độc lập',
        'Chạy đồng thời tối đa 50 luồng độc lập',
        'Tối đa 50 thành viên Đội Ngũ (Workspace Team)',
        'Đồng bộ hóa thao tác chuột & bàn phím',
        'Tự động tích hợp Proxy xoay 4G / IPv6',
        'Nhân Chromium 153 Core (Pass 100% Iphey & Pixelscan)',
        'Ưu tiên hỗ trợ kỹ thuật 24/7 trực tiếp từ CGT Dev'
      ]
    }
  ];
}

async function getCatalogSettings({ forceRefresh = false } = {}) {
  // 1. Public store API
  try {
    const res = await fetch(`${DEFAULT_ADMIN.serverUrl}/api/store/products`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.payment) {
        return {
          bank_bin: data.payment.bank_bin,
          bank_account: data.payment.bank_account,
          bank_account_name: data.payment.bank_account_name,
          sales_zalo: data.payment.zalo,
          support_email: 'phamduccgt18@gmail.com'
        };
      }
    }
  } catch (err) {
    console.warn('[LicenseAdmin] Lỗi lấy settings từ store API:', err.message);
  }

  // 2. Admin session
  try {
    const session = await getAdminSession(forceRefresh);
    if (session.catalog && session.catalog.settings) {
      return session.catalog.settings;
    }
  } catch (err) {
    console.warn('[LicenseAdmin] Lỗi lấy settings:', err.message);
  }
  return null;
}

async function createRemoteOrder({ planId, name, email, phone }) {
  try {
    let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanPhone || cleanPhone.length < 9 || cleanPhone.length > 12) {
      if (cleanEmail === 'pduc42620@gmail.com') {
        cleanPhone = '0394085700';
      } else {
        try {
          const db = require('./db');
          const u = db.getUserByEmail(cleanEmail);
          if (u && u.phone) cleanPhone = u.phone.replace(/[^0-9]/g, '');
        } catch (_) {}
      }
    }

    if (!cleanPhone || cleanPhone.length < 9 || cleanPhone.length > 12) {
      cleanPhone = '0988888888';
    }

    const res = await fetch(`${DEFAULT_ADMIN.serverUrl}/api/store/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_id: planId,
        name: (name || cleanEmail.split('@')[0]).trim(),
        email: cleanEmail,
        phone: cleanPhone
      })
    });
    const data = await res.json();
    if (!res.ok || !data.order) {
      throw new Error(data.message || `Tạo đơn hàng từ xa thất bại (${res.status})`);
    }

    const order = data.order;
    let remoteId = null;

    // Lấy UUID nội bộ từ admin danh sách đơn hàng
    try {
      const session = await getAdminSession();
      const adminRes = await fetch(`${DEFAULT_ADMIN.serverUrl}/api/admin/orders`, {
        headers: { 'Cookie': session.cookie }
      });
      if (adminRes.ok) {
        const adminData = await adminRes.json();
        const found = (adminData.orders || []).find(o => o.order_code === order.order_code);
        if (found) {
          remoteId = found.id;
        }
      }
    } catch {}

    return {
      orderCode: order.order_code,
      remoteOrderId: remoteId,
      status: order.status || 'pending',
      amountVnd: order.amount_vnd,
      paymentContent: order.payment_content,
      token: data.token
    };
  } catch (err) {
    console.warn('[LicenseAdmin] Lỗi tạo đơn hàng Store từ xa:', err.message);
    return null;
  }
}

/**
 * Duyệt đơn hàng trên lic.cgtdev.space và tự động lấy mã License Key được hệ thống cấp
 */
async function approveRemoteOrder({ remoteOrderId, orderCode, reason }) {
  const session = await getAdminSession();
  let targetId = remoteOrderId;

  if (!targetId && orderCode) {
    try {
      const adminRes = await fetch(`${DEFAULT_ADMIN.serverUrl}/api/admin/orders`, {
        headers: { 'Cookie': session.cookie }
      });
      if (adminRes.ok) {
        const adminData = await adminRes.json();
        const found = (adminData.orders || []).find(o => o.order_code === orderCode);
        if (found) {
          targetId = found.id;
        }
      }
    } catch {}
  }

  if (!targetId) {
    throw new Error(`Không tìm thấy ID đơn hàng trên License Server (Code: ${orderCode || 'N/A'})`);
  }

  const approveRes = await fetch(`${DEFAULT_ADMIN.serverUrl}/api/admin/orders/${targetId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': session.cookie,
      'x-cgt-csrf': session.csrf
    },
    body: JSON.stringify({
      reason: reason || 'Tự động duyệt thanh toán từ OmniBrowser'
    })
  });

  const approveData = await approveRes.json();
  if (!approveRes.ok || approveData.code) {
    throw new Error(approveData.message || `Duyệt đơn hàng thất bại (${approveRes.status})`);
  }

  // Lấy chi tiết đơn hàng sau khi duyệt để lấy mã License Key chuẩn
  let issuedKey = null;
  try {
    const checkRes = await fetch(`${DEFAULT_ADMIN.serverUrl}/api/admin/orders`, {
      headers: { 'Cookie': session.cookie }
    });
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      const updated = (checkData.orders || []).find(o => o.id === targetId || o.order_code === orderCode);
      if (updated && updated.license_key) {
        issuedKey = updated.license_key;
      }
    }
  } catch {}

  return {
    success: true,
    remoteOrderId: targetId,
    orderCode: orderCode || approveData.data?.order_code,
    licenseKey: issuedKey,
    licenseId: approveData.data?.license_id,
    data: approveData.data
  };
}

/**
 * Lấy danh sách toàn bộ đơn hàng từ License Server
 */
async function listAdminOrders() {
  const session = await getAdminSession();
  const res = await fetch(`${DEFAULT_ADMIN.serverUrl}/api/admin/orders`, {
    headers: { 'Cookie': session.cookie }
  });
  if (!res.ok) throw new Error(`Không thể lấy danh sách đơn hàng (${res.status})`);
  const data = await res.json();
  return data.orders || [];
}

/**
 * Từ chối / Hủy đơn hàng trên License Server khi quá thời hạn thanh toán (5 phút)
 */
async function rejectRemoteOrder({ remoteOrderId, orderCode, reason }) {
  try {
    const session = await getAdminSession();
    let targetId = remoteOrderId;

    if (!targetId && orderCode) {
      try {
        const adminRes = await fetch(`${DEFAULT_ADMIN.serverUrl}/api/admin/orders`, {
          headers: { 'Cookie': session.cookie }
        });
        if (adminRes.ok) {
          const adminData = await adminRes.json();
          const found = (adminData.orders || []).find(o => o.order_code === orderCode);
          if (found) targetId = found.id;
        }
      } catch {}
    }

    if (!targetId) return false;

    const res = await fetch(`${DEFAULT_ADMIN.serverUrl}/api/admin/orders/${targetId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': session.cookie,
        'x-cgt-csrf': session.csrf
      },
      body: JSON.stringify({
        reason: reason || 'Hết hạn thanh toán (quá 5 phút)'
      })
    });
    return res.ok;
  } catch (err) {
    console.warn('[LicenseAdmin] Lỗi từ chối đơn hàng từ xa:', err.message);
    return false;
  }
}

module.exports = {
  DEFAULT_ADMIN,
  getAdminSession,
  findOrCreateCustomer,
  issueKey,
  listAdminLicenses,
  getCatalogPackages,
  getCatalogSettings,
  createRemoteOrder,
  approveRemoteOrder,
  rejectRemoteOrder,
  listAdminOrders
};
