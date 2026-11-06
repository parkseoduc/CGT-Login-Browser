const crypto = require('crypto');
const db = require('./db');
const auth = require('./auth');
const licenseAdmin = require('./license-admin');

const PLANS = {
  PRO_MONTHLY: {
    code: 'PRO_MONTHLY',
    name: 'OmniBrowser Plus',
    tag: 'Phổ Biến',
    badge: '500 Hồ Sơ',
    duration_days: 30,
    price: 3000,
    price_formatted: '3.000 đ / 30 ngày',
    max_profiles: 500,
    max_threads: 20,
    team_members: 5,
    features: [
      'Tối đa 500 Hồ sơ Antidetect cao cấp',
      'Chạy đồng thời tối đa 20 luồng độc lập',
      'Tối đa 5 thành viên Đội Ngũ (Workspace Team)',
      'Đồng bộ hóa thao tác chuột & bàn phím',
      'Tự động tích hợp Proxy xoay 4G / IPv6',
      'Nhân Chromium 153 Core (Pass 100% Iphey & Pixelscan)',
      'Hỗ trợ kỹ thuật qua Telegram / Zalo'
    ]
  },
  VIP_LIFETIME: {
    code: 'PRO',
    name: 'OmniBrowser Pro',
    tag: 'Gói Pro',
    badge: '2.000 Hồ Sơ',
    duration_days: 30,
    price: 3000,
    price_formatted: '3.000 đ / 30 ngày',
    max_profiles: 2000,
    max_threads: 50,
    team_members: 50,
    features: [
      'Tối đa 2.000 Hồ sơ Antidetect cao cấp độc lập',
      'Chạy đồng thời tối đa 50 luồng hiệu suất cao',
      'Tối đa 50 thành viên Đội Ngũ (Workspace Team)',
      'Đồng bộ dữ liệu đám mây Cloud Sync không giới hạn',
      'Toàn quyền truy cập kho Tiện ích Chrome & Proxy Manager',
      'Ưu tiên hỗ trợ kỹ thuật 24/7 từ chuyên viên CGT Dev'
    ]
  }
};

const DEFAULT_BANK_CONFIG = {
  bankId: 'MBBANK',
  bankName: 'Ngân hàng Quân Đội (MB Bank)',
  bin: '970422',
  accountNumber: '45184318052006',
  accountName: 'PHAM CHI DUC',
  notePrefix: 'OMNI',
  supportEmail: 'phamduccgt18@gmail.com',
  salesZalo: '0394085700'
};

let _cachedBankConfig = null;

async function getPlans(forceRefresh = false) {
  try {
    const pkgs = await licenseAdmin.getCatalogPackages({ forceRefresh });
    if (Array.isArray(pkgs) && pkgs.length > 0) {
      return pkgs;
    }
  } catch (err) {
    console.warn('[Checkout] Lỗi khi lấy danh sách gói từ máy chủ:', err.message);
  }
  return Object.values(PLANS);
}

async function findPlan(planCode, forceRefresh = false) {
  const plans = await getPlans(forceRefresh);
  const normalized = String(planCode || '').toUpperCase().trim();
  const found = plans.find(p => {
    if (p.code === planCode || p.id === planCode) return true;
    const pCode = String(p.code || '').toUpperCase();
    const pName = String(p.name || '').toUpperCase();
    if (pCode === normalized) return true;
    if (normalized === 'PRO' || normalized === 'VIP' || normalized === 'VIP_LIFETIME') {
      return pCode === 'PRO' || (pName.includes('PRO') && !pName.includes('PLUS'));
    }
    if (normalized === 'PRO_MONTHLY' || normalized === 'PLUS' || normalized === 'PULS') {
      return pCode === 'PRO_MONTHLY' || pCode === 'PULS' || pName.includes('PLUS');
    }
    return false;
  });
  return found || plans[0] || PLANS.PRO_MONTHLY;
}

async function getBankConfig(forceRefresh = false) {
  if (!forceRefresh && _cachedBankConfig) {
    return _cachedBankConfig;
  }
  try {
    const settings = await licenseAdmin.getCatalogSettings({ forceRefresh });
    if (settings && settings.bank_account) {
      _cachedBankConfig = {
        bankId: 'MBBANK',
        bankName: 'Ngân hàng Quân Đội (MB Bank)',
        bin: settings.bank_bin || '970422',
        accountNumber: settings.bank_account,
        accountName: settings.bank_account_name || 'PHAM CHI DUC',
        notePrefix: 'OMNI',
        supportEmail: settings.support_email || 'phamduccgt18@gmail.com',
        salesZalo: settings.sales_zalo || '0394085700'
      };
      return _cachedBankConfig;
    }
  } catch (err) {
    console.warn('[Checkout] Lỗi khi đồng bộ cấu hình ngân hàng từ license server:', err.message);
  }
  return DEFAULT_BANK_CONFIG;
}

function generateVietQRUrl({ amount, transferContent, bank = null }) {
  const b = bank || _cachedBankConfig || DEFAULT_BANK_CONFIG;
  const safeContent = encodeURIComponent(transferContent);
  const safeName = encodeURIComponent(b.accountName);
  return `https://api.vietqr.io/image/${b.bin}-${b.accountNumber}-compact2.png?amount=${amount}&addInfo=${safeContent}&accountName=${safeName}`;
}

/**
 * Tạo đơn hàng mua gói và đồng bộ trực tiếp lên Store lic.cgtdev.space
 */
async function createOrder({ userId, email, name, phone, planCode }) {
  if (!email || !email.includes('@')) {
    throw new Error('Email không hợp lệ');
  }
  const cleanEmail = email.trim().toLowerCase();
  const plan = await findPlan(planCode);
  if (!plan) {
    throw new Error(`Gói dịch vụ không hợp lệ (${planCode})`);
  }

  const bank = await getBankConfig();
  const orderNum = Math.floor(100000 + Math.random() * 900000);
  let orderId = `OMNI-${orderNum}`;
  const now = new Date().toISOString();
  let transferContent = `OMNI ${orderNum} ${cleanEmail.split('@')[0].slice(0, 8).toUpperCase()}`;
  let remoteOrderId = null;
  let remoteOrderCode = null;

  // Tra cứu thông tin người dùng trong cơ sở dữ liệu nếu có
  let userObj = null;
  if (userId) {
    try { userObj = db.getUserById(userId); } catch (_) {}
  }
  if (!userObj && cleanEmail) {
    try { userObj = db.getUserByEmail(cleanEmail); } catch (_) {}
  }

  let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  if (!cleanPhone && userObj && userObj.phone) {
    cleanPhone = userObj.phone.replace(/[^0-9]/g, '');
  }
  if (!cleanPhone && cleanEmail === 'pduc42620@gmail.com') {
    cleanPhone = '0394085700';
  }

  // Tự động lưu và cập nhật SĐT cho tài khoản để lần sau không cần nhập lại
  if (userObj && cleanPhone && cleanPhone.length >= 9 && userObj.phone !== cleanPhone) {
    try {
      db.updateUser(userObj.id, { phone: cleanPhone });
      console.log(`[Checkout] Đã lưu SĐT mới cho user ${cleanEmail}: ${cleanPhone}`);
    } catch (err) {
      console.warn('[Checkout] Lưu SĐT user thất bại:', err.message);
    }
  }

  if (!cleanPhone || cleanPhone.length < 9 || cleanPhone.length > 12) {
    cleanPhone = '0988888888';
  }

  // 1. Kiểm tra xem người dùng này đã có đơn hàng PENDING cho gói này trong 15 phút gần nhất chưa để tái sử dụng
  try {
    const recentPending = db.getDb().prepare(`
      SELECT * FROM orders 
      WHERE customer_email = ? 
        AND plan_code = ? 
        AND status = 'PENDING' 
        AND datetime(created_at) > datetime('now', '-15 minutes')
      ORDER BY created_at DESC 
      LIMIT 1
    `).get(cleanEmail, plan.code);

    if (recentPending) {
      if (cleanPhone && cleanPhone !== recentPending.customer_phone) {
        try {
          db.getDb().prepare(`UPDATE orders SET customer_phone = ? WHERE id = ?`).run(cleanPhone, recentPending.id);
        } catch (_) {}
      }
      const existingQrUrl = generateVietQRUrl({
        amount: recentPending.amount,
        transferContent: recentPending.transfer_content,
        bank
      });
      console.log(`[Checkout] Tái sử dụng đơn hàng đang chờ: ${recentPending.id} (${recentPending.transfer_content})`);
      return {
        order: {
          id: recentPending.id,
          user_id: recentPending.user_id,
          customer_email: recentPending.customer_email,
          customer_name: recentPending.customer_name,
          customer_phone: cleanPhone || recentPending.customer_phone,
          plan_code: recentPending.plan_code,
          plan_name: recentPending.plan_name,
          amount: recentPending.amount,
          duration_days: recentPending.duration_days,
          max_profiles: recentPending.max_profiles,
          status: recentPending.status,
          transfer_content: recentPending.transfer_content,
          created_at: recentPending.created_at,
          qr_url: existingQrUrl
        },
        qrUrl: existingQrUrl,
        bankInfo: bank,
        reused: true
      };
    }
  } catch (checkErr) {
    console.warn('[Checkout] Kiểm tra đơn hàng gần nhất:', checkErr.message);
  }

  // Tạo đơn hàng trực tiếp lên mục "Đơn hàng" của lic.cgtdev.space
  try {
    const remoteOrder = await licenseAdmin.createRemoteOrder({
      planId: plan.id,
      name: (name || cleanEmail.split('@')[0]).trim(),
      email: cleanEmail,
      phone: cleanPhone
    });

    if (remoteOrder && remoteOrder.orderCode) {
      remoteOrderCode = remoteOrder.orderCode;
      remoteOrderId = remoteOrder.remoteOrderId;
      if (remoteOrder.paymentContent) {
        transferContent = remoteOrder.paymentContent;
      }
      console.log(`[Checkout] Đã tạo đơn hàng trên lic.cgtdev.space: ${remoteOrderCode} (ID: ${remoteOrderId || 'chờ sync'})`);
    }
  } catch (remoteErr) {
    console.warn('[Checkout] Lỗi khi tạo đơn hàng trên lic.cgtdev.space:', remoteErr.message);
  }

  const qrUrl = generateVietQRUrl({
    amount: plan.price,
    transferContent,
    bank
  });

  const orderData = {
    id: orderId,
    user_id: userId || (userObj ? userObj.id : null),
    customer_email: cleanEmail,
    customer_name: (name || cleanEmail.split('@')[0]).trim(),
    customer_phone: cleanPhone,
    plan_code: plan.code,
    plan_name: plan.name,
    amount: plan.price,
    duration_days: plan.duration_days,
    max_profiles: plan.max_profiles,
    status: 'PENDING',
    transfer_content: transferContent,
    license_key: '',
    remote_order_id: remoteOrderId,
    remote_order_code: remoteOrderCode,
    created_at: now,
    updated_at: now,
    paid_at: null
  };

  db.createOrder(orderData);

  return {
    order: orderData,
    bankInfo: {
      ...bank,
      amount: plan.price,
      amountFormatted: `${plan.price.toLocaleString('vi-VN')} đ`,
      transferContent,
      qrUrl
    }
  };
}

/**
 * Xác nhận thanh toán đơn hàng & tự động cấp key từ lic.cgtdev.space
 */
async function confirmOrder({ orderId, userId }) {
  const order = db.getOrderById(orderId);
  if (!order) {
    throw new Error('Đơn hàng không tồn tại');
  }

  if (order.status === 'PAID' && order.license_key) {
    return {
      order,
      key: order.license_key,
      message: 'Đơn hàng đã được thanh toán trước đó'
    };
  }

  let issuedKey = null;
  let issuedInfo = null;

  // 1. Duyệt đơn hàng trực tiếp trên lic.cgtdev.space (nếu đã tạo từ xa)
  if (order.remote_order_id || order.remote_order_code) {
    try {
      const approveRes = await licenseAdmin.approveRemoteOrder({
        remoteOrderId: order.remote_order_id,
        orderCode: order.remote_order_code,
        reason: 'Tự động duyệt thanh toán từ OmniBrowser'
      });
      if (approveRes && approveRes.licenseKey) {
        issuedKey = approveRes.licenseKey;
        console.log(`[Checkout] Đã duyệt đơn hàng ${order.remote_order_code} trên lic.cgtdev.space -> Key: ${issuedKey}`);
      }
    } catch (err) {
      console.warn('[Checkout] Lỗi khi duyệt đơn từ xa trên lic.cgtdev.space:', err.message);
    }
  }

  // 2. Nếu chưa có key (do đơn chưa sync từ trước hoặc approve lỗi), cấp key qua issueKey
  if (!issuedKey) {
    try {
      issuedInfo = await licenseAdmin.issueKey({
        planCode: order.plan_code,
        durationDays: order.duration_days,
        notes: `Kích hoạt cho đơn hàng ${order.id} - ${order.customer_email}`,
        customer: {
          name: order.customer_name,
          email: order.customer_email,
          phone: order.customer_phone
        }
      });
      if (issuedInfo && issuedInfo.key) {
        issuedKey = issuedInfo.key;
      }
    } catch (err) {
      console.warn('[Checkout] Lỗi khi tạo key trực tuyến từ lic.cgtdev.space:', err.message);
      // Fallback: Nếu license server offline hoặc rate-limited, sinh mã key offline hợp lệ
      const prefix = order.plan_code === 'VIP_LIFETIME' ? 'OMNI-VIP' : 'OMNI-PRO';
      const randParts = Array.from({ length: 3 }, () => crypto.randomBytes(3).toString('hex').toUpperCase()).join('-');
      issuedKey = `${prefix}-${randParts}`;
    }
  }

  const now = new Date().toISOString();
  db.updateOrder(orderId, {
    status: 'PAID',
    license_key: issuedKey,
    updated_at: now,
    paid_at: now
  });

  // Gửi thư cảm ơn và License Key về email người mua
  try {
    const mailer = require('./mailer');
    mailer.sendThankYouEmail({
      customerName: order.customer_name || 'Quý khách',
      customerEmail: order.customer_email,
      planName: order.plan_name,
      planCode: order.plan_code,
      licenseKey: issuedKey,
      durationDays: order.duration_days,
      maxProfiles: order.max_profiles,
      maxThreads: order.plan_code === 'VIP_LIFETIME' ? 50 : 20,
      orderId: order.id
    }).catch(e => console.warn('[Checkout] Gửi email cảm ơn bị lỗi:', e.message));
  } catch (mailErr) {
    console.warn('[Checkout] Khởi tạo mailer lỗi:', mailErr.message);
  }

  // Nếu có tài khoản người dùng, kích hoạt key trực tiếp vào tài khoản
  let targetUserId = userId || order.user_id;
  if (!targetUserId && order.customer_email) {
    const existingUser = db.getUserByEmail(order.customer_email);
    if (existingUser) targetUserId = existingUser.id;
  }

  let updatedUser = null;
  if (targetUserId) {
    try {
      updatedUser = await auth.activateKeyForUser(targetUserId, issuedKey, {
        durationDays: order.duration_days,
        plan: order.plan_name,
        planCode: order.plan_code
      });
    } catch (actErr) {
      console.warn('[Checkout] activateKeyForUser warning:', actErr.message);
    }
  }

  const updatedOrder = db.getOrderById(orderId);
  return {
    success: true,
    order: updatedOrder,
    key: issuedKey,
    user: updatedUser,
    message: 'Thanh toán thành công! Gói bản quyền đã được kích hoạt.'
  };
}

/**
 * Xử lý Webhook thanh toán tự động (SePay, Casso, MB Bank Bot hoặc IPN)
 * Tự động tìm đơn hàng, duyệt trên lic.cgtdev.space và kích hoạt tài khoản
 */
async function processPaymentWebhook(payload) {
  let content = '';
  let amount = 0;

  if (payload.content || payload.transferAmount) {
    content = String(payload.content || payload.code || '');
    amount = Number(payload.transferAmount) || 0;
  } else if (Array.isArray(payload.data) && payload.data.length > 0) {
    content = String(payload.data[0].description || '');
    amount = Number(payload.data[0].amount) || 0;
  } else if (payload.transfer_content || payload.amount) {
    content = String(payload.transfer_content || payload.description || '');
    amount = Number(payload.amount) || 0;
  } else {
    content = typeof payload === 'string' ? payload : JSON.stringify(payload);
  }

  // 1. Tìm theo mã OMNI-123456
  const match = content.match(/OMNI[\s\-_]?(\d{6})/i);
  let order = null;
  if (match) {
    const orderNum = match[1];
    order = db.getOrderById(`OMNI-${orderNum}`);
  }

  // 2. Tìm theo mã ANTID... (Mã chuẩn của đơn hàng lic.cgtdev.space)
  if (!order) {
    const antidMatch = content.match(/ANTID\d{6}\-[A-Z0-9]+/i);
    if (antidMatch) {
      const pendingOrders = (db.listOrders ? db.listOrders() : []).filter(o => o.status === 'PENDING');
      order = pendingOrders.find(o => 
        o.remote_order_code === antidMatch[0] || 
        (o.transfer_content && o.transfer_content.includes(antidMatch[0]))
      );
    }
  }

  if (!order && payload.orderId) {
    order = db.getOrderById(payload.orderId);
  }

  // 3. Quét linh hoạt theo bất kỳ từ khóa nào trong nội dung chuyển khoản
  if (!order) {
    const pendingOrders = (db.listOrders ? db.listOrders() : []).filter(o => o.status === 'PENDING');
    order = pendingOrders.find(o => {
      const cleanId = o.id.replace('-', '').toUpperCase();
      const contentUpper = content.toUpperCase();
      return (
        contentUpper.includes(cleanId) ||
        contentUpper.includes(o.id.toUpperCase()) ||
        (o.remote_order_code && contentUpper.includes(o.remote_order_code.toUpperCase())) ||
        (o.transfer_content && contentUpper.includes(o.transfer_content.toUpperCase()))
      );
    });
  }

  if (!order) {
    return {
      success: false,
      message: 'Không tìm thấy đơn hàng PENDING khớp với nội dung chuyển khoản',
      content,
      amount
    };
  }

  const confirmResult = await confirmOrder({ orderId: order.id, userId: order.user_id });
  return {
    success: true,
    auto_approved: true,
    orderId: order.id,
    order: confirmResult.order,
    key: confirmResult.key,
    user: confirmResult.user,
    message: `Đã tự động xác nhận đơn hàng ${order.id} (${order.remote_order_code || 'Local'}) và cấp License Key thành công`
  };
}

async function getOrderStatus(orderId) {
  if (!orderId) return null;
  let order = db.getOrderById(orderId);
  if (!order) return null;

  // Nếu đơn đã PAID và đã có License Key -> trả về luôn
  if (order.status === 'PAID' && order.license_key) {
    return order;
  }

  // Nếu đơn đang PENDING, kiểm tra xem trên lic.cgtdev.space đã được thanh toán & tự động duyệt chưa
  if (order.status === 'PENDING' && (order.remote_order_code || order.remote_order_id)) {
    try {
      const orders = await licenseAdmin.listAdminOrders();
      const remote = orders.find(o =>
        (order.remote_order_code && o.order_code === order.remote_order_code) ||
        (order.remote_order_id && o.id === order.remote_order_id)
      );

      if (remote && (remote.status === 'approved' || remote.license_key)) {
        const issuedKey = remote.license_key;
        const now = new Date().toISOString();
        console.log(`[Checkout AutoSync] Đơn hàng ${order.id} (${remote.order_code}) đã được thanh toán & tự động duyệt trên lic.cgtdev.space! Key: ${issuedKey}`);

        // Cập nhật database nội bộ thành PAID
        db.updateOrder(orderId, {
          status: 'PAID',
          license_key: issuedKey,
          updated_at: now,
          paid_at: remote.reviewed_at || now
        });

        // Tự động kích hoạt gói License vào tài khoản người dùng
        let targetUserId = order.user_id;
        if (!targetUserId && order.customer_email) {
          const existingUser = db.getUserByEmail(order.customer_email);
          if (existingUser) targetUserId = existingUser.id;
        }

        if (targetUserId && issuedKey) {
          try {
            await auth.activateKeyForUser(targetUserId, issuedKey, {
              durationDays: order.duration_days,
              plan: order.plan_name,
              planCode: order.plan_code
            });
            console.log(`[Checkout AutoSync] Đã tự động kích hoạt key ${issuedKey} cho user ${targetUserId}`);
          } catch (actErr) {
            console.warn('[Checkout AutoSync] activateKeyForUser warning:', actErr.message);
          }
        }

        // Gửi email cảm ơn
        try {
          const mailer = require('./mailer');
          mailer.sendThankYouEmail({
            customerName: order.customer_name || 'Quý khách',
            customerEmail: order.customer_email,
            planName: order.plan_name,
            planCode: order.plan_code,
            licenseKey: issuedKey,
            durationDays: order.duration_days,
            maxProfiles: order.max_profiles,
            maxThreads: order.plan_code === 'VIP_LIFETIME' ? 50 : 20,
            orderId: order.id
          }).catch(e => console.warn('[Checkout AutoSync] Email warning:', e.message));
        } catch {}

        order = db.getOrderById(orderId);
      }
    } catch (checkErr) {
      console.warn('[Checkout AutoSync] Lỗi kiểm tra đơn hàng từ xa:', checkErr.message);
    }
  }

  return order;
}

module.exports = {
  PLANS,
  BANK_CONFIG: DEFAULT_BANK_CONFIG,
  DEFAULT_BANK_CONFIG,
  getPlans,
  findPlan,
  getBankConfig,
  generateVietQRUrl,
  createOrder,
  confirmOrder,
  processPaymentWebhook,
  getOrderStatus
};
