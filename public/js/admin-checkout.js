/**
 * OmniBrowser Admin & VietQR Checkout Module
 * Handles:
 * - VietQR Checkout & Licensing flow (Buy Pro / VIP Lifetime)
 * - Admin User Management (List users, grant plans, ban/unban, reset pass)
 * - Orders List & Approval
 */

(function () {
  let currentOrder = null;
  let currentCheckoutPlan = 'PRO_MONTHLY';
  let adminUsersList = [];
  let adminOrdersList = [];
  let cachedPlans = [];
  let isSyncingPackages = false;
  let orderPollingTimer = null;

  function getAuthHeader() {
    const token = localStorage.getItem('cgt_auth_token') || (typeof getAuthToken === 'function' ? getAuthToken() : '');
    return token ? { 'Authorization': 'Bearer ' + token } : {};
  }

  function showNotification(msg, type = 'info') {
    if (typeof showToast === 'function') {
      showToast(msg, type);
    } else {
      if (typeof window.showToast === "function") window.showToast(msg, "warning"); else console.warn(msg);
    }
  }

  // Register admin in window.views if available
  if (window.views) {
    window.views.admin = {
      el: document.getElementById('view-admin'),
      title: 'Quản Trị Người Dùng & Bản Quyền',
      sub: 'Quản lý tài khoản, cấp gói Pro / VIP và kết nối máy chủ lic.cgtdev.space'
    };
  }

  /* ==========================================================================
     CHECKOUT & VIETQR PAYMENT FLOW
     ========================================================================== */

  async function openCheckoutModal(planCode = 'PRO_MONTHLY') {
    currentCheckoutPlan = planCode;
    const modal = document.getElementById('checkout-modal');
    if (!modal) return;

    // Reset view steps
    const stepPayment = document.getElementById('checkout-step-payment');
    const stepSuccess = document.getElementById('checkout-step-success');
    if (stepPayment) stepPayment.style.display = 'block';
    if (stepSuccess) stepSuccess.style.display = 'none';

    // Update plan pill active state
    updatePlanPillUI(planCode);

    // Populate email and name from logged in user if available
    const user = window.currentUser;
    const emailInput = document.getElementById('chk-customer-email');
    const nameInput = document.getElementById('chk-customer-name');
    const phoneInput = document.getElementById('chk-customer-phone');

    if (user) {
      if (emailInput && (!emailInput.value || emailInput.value === 'guest@cgt.vn')) {
        emailInput.value = user.email || '';
      }
      if (nameInput && !nameInput.value) {
        nameInput.value = user.name || (user.email ? user.email.split('@')[0] : '');
      }
      if (phoneInput && !phoneInput.value && user.phone) {
        phoneInput.value = user.phone;
      }
    }

    modal.style.display = 'flex';
    await generateCheckoutOrder();
  }

  function updatePlanPillUI(planCode) {
    const pills = document.querySelectorAll('.checkout-plan-pill');
    pills.forEach(p => {
      const pCode = p.dataset.plan;
      const isMatch = pCode === planCode || 
        (planCode === 'PRO_MONTHLY' && (pCode === 'PRO_MONTHLY' || pCode === 'PLUS')) ||
        (planCode === 'VIP_LIFETIME' && (pCode === 'PRO' || pCode === 'VIP_LIFETIME')) ||
        (planCode === 'PRO' && (pCode === 'PRO' || pCode === 'VIP_LIFETIME'));
      p.classList.toggle('active', isMatch);
    });

    const tag = document.getElementById('chk-plan-tag');
    const name = document.getElementById('chk-plan-name');
    const price = document.getElementById('chk-plan-price');
    const period = document.getElementById('chk-plan-period');
    const featList = document.getElementById('chk-features-list');

    // Find in cachedPlans
    const plan = cachedPlans.find(p => {
      if (p.code === planCode || p.id === planCode) return true;
      const pCode = String(p.code || '').toUpperCase();
      const pName = String(p.name || '').toUpperCase();
      const target = String(planCode || '').toUpperCase();
      if (target === 'PRO' || target === 'VIP' || target === 'VIP_LIFETIME') {
        return pCode === 'PRO' || (pName.includes('PRO') && !pName.includes('PLUS'));
      }
      if (target === 'PRO_MONTHLY' || target === 'PLUS' || target === 'PULS') {
        return pCode === 'PRO_MONTHLY' || pCode === 'PULS' || pName.includes('PLUS');
      }
      return false;
    }) || cachedPlans[0];

    if (plan) {
      const isLifetime = Boolean(plan.duration_days && plan.duration_days >= 365);
      const isPro = (plan.code && plan.code.includes('PRO')) || (plan.name && plan.name.includes('Pro'));
      const isVip = isLifetime || isPro;
      if (tag) {
        tag.textContent = plan.tag || (isLifetime ? 'VIP Trọn Đời' : (isPro ? 'Gói Pro' : 'Phổ Biến'));
        tag.style.background = isPro ? 'rgba(16, 185, 129, 0.2)' : 'rgba(37, 99, 235, 0.2)';
        tag.style.color = isPro ? '#10B981' : '#60A5FA';
      }
      if (name) name.textContent = plan.name;
      if (price) {
        price.textContent = (plan.price || 0).toLocaleString('vi-VN') + ' đ';
        price.style.color = isPro ? '#10B981' : '#60A5FA';
      }
      if (period) {
        const durationDays = Number(plan.duration_days) || 30;
        const durText = durationDays >= 3650 ? '10 năm (Trọn đời)' : (durationDays >= 365 ? `${Math.round(durationDays / 365)} năm` : `${durationDays} ngày`);
        period.textContent = `Thời hạn: ${durText} • ${plan.badge || (plan.max_profiles + ' Hồ sơ')}`;
      }
      if (featList) {
        if (Array.isArray(plan.features) && plan.features.length > 0) {
          featList.innerHTML = plan.features.map(f => `<div class="chk-feat-item">✓ ${escapeHtml(f)}</div>`).join('');
        } else {
          featList.innerHTML = `
            <div class="chk-feat-item">✓ ${plan.max_profiles || 500} Hồ sơ Antidetect cao cấp độc lập</div>
            <div class="chk-feat-item">✓ Chạy đồng thời tối đa ${plan.max_threads || 20} luồng</div>
            <div class="chk-feat-item">✓ Tối đa ${plan.team_members || (isVip ? 50 : 5)} thành viên Đội Ngũ (Workspace Team)</div>
            <div class="chk-feat-item">✓ Đồng bộ hóa thao tác chuột & bàn phím</div>
            <div class="chk-feat-item">✓ Nhân Chromium 153 Core (Pass 100% Iphey)</div>
          `;
        }
      }
    }
  }

  async function generateCheckoutOrder() {
    const qrImg = document.getElementById('chk-qr-img');
    const qrLoading = document.getElementById('chk-qr-loading');
    const accNum = document.getElementById('chk-acc-num');
    const accName = document.getElementById('chk-acc-name');
    const bankName = document.getElementById('chk-bank-name');
    const amountVal = document.getElementById('chk-amount-val');
    const contentVal = document.getElementById('chk-transfer-content');

    if (qrImg) qrImg.style.display = 'none';
    if (qrLoading) qrLoading.style.display = 'block';

    const emailInput = document.getElementById('chk-customer-email');
    const nameInput = document.getElementById('chk-customer-name');
    const phoneInput = document.getElementById('chk-customer-phone');
    const email = (emailInput && emailInput.value.trim()) || (window.currentUser ? window.currentUser.email : 'guest@cgt.vn');
    const name = (nameInput && nameInput.value.trim()) || (window.currentUser ? window.currentUser.name : 'Khách Hàng');
    const phone = (phoneInput && phoneInput.value.trim()) || (window.currentUser ? window.currentUser.phone : '') || '';

    try {
      const res = await fetch('/api/v1/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          email,
          name,
          phone,
          planCode: currentCheckoutPlan
        })
      });

      const data = await res.json();
      if (data.success && data.order) {
        currentOrder = data.order;
        startOrderPolling(currentOrder.id);
        const b = data.bankInfo;

        if (bankName) bankName.textContent = b.bankName;
        if (accNum) accNum.textContent = b.accountNumber;
        if (accName) accName.textContent = b.accountName;
        if (amountVal) amountVal.textContent = b.amountFormatted;
        if (contentVal) contentVal.textContent = b.transferContent;

        if (qrImg) {
          qrImg.src = b.qrUrl;
          qrImg.onload = () => {
            if (qrLoading) qrLoading.style.display = 'none';
            qrImg.style.display = 'block';
          };
          qrImg.onerror = () => {
            if (qrLoading) qrLoading.textContent = 'Mã QR đã sẵn sàng';
          };
        }
      }
    } catch (err) {
      console.warn('[Checkout] Tạo đơn hàng lỗi:', err.message);
      if (qrLoading) qrLoading.textContent = 'Lỗi kết nối máy chủ thanh toán';
    }
  }


  function stopOrderPolling() {
    if (orderPollingTimer) {
      clearInterval(orderPollingTimer);
      orderPollingTimer = null;
    }
  }

  function startOrderPolling(orderId) {
    stopOrderPolling();
    if (!orderId) return;

    orderPollingTimer = setInterval(async () => {
      try {
        const modal = document.getElementById('checkout-modal');
        if (!modal || modal.style.display === 'none') {
          stopOrderPolling();
          return;
        }

        const res = await fetch(`/api/v1/checkout/order-status?orderId=${encodeURIComponent(orderId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.is_paid) {
          stopOrderPolling();
          showNotification('🎉 Chúc mừng! Giao dịch đã được hệ thống tự động xác nhận và cấp key thành công.', 'success');
          showSuccessScreen(currentOrder, data.license_key);
        }
      } catch (err) {}
    }, 2000);
  }

  
  function triggerCheckoutConfetti() {
    const canvas = document.getElementById('chk-confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement || document.body;
    canvas.width = parent.offsetWidth || 840;
    canvas.height = parent.offsetHeight || 520;

    const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4'];
    const particles = [];
    for (let i = 0; i < 70; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.22,
        r: Math.random() * 5 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.75) * 12,
        tilt: Math.random() * 10,
        tiltSpeed: Math.random() * 0.1 + 0.05,
        gravity: 0.28,
        alpha: 1
      });
    }

    let frames = 0;
    function render() {
      frames++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.98;
        if (frames > 45) p.alpha -= 0.018;
        if (p.alpha > 0 && p.y < canvas.height + 20) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
      if (alive && frames < 140) {
        requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    render();
  }

  function showSuccessScreen(orderInfo, key, planData) {
    stopOrderPolling();

    const stepPayment = document.getElementById('checkout-step-payment');
    const stepSuccess = document.getElementById('checkout-step-success');
    if (stepPayment) stepPayment.style.display = 'none';
    if (stepSuccess) stepSuccess.style.display = 'block';

    const buyerName = orderInfo?.customer_name || document.getElementById('chk-customer-name')?.value || (window.currentUser ? window.currentUser.name : 'Quý khách');
    const buyerEmail = orderInfo?.customer_email || document.getElementById('chk-customer-email')?.value || (window.currentUser ? window.currentUser.email : '');
    const issuedKey = key || orderInfo?.license_key || 'OMNI-ACTIVE';

    const targetCode = orderInfo?.plan_code || currentCheckoutPlan || 'PRO';
    const plan = planData || cachedPlans.find(p => 
      p.code === targetCode || 
      p.id === targetCode || 
      (targetCode === 'PRO' && (p.code === 'PRO' || p.name?.toLowerCase().includes('pro'))) ||
      ((targetCode === 'PULS' || targetCode === 'PRO_MONTHLY') && (p.code === 'PULS' || p.code === 'PRO_MONTHLY' || p.name?.toLowerCase().includes('plus')))
    ) || cachedPlans.find(p => p.code === 'PRO') || cachedPlans[0] || {};

    const elName = document.getElementById('chk-success-user-name');
    const elEmail = document.getElementById('chk-success-user-email');
    const elPlanName = document.getElementById('chk-success-plan-name');
    const elKey = document.getElementById('chk-success-key-val');
    const elProfiles = document.getElementById('chk-perk-profiles');
    const elThreads = document.getElementById('chk-perk-threads');
    const elTeam = document.getElementById('chk-perk-team');
    const elDuration = document.getElementById('chk-perk-duration');

    const isPro = (plan.code && plan.code.includes('PRO')) || (plan.name && plan.name.toLowerCase().includes('pro'));
    const maxProfiles = plan.max_profiles || (isPro ? 2000 : 500);
    const maxThreads = plan.max_threads || (isPro ? 50 : 20);
    const teamMembers = plan.team_members || (isPro ? 50 : 5);
    const durationDays = Number(plan.duration_days) || 30;
    const durText = durationDays >= 3650 ? 'Trọn đời (10 năm)' : (durationDays >= 365 ? `${Math.round(durationDays / 365)} năm` : `${durationDays} ngày`);

    if (elName) elName.textContent = buyerName;
    if (elEmail) elEmail.textContent = buyerEmail;
    if (elPlanName) elPlanName.textContent = plan.name || orderInfo?.plan_name || (isPro ? 'OmniBrowser Pro' : 'OmniBrowser Plus');
    if (elKey) elKey.textContent = issuedKey;

    if (elProfiles) elProfiles.textContent = `${maxProfiles.toLocaleString('vi-VN')} Hồ sơ`;
    if (elThreads) elThreads.textContent = `${maxThreads} Luồng`;
    if (elTeam) elTeam.textContent = `${teamMembers} Nhân viên`;
    if (elDuration) elDuration.textContent = durText;

    setTimeout(() => {
      triggerCheckoutConfetti();
    }, 120);

    if (typeof checkAuthState === 'function') checkAuthState();
    if (typeof fetchLicense === 'function') fetchLicense();
  }

  async function confirmPayment() {
    if (!currentOrder || !currentOrder.id) {
      showNotification('Vui lòng đợi đơn hàng được khởi tạo', 'warning');
      return;
    }

    const btnConfirm = document.getElementById('btn-chk-confirm-payment');
    if (btnConfirm) {
      btnConfirm.disabled = true;
      btnConfirm.innerHTML = `<span>Đang xác thực thanh toán...</span>`;
    }

    try {
      const res = await fetch('/api/v1/checkout/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ orderId: currentOrder.id })
      });

      const data = await res.json();
      if (data.success) {
        stopOrderPolling();
        showNotification('🎉 Chúc mừng! Gói bản quyền đã được kích hoạt thành công.', 'success');
        showSuccessScreen(currentOrder, data.key || data.license_key);
      } else {
        showNotification(data.error || 'Chưa nhận được giao dịch. Vui lòng thử lại sau 30 giây.', 'warning');
      }
    } catch (err) {
      showNotification('Lỗi xác nhận thanh toán: ' + err.message, 'danger');
    } finally {
      if (btnConfirm) {
        btnConfirm.disabled = false;
        btnConfirm.innerHTML = `
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Tôi Đã Chuyển Khoản Thành Công</span>
        `;
      }
    }
  }

  /* ==========================================================================
     ADMIN MANAGEMENT FLOW
     ========================================================================== */

  async function loadAdminData() {
    await Promise.all([
      loadAdminStats(),
      loadAdminUsers(),
      loadAdminOrders()
    ]);
  }

  async function loadAdminStats() {
    try {
      const res = await fetch('/api/v1/admin/stats', { headers: getAuthHeader() });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.stats) {
        const s = data.stats;
        const totalEl = document.getElementById('stat-total-users');
        const activeEl = document.getElementById('stat-active-users');
        const vipEl = document.getElementById('stat-vip-users');
        const proEl = document.getElementById('stat-pro-users');
        const revEl = document.getElementById('stat-revenue');
        const paidOrdersEl = document.getElementById('stat-paid-orders');

        if (totalEl) totalEl.textContent = s.totalUsers || 0;
        if (activeEl) activeEl.textContent = `${s.activeUsers || 0} đang hoạt động`;
        if (vipEl) vipEl.textContent = s.vipUsers || 0;
        if (proEl) proEl.textContent = s.proUsers || 0;
        if (revEl) revEl.textContent = (s.revenue || 0).toLocaleString('vi-VN') + ' đ';
        if (paidOrdersEl) paidOrdersEl.textContent = `${s.paidOrders || 0} đơn hoàn tất`;
      }
    } catch (e) {
      console.warn('[Admin] Load stats error:', e.message);
    }
  }

  async function loadAdminUsers() {
    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) return;

    try {
      const res = await fetch('/api/v1/admin/users', { headers: getAuthHeader() });
      if (!res.ok) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 20px; color: #EF4444;">Không thể tải danh sách tài khoản (HTTP ${res.status}). Yêu cầu quyền Admin.</td></tr>`;
        return;
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        adminUsersList = data.users;
        renderAdminUsersTable(adminUsersList);
      }
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 20px; color: #EF4444;">Lỗi kết nối: ${e.message}</td></tr>`;
    }
  }

  function renderAdminUsersTable(users) {
    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) return;

    if (users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 30px; color: var(--text-muted);">Không tìm thấy người dùng nào phù hợp.</td></tr>`;
      return;
    }

    tbody.innerHTML = users.map((u, idx) => {
      const initial = (u.name || u.email || 'U')[0].toUpperCase();
      const isBanned = u.status === 'BANNED';
      const roleBadge = u.role === 'admin'
        ? `<span class="badge badge-subtle-blue" style="font-weight:700;">Admin</span>`
        : `<span class="badge" style="background: rgba(255,255,255,0.06); color: var(--text-muted);">User</span>`;

      let planBadge = `<span class="badge" style="background: rgba(255,255,255,0.08);">${u.plan || 'Free'}</span>`;
      if ((u.plan_code || '').includes('VIP')) {
        planBadge = `<span class="badge badge-emerald-solid">VIP Vĩnh Viễn</span>`;
      } else if ((u.plan_code || '').includes('PRO')) {
        planBadge = `<span class="badge badge-subtle-blue">Pro 30 Ngày</span>`;
      }

      const statusBadge = isBanned
        ? `<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #EF4444; font-weight:700;">ĐÃ KHÓA</span>`
        : `<span class="badge badge-running"><span class="badge-pulse"></span> Hoạt động</span>`;

      const keyText = u.license_key ? `<span class="mono-code" style="font-size:11.5px;">${u.license_key}</span>` : `<span style="color:var(--text-muted); font-size:12px;">—</span>`;
      const formatVn = window.formatVnDate || function(d) {
        if (!d) return '—';
        const date = new Date(d);
        if (isNaN(date.getTime())) return '—';
        return String(date.getDate()).padStart(2, '0') + '/' + String(date.getMonth() + 1).padStart(2, '0') + '/' + date.getFullYear();
      };
      const buyDate = u.created_at ? formatVn(u.created_at) : '—';
      let endDate = 'Vô hạn';
      if (u.expires_at) {
        endDate = formatVn(u.expires_at);
      } else if (u.plan_code?.includes('VIP')) {
        endDate = '<span style="font-weight:600; color:#10B981; font-family: inherit;">Vĩnh viễn</span>';
      } else {
        endDate = '<span style="color:var(--text-muted); font-family: inherit;">Vô hạn</span>';
      }
      const periodRange = `${buyDate} — ${endDate}`;
      const createdDate = buyDate;

      return `
        <tr>
          <td style="color: var(--text-muted); font-weight:600;">${idx + 1}</td>
          <td>
            <div style="display:flex; align-items:center; gap: 10px;">
              <div style="width:32px; height:32px; border-radius:50%; background: #2563EB; color:#FFF; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px;">${initial}</div>
              <div>
                <div style="font-weight:700; color:var(--text-main); font-size:13px;">${escapeHtml(u.name || u.email.split('@')[0])}</div>
                <div style="font-size:12px; color:var(--text-muted);">${escapeHtml(u.email)}</div>
              </div>
            </div>
          </td>
          <td>${roleBadge}</td>
          <td>${planBadge}</td>
          <td>${keyText}</td>
          <td style="font-size:12.5px; font-family: inherit; white-space: nowrap; font-weight: 500;">${periodRange}</td>
          <td>${statusBadge}</td>
          <td style="font-size:12px; color:var(--text-muted);">${createdDate}</td>
          <td style="text-align: right;">
            <div class="admin-action-group">
              <button class="admin-action-btn btn-grant" onclick="window.adminOpenGrantModal('${u.id}', '${escapeHtml(u.email)}')">
                <span>Cấp Gói</span>
              </button>
              ${isBanned
                ? `<button class="admin-action-btn btn-unlock" onclick="window.adminToggleUserStatus('${u.id}', 'ACTIVE')"><span>Mở</span></button>`
                : `<button class="admin-action-btn btn-lock" onclick="window.adminToggleUserStatus('${u.id}', 'BANNED')"><span>Khóa</span></button>`
              }
              <button class="admin-action-btn btn-key" onclick="window.adminOpenResetPassModal('${u.id}', '${escapeHtml(u.email)}')">
                <span>Đổi Pass</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  async function loadAdminOrders() {
    const tbody = document.getElementById('admin-orders-table');
    const tbodyContent = document.getElementById('admin-orders-tbody');
    if (!tbodyContent) return;

    try {
      const res = await fetch('/api/v1/admin/orders', { headers: getAuthHeader() });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        adminOrdersList = data.orders;
        renderAdminOrdersTable(adminOrdersList);
      }
    } catch (e) {
      console.warn('[Admin] Load orders error:', e.message);
    }
  }

  function renderAdminOrdersTable(orders) {
    const tbody = document.getElementById('admin-orders-tbody');
    if (!tbody) return;

    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 30px; color: var(--text-muted);">Chưa có đơn hàng nào trong hệ thống.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map((o) => {
      const isPaid = o.status === 'PAID';
      const statusBadge = isPaid
        ? `<span class="badge badge-emerald-solid">ĐÃ THANH TOÁN</span>`
        : `<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #F59E0B; font-weight:700;">CHỜ CHUYỂN KHOẢN</span>`;

      const createdDate = o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : '—';
      const amountFormatted = (o.amount || 0).toLocaleString('vi-VN') + ' đ';
      const keyText = o.license_key ? `<span class="mono-code" style="font-size:11.5px;">${o.license_key}</span>` : `<span style="color:var(--text-muted);">Chưa cấp</span>`;

      return `
        <tr>
          <td style="font-weight:700; font-family:monospace; color:#3B82F6;">${escapeHtml(o.id)}</td>
          <td>
            <div style="font-weight:600; color:var(--text-main); font-size:13px;">${escapeHtml(o.customer_name || 'Khách hàng')}</div>
            <div style="font-size:12px; color:var(--text-muted);">${escapeHtml(o.customer_email)}</div>
          </td>
          <td><span style="font-weight:600;">${escapeHtml(o.plan_name || o.plan_code)}</span></td>
          <td style="font-weight:800; color:#10B981;">${amountFormatted}</td>
          <td><span class="mono-code" style="font-size:11px;">${escapeHtml(o.transfer_content || '')}</span></td>
          <td>${statusBadge}</td>
          <td>${keyText}</td>
          <td style="font-size:12px; color:var(--text-muted);">${createdDate}</td>
          <td style="text-align: right;">
            ${!isPaid
              ? `<button class="admin-action-btn btn-unlock" onclick="window.adminApproveOrder('${o.id}')"><span>✓ Duyệt & Cấp Key</span></button>`
              : `<span style="font-size:12px; color:#10B981; font-weight:700;">Hoàn tất</span>`
            }
          </td>
        </tr>
      `;
    }).join('');
  }

  function filterAdminUsers() {
    const searchVal = (document.getElementById('admin-user-search')?.value || '').toLowerCase().trim();
    const roleVal = document.getElementById('admin-filter-role')?.value || '';
    const planVal = document.getElementById('admin-filter-plan')?.value || '';

    const filtered = adminUsersList.filter(u => {
      const matchSearch = !searchVal || (u.email && u.email.toLowerCase().includes(searchVal)) || (u.name && u.name.toLowerCase().includes(searchVal));
      const matchRole = !roleVal || u.role === roleVal;
      let matchPlan = true;
      if (planVal === 'VIP') matchPlan = (u.plan_code || '').includes('VIP');
      else if (planVal === 'PRO') matchPlan = (u.plan_code || '').includes('PRO');
      else if (planVal === 'FREE') matchPlan = !(u.plan_code || '').includes('VIP') && !(u.plan_code || '').includes('PRO');

      return matchSearch && matchRole && matchPlan;
    });

    renderAdminUsersTable(filtered);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ==========================================================================
     GLOBAL WINDOW EXPORTS & EVENT BINDINGS
     ========================================================================== */

  window.openCheckoutModal = openCheckoutModal;

  window.adminOpenGrantModal = function (userId, userEmail) {
    const modal = document.getElementById('admin-grant-modal');
    const idInput = document.getElementById('admin-grant-user-id');
    const emailInput = document.getElementById('admin-grant-user-email');
    const planSelect = document.getElementById('admin-grant-plan-select');
    const daysInput = document.getElementById('admin-grant-days');
    if (modal && idInput && emailInput) {
      idInput.value = userId;
      emailInput.value = userEmail;
      if (planSelect) planSelect.value = 'PRO_MONTHLY';
      if (daysInput) daysInput.value = '30';
      modal.style.display = 'flex';
    }
  };

  window.adminOpenResetPassModal = function (userId, userEmail) {
    const modal = document.getElementById('admin-reset-pass-modal');
    const idInput = document.getElementById('admin-reset-user-id');
    const emailInput = document.getElementById('admin-reset-user-email');
    if (modal && idInput && emailInput) {
      idInput.value = userId;
      emailInput.value = userEmail;
      modal.style.display = 'flex';
    }
  };

  window.adminToggleUserStatus = async function (userId, targetStatus) {
    const actionName = targetStatus === 'BANNED' ? 'khóa' : 'mở khóa';
    const confirmed = typeof window.showConfirmDialog === 'function' ? await window.showConfirmDialog({ title: 'Xác nhận thao tác', message: `Bạn có chắc chắn muốn ${actionName} tài khoản này không?`, type: 'danger' }) : confirm(`Bạn có chắc chắn muốn ${actionName} tài khoản này không?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ status: targetStatus })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Đã ${actionName} tài khoản thành công`, 'success');
        await loadAdminUsers();
        await loadAdminStats();
      } else {
        showNotification(data.error || 'Thao tác thất bại', 'danger');
      }
    } catch (e) {
      showNotification('Lỗi: ' + e.message, 'danger');
    }
  };

  window.adminApproveOrder = async function (orderId) {
    const confirmed = typeof window.showConfirmDialog === 'function' ? await window.showConfirmDialog({ title: 'Cấp Key Tự Động', message: `Xác nhận duyệt và cấp Key tự động từ lic.cgtdev.space cho đơn hàng ${orderId}?`, type: 'warning', confirmText: 'Duyệt & Cấp Key' }) : confirm(`Xác nhận duyệt và cấp Key tự động từ lic.cgtdev.space cho đơn hàng ${orderId}?`);
    if (!confirmed) return;

    try {
      const res = await fetch('/api/v1/admin/orders/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ orderId })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`🎉 Đã duyệt đơn và cấp Key: ${data.key}`, 'success');
        await loadAdminOrders();
        await loadAdminStats();
        await loadAdminUsers();
      } else {
        showNotification(data.error || 'Duyệt đơn thất bại', 'danger');
      }
    } catch (e) {
      showNotification('Lỗi duyệt đơn: ' + e.message, 'danger');
    }
  };

  // Helper copy functions
  window.copyText = function (elementId, btn) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const text = el.textContent.trim();
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.textContent;
      btn.textContent = '✓';
      setTimeout(() => { btn.textContent = orig; }, 1200);
    });
  };

  window.copyAmount = function (btn) {
    const val = document.getElementById('chk-amount-val')?.textContent || '';
    const cleanNum = val.replace(/\D/g, '');
    navigator.clipboard.writeText(cleanNum).then(() => {
      const orig = btn.textContent;
      btn.textContent = '✓';
      setTimeout(() => { btn.textContent = orig; }, 1200);
    });
  };

  window.copySuccessKey = function (btn) {
    const key = document.getElementById('chk-success-key-val')?.textContent || '';
    navigator.clipboard.writeText(key.trim()).then(() => {
      btn.textContent = '✓ Đã sao chép';
      setTimeout(() => { btn.textContent = 'Sao chép mã Key'; }, 1500);
    });
  };

  /* ==========================================================================
     DOM INITIALIZATION
     ========================================================================== */

  
  /**
   * Đồng bộ danh mục gói từ máy chủ lic.cgtdev.space
   */
  async function loadLicensePackages(forceRefresh = false) {
    if (isSyncingPackages) return;
    isSyncingPackages = true;

    const spinner = document.getElementById('sync-packages-spinner');
    const syncTimeEl = document.getElementById('license-sync-timestamp');
    const btnSync = document.getElementById('btn-sync-packages');

    if (spinner) spinner.classList.add('spin');
    if (btnSync) btnSync.disabled = true;
    if (syncTimeEl) syncTimeEl.textContent = forceRefresh ? 'Đang cập nhật từ máy chủ...' : 'Đang tải gói...';

    try {
      const url = forceRefresh ? '/api/v1/checkout/plans?refresh=1' : '/api/v1/checkout/plans';
      const res = await fetch(url, { headers: getAuthHeader() });
      const data = await res.json();

      if (data.success && Array.isArray(data.plans) && data.plans.length > 0) {
        cachedPlans = data.plans;
        window._omniCatalogPlans = data.plans;

        const now = new Date();
        const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (syncTimeEl) {
          syncTimeEl.innerHTML = `<span style="color: #10B981; font-weight: 600;">✓ Đã đồng bộ:</span> ${timeStr}`;
        }

        renderPackagesGridUI();
        renderCheckoutModalPills();

        if (forceRefresh) {
          showNotification('🎉 Đã đồng bộ thành công danh mục gói và tài khoản ngân hàng từ lic.cgtdev.space! Mọi tài khoản khác đã nhận dữ liệu mới nhất.', 'success');
        }
      } else {
        if (syncTimeEl) syncTimeEl.textContent = 'Gói mặc định hệ thống';
        renderPackagesGridUI();
      }
    } catch (err) {
      console.warn('[Checkout] Lỗi khi đồng bộ gói:', err.message);
      if (syncTimeEl) syncTimeEl.textContent = 'Ngoại tuyến (Offline)';
      renderPackagesGridUI();
    } finally {
      isSyncingPackages = false;
      if (spinner) spinner.classList.remove('spin');
      if (btnSync) btnSync.disabled = false;
    }
  }

  function getActivePlanKey() {
    const user = window.currentUser || null;
    if (user) {
      const code = String(user.plan_code || '').toUpperCase();
      const name = String(user.plan || '').toUpperCase();
      if (code === 'FREE' || code === 'FREE_TRIAL' || name.includes('FREE')) return 'FREE_TRIAL';
      if (code === 'PRO_MONTHLY' || code === 'PLUS' || name.includes('PLUS')) return 'PRO_MONTHLY';
      if (code === 'PRO' || code === 'VIP_LIFETIME' || code === 'VIP' || name.includes('PRO') || name.includes('VIP')) return 'PRO';
    }
    return 'FREE_TRIAL';
  }

  function renderPackagesGridUI() {
    const container = document.getElementById('packages-plan-grid');
    if (!container) return;

    const activeKey = getActivePlanKey();

    // 1. Thẻ Gói Free Thử Nghiệm
    const isFreeActive = activeKey === 'FREE_TRIAL';
    let html = `
      <div class="plan-card ${isFreeActive ? 'active' : ''}" data-plan="Free Trial" style="position: relative;">
        <div class="plan-header-row">
          <span class="plan-tag">Dùng Thử</span>
          ${isFreeActive ? '<span class="badge badge-active-green">ĐANG SỬ DỤNG</span>' : '<span class="badge badge-subtle-gray">Cơ Bản</span>'}
        </div>
        <div class="plan-name" style="margin-top: 6px;">Gói Free Thử Nghiệm</div>
        <p class="plan-desc">Tối đa 50 hồ sơ, đầy đủ vân tay & Chromium 153 Core</p>
        <div class="plan-price" style="margin-bottom: 12px;">0đ / vĩnh viễn</div>
        <div style="font-size: 12px; color: var(--text-muted); display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px;">
          <div>✓ 50 Hồ sơ Antidetect cơ bản</div>
          <div>✓ Nhân Chromium 153 Core (Pass 100% Iphey)</div>
          <div>✓ Quản lý Proxy & Tiện ích mở rộng</div>
          <div style="color: #94A3B8;">✕ Tính năng Đội Ngũ (Team) bị khóa</div>
        </div>
        ${isFreeActive ? `
          <button class="uiv-btn uiv-btn-secondary" style="width: 100%; margin-top: auto; padding: 10px; font-size: 13px; justify-content: center; background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.3); color: #10B981; cursor: default;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Gói Hiện Tại (Free)</span>
          </button>
        ` : `
          <button class="uiv-btn uiv-btn-secondary" style="width: 100%; margin-top: auto; padding: 10px; font-size: 13px; justify-content: center;" disabled>
            <span>Gói Mặc Định</span>
          </button>
        `}
      </div>
    `;

    // 2. Render các gói dịch vụ động từ lic.cgtdev.space
    const plansToRender = cachedPlans.length > 0 ? cachedPlans : [
      {
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

    plansToRender.forEach(p => {
      const isLifetime = Boolean(p.duration_days && p.duration_days >= 365);
      const isPro = (p.code && p.code.includes('PRO')) || (p.name && p.name.includes('Pro'));
      const isVip = isLifetime || isPro;
      const isMatch = (activeKey === 'PRO_MONTHLY' && !isPro) || (activeKey === 'PRO' && isPro);
      const tagText = p.tag || (isLifetime ? 'VIP Trọn Đời' : (isPro ? 'Gói Pro' : 'Phổ Biến'));
      const badgeText = p.badge || `${p.max_profiles} Hồ Sơ`;
      const durationDays = Number(p.duration_days) || 30;
      const periodStr = durationDays >= 3650 ? 'trọn đời (10 năm)' : (durationDays >= 365 ? `${Math.round(durationDays / 365)} năm` : `${durationDays} ngày`);
      const priceText = p.price_formatted || `${(p.price || 0).toLocaleString('vi-VN')} đ / ${periodStr}`;
      const ctaClass = isPro ? 'uiv-cta-emerald' : 'uiv-cta-primary';
      const kPrice = Math.round((p.price || 0) / 1000);

      const featuresHtml = (p.features || []).slice(0, 5).map(f => `<div>✓ ${escapeHtml(f)}</div>`).join('');

      html += `
        <div class="plan-card ${isMatch ? 'active' : ''}" data-plan="${escapeHtml(p.code)}" style="position: relative;">
          <div class="plan-header-row">
            <span class="plan-tag ${isVip ? 'vip' : 'popular'}">
              ${isVip ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' : ''}
              <span>${escapeHtml(tagText)}</span>
            </span>
            ${isMatch ? '<span class="badge badge-active-green">ĐANG SỬ DỤNG</span>' : `<span class="badge ${isVip ? 'badge-subtle-blue' : 'badge-subtle-blue'}">${escapeHtml(badgeText)}</span>`}
          </div>
          <div class="plan-name" style="margin-top: 6px;">${escapeHtml(p.name)}</div>
          <p class="plan-desc">${escapeHtml(p.description || '')}</p>
          <div class="plan-price ${isVip ? 'green' : 'highlight'}" style="margin-bottom: 12px;">${priceText}</div>
          <div style="font-size: 12px; color: var(--text-muted); display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px;">
            ${featuresHtml}
          </div>
          ${isMatch ? `
            <button class="uiv-btn uiv-btn-secondary" style="width: 100%; margin-top: auto; padding: 10px; font-size: 13px; justify-content: center; background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.3); color: #10B981; cursor: default;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Gói Đang Hoạt Động</span>
            </button>
          ` : `
            <button class="${ctaClass} btn-buy-plan" data-plan="${escapeHtml(p.code)}" style="width: 100%; margin-top: auto; padding: 10px; font-size: 13.5px; justify-content: center; cursor: pointer;">
              ${isVip ? `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>
                <span>Mua ${escapeHtml(p.name)} (${kPrice}K)</span>
              ` : `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <span>Mua ${escapeHtml(p.name)} (${kPrice}K)</span>
              `}
            </button>
          `}
        </div>
      `;
    });

    container.innerHTML = html;

    // Attach click handlers to buy buttons
    container.querySelectorAll('.btn-buy-plan').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const pCode = btn.dataset.plan || 'PRO_MONTHLY';
        openCheckoutModal(pCode);
      };
    });
  }

  function renderCheckoutModalPills() {
    const switcher = document.getElementById('chk-modal-plan-switcher') || document.querySelector('.checkout-plan-switcher');
    if (!switcher) return;

    const plansToRender = cachedPlans.length > 0 ? cachedPlans : [
      { code: 'PRO_MONTHLY', name: 'OmniBrowser Plus', price: 3000, duration_days: 30 },
      { code: 'PRO', name: 'OmniBrowser Pro', price: 3000, duration_days: 30 }
    ];

    switcher.innerHTML = plansToRender.map(p => {
      const isPro = (p.code && p.code.includes('PRO')) || (p.name && p.name.includes('Pro'));
      const isMatch = p.code === currentCheckoutPlan || 
        (currentCheckoutPlan === 'PRO_MONTHLY' && !isPro) ||
        ((currentCheckoutPlan === 'PRO' || currentCheckoutPlan === 'VIP_LIFETIME') && isPro);
      const color = isPro ? '#10B981' : '#2563EB';
      const durationDays = Number(p.duration_days) || 30;
      const periodStr = durationDays >= 3650 ? '10 năm (Trọn đời)' : (durationDays >= 365 ? `${Math.round(durationDays / 365)} năm` : `${durationDays} ngày`);

      return `
        <div class="checkout-plan-pill ${isMatch ? 'active' : ''}" data-plan="${escapeHtml(p.code)}" style="cursor: pointer;">
          <div style="font-weight: 700; font-size: 13.5px;">${escapeHtml(p.name)}</div>
          <div style="font-size: 12px; color: ${color}; font-weight: 600;">${(p.price || 0).toLocaleString('vi-VN')} đ / ${periodStr}</div>
        </div>
      `;
    }).join('');

    switcher.querySelectorAll('.checkout-plan-pill').forEach(pill => {
      pill.onclick = () => {
        const pCode = pill.dataset.plan;
        currentCheckoutPlan = pCode;
        updatePlanPillUI(pCode);
        generateCheckoutOrder();
      };
    });
  }

  window.loadLicensePackages = loadLicensePackages;
  window.renderPackagesGridUI = renderPackagesGridUI;

  function initAdminAndCheckoutDOM() {
    // Topbar upgrade button: Link directly to "Bản quyền & Gói" tab
    const btnHeaderUpgrade = document.getElementById('btn-header-upgrade');
    if (btnHeaderUpgrade) {
      btnHeaderUpgrade.onclick = () => {
        if (typeof switchTab === 'function') switchTab('license');
        const pkgTab = document.querySelector('.plan-tab[data-subtab="packages"]');
        if (pkgTab) pkgTab.click();
      };
    }

    // Poly dropdown upgrade: Link directly to "Bản quyền & Gói" tab
    const menuUpgrade = document.getElementById('poly-menu-upgrade');
    if (menuUpgrade) {
      menuUpgrade.onclick = () => {
        const dropdown = document.getElementById('poly-dropdown-menu');
        if (dropdown) dropdown.classList.remove('show');
        if (typeof switchTab === 'function') switchTab('license');
        const pkgTab = document.querySelector('.plan-tab[data-subtab="packages"]');
        if (pkgTab) pkgTab.click();
      };
    }

    const menuAdmin = document.getElementById('poly-menu-admin');
    if (menuAdmin) {
      menuAdmin.onclick = () => {
        const dropdown = document.getElementById('poly-dropdown-menu');
        if (dropdown) dropdown.classList.remove('show');
        if (typeof switchTab === 'function') switchTab('admin');
      };
    }

    // Sidebar admin nav item
        // Sync packages button in view-license
    const btnSyncPackages = document.getElementById('btn-sync-packages');
    if (btnSyncPackages) {
      btnSyncPackages.onclick = () => loadLicensePackages(true);
    }

    const btnAdminSync = document.getElementById('btn-admin-sync-server');
    const adminSyncSpinner = document.getElementById('admin-sync-spinner');
    if (btnAdminSync) {
      btnAdminSync.onclick = async () => {
        if (adminSyncSpinner) adminSyncSpinner.classList.add('spin');
        btnAdminSync.disabled = true;
        try {
          await loadLicensePackages(true);
        } finally {
          if (adminSyncSpinner) adminSyncSpinner.classList.remove('spin');
          btnAdminSync.disabled = false;
        }
      };
    }
    loadLicensePackages(false);

    const navAdmin = document.getElementById('nav-item-admin');
    if (navAdmin) {
      navAdmin.onclick = () => {
        if (typeof switchTab === 'function') switchTab('admin');
      };
    }

    // Package cards buttons in view-license
    document.querySelectorAll('.btn-buy-plan').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const plan = btn.dataset.plan || 'PRO_MONTHLY';
        if (plan === 'FREE_TRIAL') {
          showNotification('Bạn đang sử dụng gói Free Trial.', 'info');
        } else {
          openCheckoutModal(plan);
        }
      };
    });

    const btnOpenCheckout = document.querySelector('.btn-open-checkout');
    if (btnOpenCheckout) {
      btnOpenCheckout.onclick = () => openCheckoutModal('PRO_MONTHLY');
    }

    
    // Modal close & pills
    const chkModal = document.getElementById('checkout-modal');
    const chkClose = document.getElementById('checkout-modal-close');
    const btnFinish = document.getElementById('btn-chk-finish');
    const btnGotoLic = document.getElementById('btn-chk-goto-license');
    if (chkClose) chkClose.onclick = () => { stopOrderPolling(); if (chkModal) chkModal.style.display = 'none'; };
    if (btnFinish) {
      btnFinish.onclick = () => {
        stopOrderPolling();
        if (chkModal) chkModal.style.display = 'none';
        if (typeof switchTab === 'function') switchTab('profiles');
      };
    }
    if (btnGotoLic) {
      btnGotoLic.onclick = () => {
        stopOrderPolling();
        if (chkModal) chkModal.style.display = 'none';
        if (typeof switchTab === 'function') switchTab('license');
      };
    }

    const btnCopy = document.getElementById('btn-copy-success-key');
    if (btnCopy) {
      btnCopy.onclick = () => {
        const keyVal = document.getElementById('chk-success-key-val')?.textContent || '';
        navigator.clipboard.writeText(keyVal.trim()).then(() => {
          const textSpan = document.getElementById('btn-copy-text') || btnCopy.querySelector('span');
          if (textSpan) textSpan.textContent = '✓ Đã Sao Chép!';
          if (typeof showToast === 'function') showToast('✓ Đã sao chép mã License Key!', 'success');
          setTimeout(() => {
            if (textSpan) textSpan.textContent = 'Sao Chép Mã Key';
          }, 2000);
        });
      };
    }

    const btnDownload = document.getElementById('btn-download-success-key');
    if (btnDownload) {
      btnDownload.onclick = () => {
        const keyVal = document.getElementById('chk-success-key-val')?.textContent || '';
        const planName = document.getElementById('chk-success-plan-name')?.textContent || 'OmniBrowser Pro';
        const userName = document.getElementById('chk-success-user-name')?.textContent || 'Khách hàng';
        const userEmail = document.getElementById('chk-success-user-email')?.textContent || '';
        const dateStr = new Date().toLocaleString('vi-VN');

        const fileData = `=====================================================
OMNIBROWSER - THÔNG TIN BẢN QUYỀN CHÍNH THỨC
=====================================================

Khách hàng:      ${userName}
Email đăng ký:   ${userEmail}
Gói bản quyền:   ${planName}
Mã License Key:  ${keyVal}
Ngày kích hoạt:  ${dateStr}
Máy chủ cấp phép: https://lic.cgtdev.space

HƯỚNG DẪN SỬ DỤNG:
1. Bản quyền đã được kích hoạt trực tiếp vào phần mềm OmniBrowser trên máy tính này.
2. Khi chuyển sang máy tính mới hoặc cài lại hệ điều hành:
   - Mở OmniBrowser -> Vào mục "Bản Quyền & Gói"
   - Chọn "Kích Hoạt License Key" và nhập mã License Key ở trên.
3. Liên hệ hỗ trợ kỹ thuật 24/7 trực tiếp từ CGT Dev:
   - Zalo: 0394085700
   - Email: phamduccgt18@gmail.com

Cảm ơn bạn đã tin dùng OmniBrowser!
=====================================================`;

        const blob = new Blob([fileData], { type: 'text/plain;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `OmniBrowser-License-${keyVal.replace(/[^A-Za-z0-9_-]/g, '') || 'Key'}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        if (typeof showToast === 'function') showToast('✓ Đã tải file bản quyền (.txt) về máy!', 'success');
      };
    }


    const btnSwitchLogin = document.getElementById('chk-btn-switch-login');
    if (btnSwitchLogin) {
      btnSwitchLogin.onclick = () => {
        if (chkModal) chkModal.style.display = 'none';
        const authModal = document.getElementById('auth-modal');
        if (authModal) authModal.style.display = 'flex';
      };
    }

    const pillPro = document.getElementById('chk-pill-pro');
    const pillVip = document.getElementById('chk-pill-vip');
    if (pillPro) {
      pillPro.onclick = () => {
        currentCheckoutPlan = 'PRO_MONTHLY';
        updatePlanPillUI('PRO_MONTHLY');
        generateCheckoutOrder();
      };
    }
    if (pillVip) {
      pillVip.onclick = () => {
        currentCheckoutPlan = 'VIP_LIFETIME';
        updatePlanPillUI('VIP_LIFETIME');
        generateCheckoutOrder();
      };
    }

    // Confirm payment button
    const btnConfirmPayment = document.getElementById('btn-chk-confirm-payment');
    if (btnConfirmPayment) {
      btnConfirmPayment.onclick = confirmPayment;
    }

    // Copy buttons inside checkout
    const btnCopyAcc = document.getElementById('chk-btn-copy-acc');
    if (btnCopyAcc) btnCopyAcc.onclick = () => copyText('chk-acc-num', btnCopyAcc);
    const btnCopyAmount = document.getElementById('chk-btn-copy-amount');
    if (btnCopyAmount) btnCopyAmount.onclick = () => copyAmount(btnCopyAmount);
    const btnCopyContent = document.getElementById('chk-btn-copy-content');
    if (btnCopyContent) btnCopyContent.onclick = () => copyText('chk-transfer-content', btnCopyContent);
    const btnCopySuccessKey = document.getElementById('btn-copy-success-key');
    if (btnCopySuccessKey) btnCopySuccessKey.onclick = () => copySuccessKey(btnCopySuccessKey);

    // Admin toolbar search & filters
    const searchInput = document.getElementById('admin-user-search');
    const filterRole = document.getElementById('admin-filter-role');
    const filterPlan = document.getElementById('admin-filter-plan');
    if (searchInput) searchInput.oninput = filterAdminUsers;
    if (filterRole) filterRole.onchange = filterAdminUsers;
    if (filterPlan) filterPlan.onchange = filterAdminUsers;

    // Admin refresh
    const btnAdminRefresh = document.getElementById('btn-admin-refresh');
    if (btnAdminRefresh) btnAdminRefresh.onclick = loadAdminData;

    // Admin open grant
    const btnAdminOpenGrant = document.getElementById('btn-admin-open-grant');
    if (btnAdminOpenGrant) {
      btnAdminOpenGrant.onclick = () => {
        if (adminUsersList.length > 0) {
          const firstUser = adminUsersList[0];
          window.adminOpenGrantModal(firstUser.id, firstUser.email);
        } else {
          showNotification('Không có người dùng nào để cấp', 'warning');
        }
      };
    }

    // Admin Subtabs: Users vs Orders
    document.querySelectorAll('.admin-subtab-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.admin-subtab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.adminTab;
        const secUsers = document.getElementById('admin-sec-users');
        const secOrders = document.getElementById('admin-sec-orders');
        if (tab === 'users') {
          if (secUsers) secUsers.style.display = 'block';
          if (secOrders) secOrders.style.display = 'none';
          loadAdminUsers();
        } else if (tab === 'orders') {
          if (secUsers) secUsers.style.display = 'none';
          if (secOrders) secOrders.style.display = 'block';
          loadAdminOrders();
        }
      };
    });

    // Admin Grant Modal Actions
    const grantModal = document.getElementById('admin-grant-modal');
    const grantClose = document.getElementById('admin-grant-close');
    const grantCancel = document.getElementById('btn-admin-grant-cancel');
    const grantSubmit = document.getElementById('btn-admin-grant-submit');
    const grantPlanSelect = document.getElementById('admin-grant-plan-select');
    const grantDaysInput = document.getElementById('admin-grant-days');

    if (grantPlanSelect && grantDaysInput) {
      grantPlanSelect.onchange = () => {
        if (grantPlanSelect.value === 'PRO_MONTHLY') {
          grantDaysInput.value = '30';
        } else if (grantPlanSelect.value === 'VIP_LIFETIME') {
          grantDaysInput.value = '3650';
        } else if (grantPlanSelect.value === 'FREE_TRIAL') {
          grantDaysInput.value = '0';
        }
      };
    }

    function closeGrantModal() {
      if (grantModal) grantModal.style.display = 'none';
    }
    if (grantClose) grantClose.onclick = closeGrantModal;
    if (grantCancel) grantCancel.onclick = closeGrantModal;

    if (grantSubmit) {
      grantSubmit.onclick = async () => {
        const userId = document.getElementById('admin-grant-user-id')?.value;
        const planCode = document.getElementById('admin-grant-plan-select')?.value;
        const durationDays = parseInt(document.getElementById('admin-grant-days')?.value, 10) || 3650;

        if (!userId) return;
        grantSubmit.disabled = true;
        grantSubmit.textContent = 'Đang cấp gói...';

        try {
          const res = await fetch(`/api/v1/admin/users/${userId}/plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify({ planCode, durationDays })
          });

          const data = await res.json();
          if (data.success) {
            showNotification(`🎉 Cấp gói thành công! Key: ${data.key || 'Mặc định'}`, 'success');
            closeGrantModal();
            await loadAdminUsers();
            await loadAdminStats();
          } else {
            showNotification(data.error || 'Cấp gói thất bại', 'danger');
          }
        } catch (e) {
          showNotification('Lỗi cấp gói: ' + e.message, 'danger');
        } finally {
          grantSubmit.disabled = false;
          grantSubmit.textContent = 'Xác Nhận Cấp Gói';
        }
      };
    }

    // Admin Reset Password Modal Actions
    const resetModal = document.getElementById('admin-reset-pass-modal');
    const resetClose = document.getElementById('admin-reset-pass-close');
    const resetCancel = document.getElementById('btn-admin-reset-cancel');
    const resetSubmit = document.getElementById('btn-admin-reset-submit');

    function closeResetModal() {
      if (resetModal) resetModal.style.display = 'none';
    }
    if (resetClose) resetClose.onclick = closeResetModal;
    if (resetCancel) resetCancel.onclick = closeResetModal;

    if (resetSubmit) {
      resetSubmit.onclick = async () => {
        const userId = document.getElementById('admin-reset-user-id')?.value;
        const newPassword = document.getElementById('admin-reset-new-password')?.value;

        if (!userId || !newPassword) {
          showNotification('Vui lòng nhập mật khẩu mới', 'warning');
          return;
        }

        resetSubmit.disabled = true;
        resetSubmit.textContent = 'Đang lưu...';

        try {
          const res = await fetch(`/api/v1/admin/users/${userId}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify({ newPassword })
          });

          const data = await res.json();
          if (data.success) {
            showNotification(`Đã đặt lại mật khẩu mới: ${newPassword}`, 'success');
            closeResetModal();
          } else {
            showNotification(data.error || 'Đổi mật khẩu thất bại', 'danger');
          }
        } catch (e) {
          showNotification('Lỗi: ' + e.message, 'danger');
        } finally {
          resetSubmit.disabled = false;
          resetSubmit.textContent = 'Lưu Mật Khẩu';
        }
      };
    }
  }

  // Hook into auth render to toggle admin menu items
  const originalRenderProfile = window.renderPolyUserProfile;
  window.renderPolyUserProfile = function (user) {
    if (typeof originalRenderProfile === 'function') originalRenderProfile(user);
    const navAdmin = document.getElementById('nav-item-admin');
    const menuAdmin = document.getElementById('poly-menu-admin');
    const planTabAdmin = document.getElementById('plan-tab-admin');
    const isAdmin = user && user.role === 'admin';
    if (navAdmin) navAdmin.style.display = isAdmin ? 'flex' : 'none';
    if (menuAdmin) menuAdmin.style.display = isAdmin ? 'flex' : 'none';
    if (planTabAdmin) planTabAdmin.style.display = isAdmin ? 'flex' : 'none';
  };

  // Hook into switchTab to trigger loadAdminData when switching to admin tab
  const originalSwitchTab = window.switchTab;
  window.switchTab = function (tabId) {
    if (tabId === 'admin') {
      const user = window.currentUser;
      if (!user || user.role !== 'admin') {
        if (typeof showToast === 'function') showToast('Bạn không có quyền truy cập trang Quản Trị Admin', 'warning');
        if (typeof originalSwitchTab === 'function') originalSwitchTab('profiles');
        return;
      }
      loadAdminData();
    }
    if (typeof originalSwitchTab === 'function') originalSwitchTab(tabId);
  };

  // Run DOM initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminAndCheckoutDOM);
  } else {
    initAdminAndCheckoutDOM();
  }
})();
