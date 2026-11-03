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

  function getAuthHeader() {
    const token = localStorage.getItem('cgt_auth_token') || (typeof getAuthToken === 'function' ? getAuthToken() : '');
    return token ? { 'Authorization': 'Bearer ' + token } : {};
  }

  function showNotification(msg, type = 'info') {
    if (typeof showToast === 'function') {
      showToast(msg, type);
    } else {
      alert(msg);
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

    // Check if user is logged in
    const user = window.currentUser;
    const boxLoggedIn = document.getElementById('chk-customer-logged-in');
    const boxGuest = document.getElementById('chk-customer-guest');
    const userAvatar = document.getElementById('chk-user-avatar');
    const userName = document.getElementById('chk-user-name');
    const userEmail = document.getElementById('chk-user-email');
    const emailInput = document.getElementById('chk-customer-email');

    if (user && user.email) {
      if (boxLoggedIn) boxLoggedIn.style.display = 'block';
      if (boxGuest) boxGuest.style.display = 'none';
      const initial = (user.name || user.email || 'U')[0].toUpperCase();
      if (userAvatar) userAvatar.textContent = initial;
      if (userName) userName.textContent = user.name || user.email.split('@')[0];
      if (userEmail) userEmail.textContent = user.email;
      if (emailInput) emailInput.value = user.email;
    } else {
      if (boxLoggedIn) boxLoggedIn.style.display = 'none';
      if (boxGuest) boxGuest.style.display = 'block';
    }

    modal.style.display = 'flex';
    await generateCheckoutOrder();
  }

  function updatePlanPillUI(planCode) {
    const pillPro = document.getElementById('chk-pill-pro');
    const pillVip = document.getElementById('chk-pill-vip');
    if (pillPro) pillPro.classList.toggle('active', planCode === 'PRO_MONTHLY');
    if (pillVip) pillVip.classList.toggle('active', planCode === 'VIP_LIFETIME');

    const tag = document.getElementById('chk-plan-tag');
    const name = document.getElementById('chk-plan-name');
    const price = document.getElementById('chk-plan-price');
    const period = document.getElementById('chk-plan-period');
    const featList = document.getElementById('chk-features-list');

    if (planCode === 'VIP_LIFETIME') {
      if (tag) { tag.textContent = 'VIP Trọn Đời'; tag.style.background = 'rgba(16, 185, 129, 0.2)'; tag.style.color = '#10B981'; }
      if (name) name.textContent = 'OmniBrowser VIP Vĩnh Viễn';
      if (price) { price.textContent = '1.990.000 đ'; price.style.color = '#10B981'; }
      if (period) period.textContent = 'Thời hạn: 10 năm (Trọn đời) • 2.000 Hồ sơ';
      if (featList) {
        featList.innerHTML = `
          <div class="chk-feat-item">✓ 2.000 Hồ sơ Antidetect không giới hạn thời gian</div>
          <div class="chk-feat-item">✓ Chạy đồng thời tối đa 50 luồng hiệu suất cao</div>
          <div class="chk-feat-item">✓ Đồng bộ dữ liệu đám mây Cloud Sync không giới hạn</div>
          <div class="chk-feat-item">✓ Toàn quyền kho Tiện ích Chrome & Proxy Manager</div>
          <div class="chk-feat-item">✓ Hỗ trợ kỹ thuật 24/7 trực tiếp từ CGT Dev</div>
        `;
      }
    } else {
      if (tag) { tag.textContent = 'Phổ Biến'; tag.style.background = 'rgba(37, 99, 235, 0.2)'; tag.style.color = '#60A5FA'; }
      if (name) name.textContent = 'OmniBrowser Pro';
      if (price) { price.textContent = '199.000 đ'; price.style.color = '#60A5FA'; }
      if (period) period.textContent = 'Thời hạn: 30 ngày (Gia hạn hàng tháng) • 500 Hồ sơ';
      if (featList) {
        featList.innerHTML = `
          <div class="chk-feat-item">✓ 500 Hồ sơ Antidetect cao cấp độc lập</div>
          <div class="chk-feat-item">✓ Chạy đồng thời tối đa 20 luồng</div>
          <div class="chk-feat-item">✓ Đồng bộ hóa thao tác chuột & phím</div>
          <div class="chk-feat-item">✓ Nhân MyBrowser 153 Core (Pass 100% Iphey)</div>
          <div class="chk-feat-item">✓ Tự động xoay Proxy 4G / IPv6</div>
        `;
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
    const email = (emailInput && emailInput.value.trim()) || (window.currentUser ? window.currentUser.email : 'guest@cgt.vn');
    const name = (nameInput && nameInput.value.trim()) || (window.currentUser ? window.currentUser.name : 'Khách Hàng');

    try {
      const res = await fetch('/api/v1/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          email,
          name,
          planCode: currentCheckoutPlan
        })
      });

      const data = await res.json();
      if (data.success && data.order) {
        currentOrder = data.order;
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
        showNotification('🎉 Chúc mừng! Gói bản quyền đã được kích hoạt thành công.', 'success');

        // Switch to success step in modal
        const stepPayment = document.getElementById('checkout-step-payment');
        const stepSuccess = document.getElementById('checkout-step-success');
        const keyDisplay = document.getElementById('chk-success-key-val');

        if (stepPayment) stepPayment.style.display = 'none';
        if (stepSuccess) stepSuccess.style.display = 'block';
        if (keyDisplay) keyDisplay.textContent = data.key || currentOrder.license_key || 'OMNI-ACTIVE';

        // Refresh global user state and license status
        if (typeof checkAuthState === 'function') checkAuthState();
        if (typeof fetchLicense === 'function') fetchLicense();
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
        planBadge = `<span class="badge badge-emerald-solid">👑 VIP Vĩnh Viễn</span>`;
      } else if ((u.plan_code || '').includes('PRO')) {
        planBadge = `<span class="badge badge-subtle-blue">⚡ Pro 30 Ngày</span>`;
      }

      const statusBadge = isBanned
        ? `<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #EF4444; font-weight:700;">ĐÃ KHÓA</span>`
        : `<span class="badge badge-running"><span class="badge-pulse"></span> Hoạt động</span>`;

      const keyText = u.license_key ? `<span class="mono-code" style="font-size:11.5px;">${u.license_key}</span>` : `<span style="color:var(--text-muted); font-size:12px;">—</span>`;
      const createdDate = u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '—';
      const expiresText = u.expires_at ? new Date(u.expires_at).toLocaleDateString('vi-VN') : (u.plan_code?.includes('VIP') ? 'Vĩnh viễn' : 'Vô hạn');

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
          <td style="font-size:12px;">${expiresText}</td>
          <td>${statusBadge}</td>
          <td style="font-size:12px; color:var(--text-muted);">${createdDate}</td>
          <td style="text-align: right;">
            <div class="admin-action-group">
              <button class="admin-action-btn btn-grant" onclick="window.adminOpenGrantModal('${u.id}', '${escapeHtml(u.email)}')">
                <span>⚡ Cấp Gói</span>
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
    if (modal && idInput && emailInput) {
      idInput.value = userId;
      emailInput.value = userEmail;
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
    if (!confirm(`Bạn có chắc chắn muốn ${actionName} tài khoản này không?`)) return;

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
    if (!confirm(`Xác nhận duyệt và cấp Key tự động từ lic.cgtdev.space cho đơn hàng ${orderId}?`)) return;

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

  function initAdminAndCheckoutDOM() {
    // Topbar upgrade button
    const btnHeaderUpgrade = document.getElementById('btn-header-upgrade');
    if (btnHeaderUpgrade) {
      btnHeaderUpgrade.onclick = () => openCheckoutModal('PRO_MONTHLY');
    }

    // Poly dropdown upgrade & admin items
    const menuUpgrade = document.getElementById('poly-menu-upgrade');
    if (menuUpgrade) {
      menuUpgrade.onclick = () => {
        const dropdown = document.getElementById('poly-dropdown-menu');
        if (dropdown) dropdown.classList.remove('show');
        openCheckoutModal('PRO_MONTHLY');
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
    if (chkClose) chkClose.onclick = () => { if (chkModal) chkModal.style.display = 'none'; };
    if (btnFinish) btnFinish.onclick = () => { if (chkModal) chkModal.style.display = 'none'; };

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
    const isAdmin = user && user.role === 'admin';
    if (navAdmin) navAdmin.style.display = isAdmin ? 'flex' : 'none';
    if (menuAdmin) menuAdmin.style.display = isAdmin ? 'flex' : 'none';
  };

  // Hook into switchTab to trigger loadAdminData when switching to admin tab
  const originalSwitchTab = window.switchTab;
  window.switchTab = function (tabId) {
    if (typeof originalSwitchTab === 'function') originalSwitchTab(tabId);
    if (tabId === 'admin') {
      loadAdminData();
    }
  };

  // Run DOM initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminAndCheckoutDOM);
  } else {
    initAdminAndCheckoutDOM();
  }
})();
