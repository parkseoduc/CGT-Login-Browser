const crypto = require('crypto');
const db = require('./db');
const auth = require('./auth');
const licenseAdmin = require('./license-admin');

const PLANS = {
  PRO_MONTHLY: {
    code: 'PRO_MONTHLY',
    name: 'OmniBrowser Pro',
    tag: 'Phổ Biến',
    badge: '500 Hồ Sơ',
    duration_days: 30,
    price: 199000,
    price_formatted: '199.000 đ / tháng',
    max_profiles: 500,
    max_threads: 20,
    features: [
      'Tối đa 500 Hồ sơ Antidetect cao cấp',
      'Chạy đồng thời tối đa 20 luồng độc lập',
      'Đồng bộ hóa thao tác chuột & bàn phím',
      'Tự động tích hợp Proxy xoay 4G / IPv6',
      'Nhân MyBrowser 153 Core (Pass 100% Iphey & Pixelscan)',
      'Hỗ trợ kỹ thuật qua Telegram / Zalo'
    ]
  },
  VIP_LIFETIME: {
    code: 'VIP_LIFETIME',
    name: 'OmniBrowser VIP Vĩnh Viễn',
    tag: 'VIP Trọn Đời',
    badge: '2.000 Hồ Sơ',
    duration_days: 3650,
    price: 1990000,
    price_formatted: '1.990.000 đ / trọn đời',
    max_profiles: 2000,
    max_threads: 50,
    features: [
      'Tối đa 2.000 Hồ sơ Antidetect không giới hạn thời gian',
      'Hạn sử dụng 10 năm (Trọn đời)',
      'Chạy đồng thời tối đa 50 luồng hiệu suất cao',
      'Đồng bộ dữ liệu đám mây Cloud Sync không giới hạn',
      'Toàn quyền truy cập kho Tiện ích Chrome & Proxy Manager',
      'Ưu tiên hỗ trợ kỹ thuật 24/7 từ chuyên viên CGT Dev',
      'Miễn phí nâng cấp tất cả phiên bản nhân Chromium tiếp theo'
    ]
  }
};

const BANK_CONFIG = {
  bankId: 'MBBANK',
  bankName: 'Ngân hàng Quân Đội (MB Bank)',
  bin: '970422',
  accountNumber: '0988888888',
  accountName: 'CONG TY CONG NGHE CGT',
  notePrefix: 'OMNI'
};

function getPlans() {
  return Object.values(PLANS);
}

function getBankConfig() {
  return BANK_CONFIG;
}

function generateVietQRUrl({ amount, transferContent }) {
  const safeContent = encodeURIComponent(transferContent);
  const safeName = encodeURIComponent(BANK_CONFIG.accountName);
  return `https://api.vietqr.io/image/${BANK_CONFIG.bin}-${BANK_CONFIG.accountNumber}-compact2.png?amount=${amount}&addInfo=${safeContent}&accountName=${safeName}`;
}

/**
 * Tạo đơn hàng mua gói và đồng bộ khách hàng sang lic.cgtdev.space
 */
async function createOrder({ userId, email, name, phone, planCode }) {
  if (!email || !email.includes('@')) {
    throw new Error('Email không hợp lệ');
  }
  const cleanEmail = email.trim().toLowerCase();
  const plan = PLANS[planCode];
  if (!plan) {
    throw new Error(`Gói dịch vụ không hợp lệ (${planCode})`);
  }

  const orderNum = Math.floor(100000 + Math.random() * 900000);
  const orderId = `OMNI-${orderNum}`;
  const now = new Date().toISOString();
  const transferContent = `OMNI ${orderNum} ${cleanEmail.split('@')[0].slice(0, 8).toUpperCase()}`;

  const qrUrl = generateVietQRUrl({
    amount: plan.price,
    transferContent
  });

  const orderData = {
    id: orderId,
    user_id: userId || null,
    customer_email: cleanEmail,
    customer_name: (name || cleanEmail.split('@')[0]).trim(),
    customer_phone: phone || '',
    plan_code: plan.code,
    plan_name: plan.name,
    amount: plan.price,
    duration_days: plan.duration_days,
    max_profiles: plan.max_profiles,
    status: 'PENDING',
    transfer_content: transferContent,
    license_key: '',
    created_at: now,
    updated_at: now,
    paid_at: null
  };

  db.createOrder(orderData);

  // Đồng bộ thông tin khách hàng sang lic.cgtdev.space trong nền
  licenseAdmin.findOrCreateCustomer({
    name: orderData.customer_name,
    email: cleanEmail,
    phone: phone || '',
    notes: `Đặt mua gói ${plan.name} qua OmniBrowser (${orderId})`
  }).then(remoteCust => {
    if (remoteCust) {
      console.log(`[Checkout] Đã đồng bộ khách hàng ${cleanEmail} sang lic.cgtdev.space (ID: ${remoteCust.id})`);
    }
  }).catch(err => {
    console.warn(`[Checkout] Đồng bộ khách hàng sang lic.cgtdev.space bị chậm:`, err.message);
  });

  return {
    order: orderData,
    bankInfo: {
      ...BANK_CONFIG,
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
    // Nếu đơn đã thanh toán rồi, trả về kết quả
    return {
      order,
      key: order.license_key,
      message: 'Đơn hàng đã được thanh toán trước đó'
    };
  }

  // Cấp license key từ server lic.cgtdev.space
  let issuedKey = null;
  let issuedInfo = null;

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
      updatedUser = await auth.activateKeyForUser(targetUserId, issuedKey);
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

module.exports = {
  PLANS,
  BANK_CONFIG,
  getPlans,
  getBankConfig,
  generateVietQRUrl,
  createOrder,
  confirmOrder
};
