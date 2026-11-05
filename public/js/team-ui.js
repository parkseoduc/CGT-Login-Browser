/**
 * CGT-Login / OmniBrowser - Team Member Management & Shared Workspaces (Lượt 3)
 * Module: public/js/team-ui.js
 * Phân Tầng Gói SaaS: Free (Khóa tính năng) vs Plus (5 Seats) vs Pro (Full Enterprise)
 * Phân Quyền Đa Tầng (RBAC: Admin / Leader / Staff)
 */

(function () {
  'use strict';

  const API_BASE = '/api/v1';
  let teamMembers = [];
  let availableGroups = [];
  let editingMemberId = null;
  let isInitialized = false;

  // Active Role & Plan Previews (Allows instant switching to test Free / Plus / Pro & Admin / Leader / Staff)
  let activePreviewRole = null;
  let activePreviewPlan = null;

  // DOM Elements
  const el = {
    view: document.getElementById('view-team'),
    lockedPaywall: document.getElementById('team-locked-paywall'),
    activeWorkspace: document.getElementById('team-active-workspace'),

    tableBody: document.getElementById('team-table-body'),
    totalMembers: document.getElementById('stat-team-total'),
    totalLeaders: document.getElementById('stat-team-leaders'),
    totalStaff: document.getElementById('stat-team-staff'),
    searchInput: document.getElementById('team-search-input'),
    btnSearchClear: document.getElementById('btn-team-search-clear'),
    filterRole: document.getElementById('team-filter-role'),
    btnAdd: document.getElementById('btn-add-team-member'),
    btnRefresh: document.getElementById('btn-team-refresh'),
    rolePreviewBar: document.getElementById('team-role-preview-bar'),
    planPreviewBar: document.getElementById('team-plan-preview-bar'),
    roleCurrentLabel: document.getElementById('team-role-current-label'),

    // Modal
    modal: document.getElementById('modal-team-member'),
    modalTitle: document.getElementById('modal-team-member-title'),
    btnClose: document.getElementById('modal-team-member-close-btn'),
    btnCancel: document.getElementById('modal-team-member-cancel-btn'),
    btnSave: document.getElementById('modal-team-member-save-btn'),
    formName: document.getElementById('team-form-name'),
    formEmail: document.getElementById('team-form-email'),
    formPassword: document.getElementById('team-form-password'),
    formRole: document.getElementById('team-form-role'),
    groupsContainer: document.getElementById('team-form-groups-container'),

    // Toggles
    toggleSafeLaunch: document.getElementById('team-toggle-safe-launch'),
    toggleCanCreate: document.getElementById('team-toggle-can-create'),
    toggleCanEdit: document.getElementById('team-toggle-can-edit'),
    toggleCanDelete: document.getElementById('team-toggle-can-delete'),
  };

  function toast(msg, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, type);
    } else {
      console.log(`[Toast ${type}]`, msg);
    }
  }

  function getBaseUserPlan() {
    const cu = window.currentUser || null;
    if (!cu) return 'pro';
    if (cu.member_id && cu.owner_id) return 'pro'; // Team member inherits leader's unlocked plan
    const code = String(cu.plan_code || '').toUpperCase();
    const name = String(cu.plan || '').toUpperCase();
    if (code === 'FREE' || code === 'FREE_TRIAL' || name.includes('FREE')) return 'free';
    if (code === 'PLUS' || code === 'PRO_MONTHLY' || name.includes('PLUS') || code.includes('MONTHLY')) return 'plus';
    return 'pro';
  }

  function getEffectivePlan() {
    return getBaseUserPlan();
  }

  function isTeamUnlocked() {
    return getEffectivePlan() !== 'free';
  }

  function getBaseUserRole() {
    const cu = window.currentUser || null;
    if (!cu) return 'admin';
    if (cu.role === 'staff' || cu.safe_launch_mode) return 'staff';
    if (cu.role === 'leader') return 'leader';
    if (cu.role === 'admin') return 'admin';
    if (!cu.member_id) return 'admin'; // Workspace Owner
    return 'staff';
  }

  function getEffectiveRole() {
    return activePreviewRole || getBaseUserRole();
  }

  function getRequestHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const effRole = getEffectiveRole();
    const effPlan = getEffectivePlan();
    if (effRole) headers['x-team-preview-role'] = effRole;
    // Strictly driven by authenticated JWT session user
    return headers;
  }

  async function fetchGroups() {
    try {
      const res = await fetch(`${API_BASE}/groups`);
      const data = await res.json();
      if (data && data.success && Array.isArray(data.groups)) {
        availableGroups = data.groups;
      }
    } catch (err) {
      console.warn('[TeamUI] Lỗi tải nhóm hồ sơ:', err);
    }
  }

  async function fetchMembers() {
    const unlocked = isTeamUnlocked();
    updatePlanUI();

    if (!unlocked) {
      // Free plan: Feature is locked
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/team/members`, {
        headers: getRequestHeaders()
      });
      const data = await res.json();

      if (res.status === 403 && data.featureLocked) {
        // Server rejected due to free tier
        activePreviewPlan = 'free';
        updatePlanUI();
        return;
      }

      if (data && data.success && Array.isArray(data.members)) {
        teamMembers = data.members;
        updateStats();
        updateRoleUI();
        renderTable();
      }
    } catch (err) {
      toast('Lỗi khi tải danh sách thành viên đội ngũ', 'danger');
    }
  }

  function updatePlanUI() {
    const plan = getEffectivePlan();
    const unlocked = plan !== 'free';

    // 1. Toggle Locked Paywall vs Active Workspace
    if (el.lockedPaywall) {
      el.lockedPaywall.style.display = unlocked ? 'none' : 'block';
    }
    if (el.activeWorkspace) {
      el.activeWorkspace.style.display = unlocked ? 'block' : 'none';
    }

    // 2. Highlight Plan Switcher Buttons
    document.querySelectorAll('.team-test-plan-btn').forEach(btn => {
      const btnPlan = btn.dataset.testPlan;
      const isActive = btnPlan === plan;
      btn.classList.toggle('active', isActive);
      if (isActive) {
        if (btnPlan === 'free') {
          btn.style.background = '#64748b';
          btn.style.color = '#ffffff';
        } else if (btnPlan === 'plus') {
          btn.style.background = '#2563eb';
          btn.style.color = '#ffffff';
        } else {
          btn.style.background = '#10b981';
          btn.style.color = '#ffffff';
        }
      } else {
        btn.style.background = 'transparent';
        btn.style.color = 'var(--text-muted)';
      }
    });

    // 3. Plan quota badge in header
    const planBadge = document.querySelector('#view-team .badge-subtle-blue');
    if (planBadge) {
      if (plan === 'plus') {
        planBadge.innerText = 'Gói Plus (Tối đa 5 Thành Viên)';
        planBadge.className = 'badge';
        planBadge.style.background = 'rgba(37, 99, 235, 0.12)';
        planBadge.style.color = '#2563eb';
      } else if (plan === 'pro') {
        planBadge.innerText = 'Gói Pro (Không Giới Hạn Thành Viên)';
        planBadge.className = 'badge';
        planBadge.style.background = 'rgba(16, 185, 129, 0.12)';
        planBadge.style.color = '#059669';
      }
    }
  }

  function updateStats() {
    const total = teamMembers.length;
    const leaders = teamMembers.filter(m => m.role === 'leader').length;
    const staff = teamMembers.filter(m => m.role === 'staff').length;
    const plan = getEffectivePlan();

    if (el.totalMembers) {
      if (plan === 'plus') {
        el.totalMembers.innerHTML = `${total} <span style="font-size: 14px; font-weight: 500; color: var(--text-muted);">/ 5 ghế</span>`;
      } else {
        el.totalMembers.innerText = total;
      }
    }
    if (el.totalLeaders) el.totalLeaders.innerText = leaders;
    if (el.totalStaff) el.totalStaff.innerText = staff;
  }

  function updateRoleUI() {
    const role = getEffectiveRole();
    const plan = getEffectivePlan();

    // 1. Update Preview Buttons highlight
    if (el.rolePreviewBar) {
      el.rolePreviewBar.querySelectorAll('.team-preview-role-btn').forEach(btn => {
        const pRole = btn.dataset.previewRole;
        const isActive = pRole === role;
        btn.classList.toggle('active', isActive);
        if (isActive) {
          if (pRole === 'admin') btn.style.background = '#6366f1';
          else if (pRole === 'leader') btn.style.background = '#059669';
          else btn.style.background = '#2563eb';
          btn.style.color = '#ffffff';
        } else {
          btn.style.background = 'transparent';
          btn.style.color = 'var(--text-muted)';
        }
      });
    }

    // 2. Update Role current label
    if (el.roleCurrentLabel) {
      if (role === 'staff') {
        el.roleCurrentLabel.innerHTML = '<b>Quyền: Nhân Viên (Staff)</b> — <span style="color:#ef4444; font-weight:600;">Chế độ Chỉ Xem (Read-only)</span>';
      } else if (role === 'leader') {
        el.roleCurrentLabel.innerHTML = '<b>Quyền: Trưởng Nhóm (Leader)</b> — <span style="color:#059669; font-weight:600;">Quản lý Nhân Viên Staff</span>';
      } else {
        el.roleCurrentLabel.innerHTML = '<b>Quyền: Quản Trị Viên (Admin)</b> — <span style="color:#6366f1; font-weight:600;">Toàn quyền Workspace</span>';
      }
    }

    // 3. Add Member Button Visibility & Quota checks
    if (el.btnAdd) {
      if (role === 'staff') {
        el.btnAdd.style.display = 'none'; // Staff cannot add members
      } else if (role === 'leader') {
        el.btnAdd.style.display = 'inline-flex';
        el.btnAdd.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          <span>Thêm Nhân Viên (Staff)</span>
        `;
      } else {
        el.btnAdd.style.display = 'inline-flex';
        el.btnAdd.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          <span>Thêm Thành Viên Mới</span>
        `;
      }
    }
  }

  function renderTable() {
    if (!el.tableBody) return;

    const query = (el.searchInput?.value || '').trim().toLowerCase();
    const roleFilter = el.filterRole?.value || 'all';
    const myRole = getEffectiveRole();
    const myEmail = (window.currentUser && window.currentUser.email) ? window.currentUser.email.toLowerCase() : '';

    // Toggle clear search button
    if (el.btnSearchClear) {
      el.btnSearchClear.style.display = query ? 'inline-flex' : 'none';
    }

    const filtered = teamMembers.filter(m => {
      const matchRole = roleFilter === 'all' || m.role === roleFilter;
      const matchQuery = !query ||
        (m.full_name && m.full_name.toLowerCase().includes(query)) ||
        (m.email && m.email.toLowerCase().includes(query));
      return matchRole && matchQuery;
    });

    if (filtered.length === 0) {
      el.tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
            <div style="font-size: 36px; margin-bottom: 10px;">👥</div>
            <div style="font-size: 14px; font-weight: 600; color: var(--text-main);">Không tìm thấy thành viên phù hợp</div>
            <div style="font-size: 12px; margin-top: 4px;">Thử thay đổi từ khóa tìm kiếm hoặc lọc vai trò khác.</div>
          </td>
        </tr>
      `;
      return;
    }

    el.tableBody.innerHTML = filtered.map(m => {
      // Role badge
      let roleBadge = '';
      if (m.role === 'admin') {
        roleBadge = '<span class="team-role-badge role-admin">Quản Trị Viên (Admin)</span>';
      } else if (m.role === 'leader') {
        roleBadge = '<span class="team-role-badge role-leader">Trưởng Nhóm (Leader)</span>';
      } else {
        roleBadge = '<span class="team-role-badge role-staff">Nhân Viên (Staff)</span>';
      }

      // Safe Launch Mode Badge
      const isSafe = m.role === 'staff' || (m.permissions && m.permissions.safe_launch_only);
      const safeBadge = isSafe
        ? `<span class="team-safe-badge safe-active" title="Chống tuồn tài nguyên MMO: Ẩn Cookie & Mật khẩu Proxy">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
            <span>Safe Launch</span>
           </span>`
        : `<span class="team-safe-badge safe-full" title="Quyền truy cập toàn bộ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Toàn Quyền</span>
           </span>`;

      // Status Badge
      const isActive = m.status === 'active';
      const statusBadge = isActive
        ? `<span class="team-status-pill status-active">Hoạt Động</span>`
        : `<span class="team-status-pill status-suspended">Tạm Khóa</span>`;

      // Assigned Groups
      let groupsHtml = '';
      if (m.role === 'admin' || !m.assigned_groups || m.assigned_groups.length === 0) {
        groupsHtml = '<span style="font-size: 12px; color: var(--text-muted); font-style: italic;">Toàn bộ Workspace</span>';
      } else {
        const groupBadges = m.assigned_groups.map(gId => {
          const g = availableGroups.find(x => x.id === gId);
          const name = g ? g.name : gId;
          const color = g ? (g.color || '#2563eb') : '#2563eb';
          return `<span class="team-group-pill" style="border-left: 3px solid ${color};">${escapeHtml(name)}</span>`;
        }).join(' ');
        groupsHtml = `<div style="display: flex; flex-wrap: wrap; gap: 4px;">${groupBadges}</div>`;
      }

      // Avatar initial
      const initial = (m.full_name || m.email || 'U').charAt(0).toUpperCase();

      // STRICT RBAC ACTION COLUMN
      let actionHtml = '';
      const isSelf = myEmail && (m.email || '').toLowerCase() === myEmail;

      if (myRole === 'staff') {
        actionHtml = `
          <span class="team-readonly-badge" title="Tài khoản Nhân viên chỉ có quyền xem thông tin">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            <span>Chỉ xem (Read-only)</span>
          </span>
        `;
      } else if (myRole === 'leader') {
        if (m.role === 'staff') {
          actionHtml = `
            <div style="display: flex; gap: 6px; align-items: center; justify-content: flex-end;">
              <button class="uiv-icon-btn btn-edit-member" data-id="${m.id}" title="Phân Quyền & Chỉnh Sửa Nhân Viên">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="uiv-icon-btn btn-toggle-status" data-id="${m.id}" data-status="${m.status}" title="${isActive ? 'Tạm Khóa Nhân Viên' : 'Kích Hoạt Lại'}">
                ${isActive
                  ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
                  : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>'
                }
              </button>
              <button class="uiv-icon-btn btn-delete-member" data-id="${m.id}" title="Xóa Nhân Viên Khỏi Nhóm" style="color: #ef4444;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          `;
        } else {
          actionHtml = `
            <span class="team-lock-badge" title="Trưởng nhóm không có quyền can thiệp vào tài khoản Trưởng nhóm khác hoặc Quản trị viên">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>Cấp trên / Cùng cấp</span>
            </span>
          `;
        }
      } else {
        if (isSelf) {
          actionHtml = `
            <span class="team-self-badge" title="Tài khoản Quản trị viên của bạn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H4a4 4 0 0 0-4 4v2"/></svg>
              <span>Tài Khoản Của Bạn</span>
            </span>
          `;
        } else {
          actionHtml = `
            <div style="display: flex; gap: 6px; align-items: center; justify-content: flex-end;">
              <button class="uiv-icon-btn btn-edit-member" data-id="${m.id}" title="Phân Quyền & Chỉnh Sửa">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="uiv-icon-btn btn-toggle-status" data-id="${m.id}" data-status="${m.status}" title="${isActive ? 'Tạm Khóa Thành Viên' : 'Kích Hoạt'}">
                ${isActive
                  ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
                  : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>'
                }
              </button>
              <button class="uiv-icon-btn btn-delete-member" data-id="${m.id}" title="Xóa Thành Viên" style="color: #ef4444;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          `;
        }
      }

      return `
        <tr data-id="${m.id}">
          <td>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="team-avatar">${initial}</div>
              <div>
                <div style="font-weight: 700; color: var(--text-main); font-size: 13.5px;">${escapeHtml(m.full_name || '')}</div>
                <div style="font-size: 12px; color: var(--text-muted);">${escapeHtml(m.email)}</div>
              </div>
            </div>
          </td>
          <td>${roleBadge}</td>
          <td>${groupsHtml}</td>
          <td>${safeBadge}</td>
          <td>${statusBadge}</td>
          <td>${actionHtml}</td>
        </tr>
      `;
    }).join('');

    attachTableEvents();
  }

  function attachTableEvents() {
    el.tableBody.querySelectorAll('.btn-edit-member').forEach(btn => {
      btn.addEventListener('click', () => openModal(btn.dataset.id));
    });

    el.tableBody.querySelectorAll('.btn-toggle-status').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const current = btn.dataset.status;
        const newStatus = current === 'active' ? 'suspended' : 'active';
        try {
          const res = await fetch(`${API_BASE}/team/members/${id}`, {
            method: 'PUT',
            headers: getRequestHeaders(),
            body: JSON.stringify({ status: newStatus })
          });
          const data = await res.json();
          if (data && data.success) {
            toast(`Đã ${newStatus === 'active' ? 'kích hoạt lại' : 'tạm khóa'} thành viên`, 'success');
            await fetchMembers();
          } else {
            toast(data.error || 'Lỗi cập nhật trạng thái', 'danger');
          }
        } catch {
          toast('Lỗi kết nối máy chủ', 'danger');
        }
      });
    });

    el.tableBody.querySelectorAll('.btn-delete-member').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const member = teamMembers.find(m => m.id === id);
        const name = member ? member.full_name : 'thành viên này';
        
        if (typeof window.showConfirmDialog === 'function') {
          const ok = await window.showConfirmDialog({
            title: 'Xóa Thành Viên',
            message: `Bạn có chắc chắn muốn xóa thành viên <b>${name}</b> khỏi Đội Ngũ?<br><small style="color:var(--text-muted);">Tài khoản sẽ bị hủy quyền truy cập vào các Profile được phân công.</small>`,
            type: 'danger',
            confirmText: 'Xác Nhận Xóa',
            cancelText: 'Hủy Bỏ'
          });
          if (!ok) return;
        } else if (!confirm(`Bạn có chắc chắn muốn xóa thành viên "${name}" khỏi Đội Ngũ?`)) {
          return;
        }

        try {
          const res = await fetch(`${API_BASE}/team/members/${id}`, {
            method: 'DELETE',
            headers: getRequestHeaders()
          });
          const data = await res.json();
          if (data && data.success) {
            toast(`Đã xóa thành viên ${name}`, 'success');
            await fetchMembers();
          } else {
            toast(data.error || 'Lỗi khi xóa thành viên', 'danger');
          }
        } catch {
          toast('Lỗi kết nối máy chủ', 'danger');
        }
      });
    });
  }

  function renderGroupCheckboxes(selectedIds = []) {
    if (!el.groupsContainer) return;

    if (availableGroups.length === 0) {
      el.groupsContainer.innerHTML = `
        <div style="font-size: 12px; color: var(--text-muted); padding: 8px;">
          Chưa có Nhóm Profile nào. Hệ thống sẽ mặc định cấp quyền toàn bộ Workspace.
        </div>
      `;
      return;
    }

    el.groupsContainer.innerHTML = availableGroups.map(g => {
      const isChecked = selectedIds.includes(g.id);
      return `
        <label class="team-group-checkbox-item">
          <input type="checkbox" class="team-group-checkbox" value="${g.id}" ${isChecked ? 'checked' : ''}>
          <span class="group-color-dot" style="background: ${g.color || '#2563eb'};"></span>
          <span style="font-size: 13px; font-weight: 600; color: var(--text-main);">${escapeHtml(g.name)}</span>
        </label>
      `;
    }).join('');
  }

  function openModal(memberId = null) {
    const myRole = getEffectiveRole();
    const myPlan = getEffectivePlan();

    if (!isTeamUnlocked()) {
      toast('Tài khoản Free không có quyền thêm thành viên. Vui lòng nâng cấp gói Plus hoặc Pro!', 'warning');
      return;
    }

    // Check Seat Limit for Plus plan
    if (!memberId && myPlan === 'plus' && teamMembers.length >= 5) {
      toast('Đã đạt giới hạn 5 thành viên của Gói Plus. Vui lòng nâng cấp Gói Pro để thêm thành viên.', 'warning');
      return;
    }

    // Staff cannot open modal
    if (myRole === 'staff') {
      toast('Chế độ Nhân viên (Staff) không có quyền thêm hoặc chỉnh sửa thành viên', 'warning');
      return;
    }

    editingMemberId = memberId;

    // Adjust Role dropdown options based on current user's role
    if (el.formRole) {
      if (myRole === 'leader') {
        el.formRole.innerHTML = `
          <option value="staff">Nhân Viên (Staff - Safe Mode)</option>
        `;
        el.formRole.disabled = true;
      } else {
        el.formRole.disabled = false;
        el.formRole.innerHTML = `
          <option value="staff">Nhân Viên (Staff - Safe Mode)</option>
          <option value="leader">Trưởng Nhóm (Leader)</option>
          <option value="admin">Quản Trị Viên (Admin)</option>
        `;
      }
    }

    if (memberId) {
      const m = teamMembers.find(x => x.id === memberId);
      if (!m) return;

      if (myRole === 'leader' && m.role !== 'staff') {
        toast('Trưởng nhóm không có quyền chỉnh sửa tài khoản Leader hoặc Admin', 'warning');
        return;
      }

      if (el.modalTitle) el.modalTitle.innerText = 'Phân Quyền & Chỉnh Sửa Thành Viên';
      if (el.formName) el.formName.value = m.full_name || '';
      if (el.formEmail) {
        el.formEmail.value = m.email || '';
        el.formEmail.disabled = true; // Email is identifier
      }
      if (el.formPassword) {
        el.formPassword.value = '';
        el.formPassword.placeholder = '(Để trống nếu không đổi mật khẩu)';
      }
      if (el.formRole) el.formRole.value = m.role || 'staff';

      renderGroupCheckboxes(m.assigned_groups || []);

      const perms = m.permissions || {};
      if (el.toggleSafeLaunch) el.toggleSafeLaunch.checked = m.role === 'staff' || Boolean(perms.safe_launch_only);
      if (el.toggleCanCreate) el.toggleCanCreate.checked = Boolean(perms.can_create_profile);
      if (el.toggleCanEdit) el.toggleCanEdit.checked = perms.can_edit_profile !== false;
      if (el.toggleCanDelete) el.toggleCanDelete.checked = Boolean(perms.can_delete_profile);
    } else {
      if (el.modalTitle) el.modalTitle.innerText = myRole === 'leader' ? 'Thêm Nhân Viên (Staff) Mới' : 'Thêm / Mời Thành Viên Đội Ngũ Mới';
      if (el.formName) el.formName.value = '';
      if (el.formEmail) {
        el.formEmail.value = '';
        el.formEmail.disabled = false;
      }
      if (el.formPassword) {
        el.formPassword.value = 'OmniTeam@2026!';
        el.formPassword.placeholder = 'Nhập mật khẩu ban đầu...';
      }
      if (el.formRole) el.formRole.value = 'staff';

      renderGroupCheckboxes([]);

      // Default safe launch for staff
      if (el.toggleSafeLaunch) el.toggleSafeLaunch.checked = true;
      if (el.toggleCanCreate) el.toggleCanCreate.checked = false;
      if (el.toggleCanEdit) el.toggleCanEdit.checked = false;
      if (el.toggleCanDelete) el.toggleCanDelete.checked = false;
    }

    if (el.modal) el.modal.classList.add('open');
  }

  function closeModal() {
    if (el.modal) el.modal.classList.remove('open');
    editingMemberId = null;
  }

  async function saveMember() {
    const fullName = (el.formName?.value || '').trim();
    const email = (el.formEmail?.value || '').trim();
    const password = el.formPassword?.value || '';
    const role = el.formRole?.value || 'staff';

    if (!fullName) {
      toast('Vui lòng nhập Họ tên thành viên', 'warning');
      return;
    }
    if (!email || !email.includes('@')) {
      toast('Vui lòng nhập Email hợp lệ', 'warning');
      return;
    }

    // Selected groups
    const selectedGroups = [];
    document.querySelectorAll('.team-group-checkbox:checked').forEach(cb => {
      selectedGroups.push(cb.value);
    });

    const permissions = {
      safe_launch_only: Boolean(el.toggleSafeLaunch?.checked),
      can_create_profile: Boolean(el.toggleCanCreate?.checked),
      can_edit_profile: Boolean(el.toggleCanEdit?.checked),
      can_delete_profile: Boolean(el.toggleCanDelete?.checked),
      can_view_proxy: !el.toggleSafeLaunch?.checked,
      can_export: !el.toggleSafeLaunch?.checked,
    };

    const payload = {
      full_name: fullName,
      email,
      role,
      assigned_groups: selectedGroups,
      permissions
    };
    if (password && password.length >= 6) {
      payload.password = password;
    }

    try {
      let res, data;
      if (editingMemberId) {
        res = await fetch(`${API_BASE}/team/members/${editingMemberId}`, {
          method: 'PUT',
          headers: getRequestHeaders(),
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_BASE}/team/members`, {
          method: 'POST',
          headers: getRequestHeaders(),
          body: JSON.stringify(payload)
        });
      }
      data = await res.json();
      if (data && data.success) {
        toast(editingMemberId ? 'Đã cập nhật phân quyền thành viên!' : 'Đã thêm thành viên mới vào Đội Ngũ!', 'success');
        closeModal();
        await fetchMembers();
      } else {
        toast(data.error || 'Lỗi khi lưu thông tin thành viên', 'danger');
      }
    } catch {
      toast('Lỗi kết nối máy chủ', 'danger');
    }
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

  function init() {
    fetchGroups().then(() => fetchMembers());

    if (isInitialized) return;
    isInitialized = true;

    // Event listeners
    if (el.btnAdd) el.btnAdd.addEventListener('click', () => openModal());
    if (el.btnRefresh) el.btnRefresh.addEventListener('click', () => fetchMembers());
    if (el.btnClose) el.btnClose.addEventListener('click', closeModal);
    if (el.btnCancel) el.btnCancel.addEventListener('click', closeModal);
    if (el.btnSave) el.btnSave.addEventListener('click', saveMember);

    // Search input real-time filtering
    if (el.searchInput) {
      el.searchInput.addEventListener('input', renderTable);
      el.searchInput.addEventListener('keyup', renderTable);
      el.searchInput.addEventListener('search', renderTable);
    }

    // Clear search button
    if (el.btnSearchClear) {
      el.btnSearchClear.addEventListener('click', () => {
        if (el.searchInput) {
          el.searchInput.value = '';
          el.searchInput.focus();
        }
        renderTable();
      });
    }

    if (el.filterRole) el.filterRole.addEventListener('change', renderTable);

    // Role Preview Buttons
    if (el.rolePreviewBar) {
      el.rolePreviewBar.querySelectorAll('.team-preview-role-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const targetRole = btn.dataset.previewRole;
          activePreviewRole = targetRole;
          updateRoleUI();
          renderTable();
          toast(`Đã chuyển sang chế độ xem: ${targetRole.toUpperCase()}`, 'info');
        });
      });
    }

    // Plan Preview Buttons (Free vs Plus vs Pro)
    document.querySelectorAll('.team-test-plan-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetPlan = btn.dataset.testPlan;
        activePreviewPlan = targetPlan;
        updatePlanUI();
        if (targetPlan !== 'free') {
          fetchMembers();
          toast(`Đã chuyển sang Gói: ${targetPlan.toUpperCase()} (Đã mở khóa tính năng Đội Ngũ)`, 'success');
        } else {
          toast('Đã chuyển sang Gói FREE (Đã khóa tính năng Đội Ngũ)', 'warning');
        }
      });
    });

    // Upgrade CTA triggers in Paywall -> Open VietQR Checkout directly
    document.querySelectorAll('.btn-team-upgrade-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.targetPlan || 'pro';
        const planCode = target === 'plus' ? 'PRO_MONTHLY' : 'PRO';
        if (typeof window.openCheckoutModal === 'function') {
          window.openCheckoutModal(planCode);
        } else if (typeof window.switchTab === 'function') {
          window.switchTab('license');
        }
      });
    });

    // Auto toggle safe launch on role change in modal
    if (el.formRole) {
      el.formRole.addEventListener('change', () => {
        const r = el.formRole.value;
        if (r === 'staff') {
          if (el.toggleSafeLaunch) el.toggleSafeLaunch.checked = true;
          if (el.toggleCanCreate) el.toggleCanCreate.checked = false;
          if (el.toggleCanDelete) el.toggleCanDelete.checked = false;
        } else if (r === 'admin') {
          if (el.toggleSafeLaunch) el.toggleSafeLaunch.checked = false;
          if (el.toggleCanCreate) el.toggleCanCreate.checked = true;
          if (el.toggleCanEdit) el.toggleCanEdit.checked = true;
          if (el.toggleCanDelete) el.toggleCanDelete.checked = true;
        } else if (r === 'leader') {
          if (el.toggleSafeLaunch) el.toggleSafeLaunch.checked = false;
          if (el.toggleCanCreate) el.toggleCanCreate.checked = true;
          if (el.toggleCanEdit) el.toggleCanEdit.checked = true;
          if (el.toggleCanDelete) el.toggleCanDelete.checked = false;
        }
      });
    }
  }

  // Export to window
  window.TeamUI = {
    init,
    fetchMembers,
    openModal,
    closeModal,
    setPreviewRole: function(role) {
      activePreviewRole = role;
      updateRoleUI();
      renderTable();
    },
    setPreviewPlan: function(plan) {
      activePreviewPlan = plan;
      updatePlanUI();
      if (plan !== 'free') fetchMembers();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const activeTab = document.querySelector('.nav-item.active')?.dataset.tab;
      if (activeTab === 'team') init();
    });
  } else {
    const activeTab = document.querySelector('.nav-item.active')?.dataset.tab;
    if (activeTab === 'team') init();
  }
})();
