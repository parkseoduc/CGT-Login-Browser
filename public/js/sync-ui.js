/**
 * OmniBrowser Hub - Action Synchronizer & Window Grid Tiling UI Module
 * Quản lý giao diện, tiến trình đồng bộ thời gian thực (Master -> Slaves) và lưới cửa sổ
 */

// DOM Elements
const syncMasterSelect = document.getElementById('sync-master-select');
const syncSlavesTbody = document.getElementById('sync-slaves-tbody');
const syncSelectAllSlaves = document.getElementById('sync-select-all-slaves');
const btnTileWindows = document.getElementById('btn-tile-windows');
const btnToggleSync = document.getElementById('btn-toggle-sync');
const syncBtnText = document.getElementById('sync-btn-text');
const syncStatMaster = document.getElementById('sync-stat-master');
const syncStatSlaves = document.getElementById('sync-stat-slaves');
const syncStatEvents = document.getElementById('sync-stat-events');
const syncStatStatus = document.getElementById('sync-stat-status');
const syncOptMouse = document.getElementById('sync-opt-mouse');
const syncOptKeyboard = document.getElementById('sync-opt-keyboard');
const syncOptScroll = document.getElementById('sync-opt-scroll');
const syncOptNav = document.getElementById('sync-opt-nav');
const syncOptJitter = document.getElementById('sync-opt-jitter');
const syncProcessBanner = document.getElementById('sync-process-banner');
const syncProcessContent = document.getElementById('sync-process-content');
const syncProcessAction = document.getElementById('sync-process-action');

// Trạng thái phiên đồng bộ: 'idle' | 'starting' | 'live' | 'stopping' | 'failed'
let isSyncActive = false;
let syncCurrentState = 'idle';

/**
 * Cập nhật trạng thái giao diện chi tiết cho phiên đồng bộ
 */
function setSyncUIState(state, info = {}) {
  syncCurrentState = state;
  if (!btnToggleSync || !syncStatStatus) return;

  if (state === 'starting') {
    btnToggleSync.className = 'uiv-cta-primary';
    btnToggleSync.disabled = true;
    btnToggleSync.innerHTML = `
      <span class="uiv-spinner" style="width:14px; height:14px; border-width:2px; border-top-color:#fff;"></span>
      <span>Đang khởi động...</span>
    `;
    syncStatStatus.innerHTML = `
      <span class="badge" style="background:#f59e0b25; color:#d97706; border:1px solid #f59e0b40; display:inline-flex; align-items:center; gap:6px;">
        <span class="badge-pulse" style="background:#f59e0b;"></span> ĐANG KHỞI ĐỘNG...
      </span>
    `;
    if (syncProcessBanner && syncProcessContent) {
      syncProcessBanner.style.display = 'flex';
      syncProcessBanner.style.background = 'rgba(245, 158, 11, 0.12)';
      syncProcessBanner.style.border = '1px solid rgba(245, 158, 11, 0.3)';
      syncProcessBanner.style.color = '#d97706';
      syncProcessContent.innerHTML = `
        <span class="uiv-spinner" style="width:16px; height:16px; border-width:2px; border-top-color:#d97706;"></span>
        <span><strong>Đang kết nối:</strong> Đang thiết lập cổng CDP điều khiển Master và kết nối ${info.slaveCount || 1} cửa sổ Slave... Vui lòng đợi trong giây lát.</span>
      `;
      if (syncProcessAction) syncProcessAction.innerHTML = '';
    }
  } else if (state === 'live') {
    btnToggleSync.className = 'uiv-cta-danger';
    btnToggleSync.disabled = false;
    btnToggleSync.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
      <span>Dừng Đồng Bộ</span>
    `;
    syncStatStatus.innerHTML = '<span class="badge badge-running"><span class="badge-pulse"></span> ĐANG ĐỒNG BỘ LIVE</span>';
    if (syncProcessBanner && syncProcessContent) {
      syncProcessBanner.style.display = 'flex';
      syncProcessBanner.style.background = 'rgba(16, 185, 129, 0.12)';
      syncProcessBanner.style.border = '1px solid rgba(16, 185, 129, 0.3)';
      syncProcessBanner.style.color = '#059669';
      syncProcessContent.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <span><strong>ĐỒNG BỘ LIVE HOẠT ĐỘNG:</strong> Mọi click chuột, gõ phím, cuộn trang ở cửa sổ Master đang được truyền tức thì sang các Slaves.</span>
      `;
      if (syncProcessAction) syncProcessAction.innerHTML = '<button class="uiv-btn uiv-btn-secondary" onclick="toggleSync()" style="padding:4px 10px; font-size:11px;">Dừng phiên</button>';
    }
  } else if (state === 'failed') {
    btnToggleSync.className = 'uiv-cta-primary';
    btnToggleSync.disabled = false;
    btnToggleSync.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      <span>Thử Lại Đồng Bộ</span>
    `;
    syncStatStatus.innerHTML = `
      <span class="badge badge-danger" style="background:#ef444420; color:#ef4444; border:1px solid #ef444440; display:inline-flex; align-items:center; gap:5px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        KHỞI ĐỘNG THẤT BẠI
      </span>
    `;
    if (syncProcessBanner && syncProcessContent) {
      syncProcessBanner.style.display = 'flex';
      syncProcessBanner.style.background = 'rgba(239, 68, 68, 0.12)';
      syncProcessBanner.style.border = '1px solid rgba(239, 68, 68, 0.3)';
      syncProcessBanner.style.color = '#dc2626';
      syncProcessContent.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span><strong>Khởi động thất bại:</strong> ${escapeHtml(info.error || 'Không kết nối được cổng CDP của profile.')}</span>
      `;
      if (syncProcessAction) syncProcessAction.innerHTML = '<button class="uiv-cta-primary" onclick="toggleSync()" style="padding:4px 12px; font-size:12px;">Thử lại</button>';
    }
  } else if (state === 'stopping') {
    btnToggleSync.className = 'uiv-cta-danger';
    btnToggleSync.disabled = true;
    btnToggleSync.innerHTML = `
      <span class="uiv-spinner" style="width:14px; height:14px; border-width:2px; border-top-color:#fff;"></span>
      <span>Đang dừng...</span>
    `;
    syncStatStatus.innerHTML = `
      <span class="badge" style="background:rgba(156,163,175,0.2); color:var(--text-muted); display:inline-flex; align-items:center; gap:5px;">
        <span class="uiv-spinner" style="width:10px; height:10px; border-width:2px;"></span> ĐANG DỪNG...
      </span>
    `;
    if (syncProcessBanner && syncProcessContent) {
      syncProcessBanner.style.display = 'flex';
      syncProcessBanner.style.background = 'rgba(156, 163, 175, 0.1)';
      syncProcessBanner.style.border = '1px solid rgba(156, 163, 175, 0.25)';
      syncProcessBanner.style.color = 'var(--text-muted)';
      syncProcessContent.innerHTML = `<span>Đang hủy phiên đồng bộ và đóng các cổng CDP an toàn...</span>`;
      if (syncProcessAction) syncProcessAction.innerHTML = '';
    }
  } else {
    // idle
    btnToggleSync.className = 'uiv-cta-primary';
    btnToggleSync.disabled = false;
    btnToggleSync.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      <span>Bắt đầu Đồng Bộ</span>
    `;
    syncStatStatus.innerHTML = '<span class="badge" style="background:rgba(156,163,175,0.15); color:var(--text-muted);"><span class="badge-dot" style="background:#9ca3af;"></span> Đang dừng</span>';
    if (syncProcessBanner) syncProcessBanner.style.display = 'none';
  }
}

/**
 * Hiển thị bảng chọn Master & Slaves từ các profile đang chạy
 */
function renderSyncWorkspace() {
  if (!syncMasterSelect || !syncSlavesTbody) return;

  const running = allProfiles.filter(p => p.isRunning);
  const curMaster = syncMasterSelect.value;

  if (running.length === 0) {
    syncMasterSelect.innerHTML = '<option value="">(Chưa có profile nào mở - Bấm nút bên dưới để mở nhanh)</option>';
    syncSlavesTbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 36px 20px;">
          <div style="font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 8px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent);"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>Chưa có cửa sổ trình duyệt nào đang mở</span>
          </div>
          <p style="font-size: 12px; color: var(--text-muted); max-width: 480px; margin: 0 auto 16px auto; line-height: 1.6;">
            Chức năng Đồng bộ thao tác cần các cửa sổ Chromium thực tế đang mở trên màn hình để truyền phím và chuột từ Master sang Slaves.
          </p>
          <div style="display:flex; justify-content:center; gap: 12px;">
            <button class="uiv-cta-primary" onclick="quickStartTwoProfiles()" style="padding: 8px 16px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>Mở Nhanh 2 Cửa Sổ & Sắp Xếp Lưới</span>
            </button>
            <button class="uiv-btn uiv-btn-secondary" onclick="switchTab('profiles')" style="padding: 8px 16px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              <span>Xem Tab Quản Lý Hồ Sơ</span>
            </button>
          </div>
        </td>
      </tr>
    `;
    if (syncStatMaster) syncStatMaster.innerText = 'Chưa mở profile';
    if (syncStatSlaves) syncStatSlaves.innerText = '0 Cửa sổ';
    return;
  }

  // Populate Master select
  let masterOpts = running.map(p => {
    return `<option value="${p.id}">${escapeHtml(p.name)} (${p.id.slice(0, 8)})</option>`;
  }).join('');
  syncMasterSelect.innerHTML = masterOpts;

  // Preserve previous selection if still running
  if (curMaster && running.some(p => p.id === curMaster)) {
    syncMasterSelect.value = curMaster;
  }

  if (typeof initAllCustomSelects === 'function') initAllCustomSelects();

  const selectedMasterId = syncMasterSelect.value;
  const masterProfile = running.find(p => p.id === selectedMasterId);
  if (syncStatMaster) {
    syncStatMaster.innerText = masterProfile ? masterProfile.name : 'Chưa chọn';
  }

  // Slaves are all running profiles except master
  const slaves = running.filter(p => p.id !== selectedMasterId);

  if (slaves.length === 0) {
    syncSlavesTbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 28px 16px;">
          <div style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 6px; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent);"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>Bạn mới mở 1 profile (đã chọn làm Master)</span>
          </div>
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 14px;">
            Tính năng Đồng bộ cần ít nhất 1 cửa sổ Slave theo sau để copy thao tác chuột và phím.
          </p>
          <button class="uiv-cta-primary" onclick="quickStartOneMoreSlave()" style="padding: 8px 16px; font-size: 12px; display: inline-flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Bấm vào đây để mở thêm 1 cửa sổ Slave ngay</span>
          </button>
        </td>
      </tr>
    `;
    if (syncStatSlaves) syncStatSlaves.innerText = '0 Cửa sổ';
    return;
  }

  syncSlavesTbody.innerHTML = slaves.map(p => {
    const groupTxt = p.group_name
      ? `<span class="badge" style="background:${p.group_color || '#3867F4'}20; color:${p.group_color || '#3867F4'}; font-size:11px;">${escapeHtml(p.group_name)}</span>`
      : `<span style="color:var(--text-muted); font-size:11px;">Mặc định</span>`;

    return `
      <tr>
        <td style="text-align: center;">
          <input type="checkbox" class="sync-slave-cb" value="${p.id}" checked style="width:16px; height:16px; accent-color: var(--primary); cursor: pointer;">
        </td>
        <td>
          <span style="font-weight:600; font-size:13px; color:var(--text-main);">${escapeHtml(p.name)}</span>
        </td>
        <td>
          <span style="font-family:monospace; font-size:11px; color:var(--text-muted);">${p.id.slice(0, 13)}...</span>
        </td>
        <td>${groupTxt}</td>
      </tr>
    `;
  }).join('');

  if (syncStatSlaves && !isSyncActive) {
    syncStatSlaves.innerText = `${slaves.length} Cửa sổ`;
  }
}

/**
 * Lấy trạng thái đồng bộ và cập nhật counters định kỳ
 */
async function fetchSyncStatus() {
  try {
    const res = await fetch(`${API_BASE}/sync/status`);
    const data = await res.json();
    if (!data.success) return;

    isSyncActive = data.isSyncing;

    if (syncStatEvents) {
      const m = data.metrics || {};
      const count = m.eventsSent || 0;
      if (count > 0) {
        syncStatEvents.innerHTML = `<span style="font-weight:700;">${count} sự kiện</span> <span style="font-size:11px; color:var(--text-muted); font-weight:normal;">(🐭 ${m.mouseEvents || 0} | ⌨️ ${m.keyEvents || 0} | 📜 ${m.scrollEvents || 0})</span>`;
      } else {
        syncStatEvents.innerText = '0 sự kiện';
      }
    }

    if (isSyncActive) {
      setSyncUIState('live', { slaveCount: data.activeSlavesCount });
      if (syncStatSlaves) {
        syncStatSlaves.innerText = `${data.activeSlavesCount} Cửa sổ`;
      }
      if (data.masterProfileId && syncStatMaster) {
        const m = allProfiles.find(p => p.id === data.masterProfileId);
        syncStatMaster.innerText = m ? m.name : data.masterProfileId.slice(0, 8);
      }
    } else {
      // Chỉ chuyển về idle nếu hiện tại không đang trong tiến trình 'starting', 'stopping', hoặc 'failed'
      if (syncCurrentState !== 'starting' && syncCurrentState !== 'stopping' && syncCurrentState !== 'failed') {
        setSyncUIState('idle');
      }
    }
  } catch (err) {
    // ignore
  }
}

/**
 * Bắt đầu hoặc Dừng phiên đồng bộ
 */
async function toggleSync() {
  if (isSyncActive || syncCurrentState === 'live') {
    setSyncUIState('stopping');
    try {
      showToast('Đang dừng phiên đồng bộ...', 'info');
      const res = await fetch(`${API_BASE}/sync/stop`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        isSyncActive = false;
        setSyncUIState('idle');
        showToast('Đã dừng phiên đồng bộ thao tác', 'info');
        fetchSyncStatus();
      }
    } catch (err) {
      setSyncUIState('failed', { error: `Lỗi dừng: ${err.message}` });
      showToast(`Lỗi dừng đồng bộ: ${err.message}`, 'danger');
    }
  } else {
    const masterId = syncMasterSelect ? syncMasterSelect.value : '';
    if (!masterId) {
      await showCustomAlert({
        title: 'Chưa chọn Master',
        message: 'Vui lòng mở ít nhất <strong>2 profile</strong> và chọn 1 profile làm <strong>Master điều khiển</strong>.',
        type: 'warning'
      });
      return;
    }

    const checkedSlaves = Array.from(document.querySelectorAll('.sync-slave-cb:checked')).map(cb => cb.value);
    if (checkedSlaves.length === 0) {
      await showCustomAlert({
        title: 'Chưa chọn Slave',
        message: 'Vui lòng chọn ít nhất <strong>1 Profile Slave</strong> để nhận thao tác đồng bộ.',
        type: 'warning'
      });
      return;
    }

    const payload = {
      masterId,
      slaveIds: checkedSlaves,
      options: {
        syncMouse: syncOptMouse?.checked ?? true,
        syncKeyboard: syncOptKeyboard?.checked ?? true,
        syncScroll: syncOptScroll?.checked ?? true,
        syncNav: syncOptNav?.checked ?? true,
        humanDelay: syncOptJitter?.checked ?? true,
      }
    };

    setSyncUIState('starting', { slaveCount: checkedSlaves.length });
    showToast(`⏳ Đang khởi động: Kết nối CDP tới Master & ${checkedSlaves.length} Slaves...`, 'info');

    try {
      const res = await fetch(`${API_BASE}/sync/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Lỗi kết nối CDP');

      isSyncActive = true;
      setSyncUIState('live', { slaveCount: checkedSlaves.length });
      showToast(`🚀 KHỞI ĐỘNG THÀNH CÔNG! Đang đồng bộ thời gian thực từ Master sang ${checkedSlaves.length} Slaves.`, 'success');
      fetchSyncStatus();
    } catch (err) {
      isSyncActive = false;
      setSyncUIState('failed', { error: err.message });
      showToast(`❌ Khởi động đồng bộ thất bại: ${err.message}`, 'danger');
    }
  }
}

/**
 * Sắp xếp các cửa sổ theo lưới trên màn hình
 */
async function tileWindows(layout = 'auto') {
  const running = allProfiles.filter(p => p.isRunning);
  if (running.length === 0) {
    showToast('Chưa có profile nào đang chạy để sắp xếp lưới', 'danger');
    return;
  }

  try {
    const screenWidth = window.screen.availWidth || 1920;
    const screenHeight = window.screen.availHeight || 1040;

    showToast(`Đang sắp xếp ${running.length} cửa sổ theo bố cục ${layout.toUpperCase()}...`, 'info');
    const res = await fetch(`${API_BASE}/sync/tile-grid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layout, screenWidth, screenHeight })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    showToast(`📐 Đã căn chỉnh và đưa ${data.count} cửa sổ lên màn hình theo lưới ${data.grid.cols}x${data.grid.rows} (${data.grid.width}x${data.grid.height}px)!`, 'success');
  } catch (err) {
    showToast(`Lỗi sắp xếp lưới: ${err.message}`, 'danger');
  }
}

/**
 * Mở nhanh 2 cửa sổ & tự động kích hoạt đồng bộ (Quick-Start)
 */
async function quickStartTwoProfiles() {
  if (allProfiles.length < 2) {
    showToast('Cần ít nhất 2 profile trong danh sách để đồng bộ. Vui lòng tạo thêm profile!', 'danger');
    return;
  }
  const targetProfiles = allProfiles.slice(0, 2);
  showToast(`Đang mở 2 profile: "${targetProfiles[0].name}" và "${targetProfiles[1].name}"...`, 'info');
  for (const p of targetProfiles) {
    await fetch(`${API_BASE}/profiles/${p.id}/start`, { method: 'POST' });
  }
  await fetchProfiles();
  showToast('Đang xếp 2 cửa sổ chia đôi màn hình (2x1)...', 'info');
  setTimeout(async () => {
    await tileWindows('2x1');
    setTimeout(async () => {
      try {
        const payload = {
          masterId: targetProfiles[0].id,
          slaveIds: [targetProfiles[1].id],
          options: {
            syncMouse: true,
            syncKeyboard: true,
            syncScroll: true,
            syncNav: true,
            humanDelay: true,
          }
        };
        setSyncUIState('starting', { slaveCount: 1 });
        const syncRes = await fetch(`${API_BASE}/sync/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const syncData = await syncRes.json();
        if (syncData.success) {
          isSyncActive = true;
          setSyncUIState('live', { slaveCount: 1 });
          fetchSyncStatus();
          renderSyncWorkspace();
          showToast(`🚀 ĐỒNG BỘ ĐÃ KÍCH HOẠT! Cửa sổ bên TRÁI là Master (Điều khiển). Cửa sổ bên PHẢI là Slave. Mọi click, gõ phím, mở tab ở cửa sổ bên TRÁI sẽ truyền sang PHẢI!`, 'success');
        } else {
          setSyncUIState('failed', { error: syncData.error || 'Khởi động thất bại' });
        }
      } catch (e) {
        console.warn('Auto sync start error:', e);
        setSyncUIState('failed', { error: e.message });
      }
    }, 1000);
  }, 1500);
}

/**
 * Mở thêm 1 cửa sổ làm Slave
 */
async function quickStartOneMoreSlave() {
  const stoppedProfiles = allProfiles.filter(p => !p.isRunning);
  if (stoppedProfiles.length === 0) {
    showToast('Tất cả profile trong hệ thống đã được mở!', 'info');
    return;
  }
  const nextProfile = stoppedProfiles[0];
  showToast(`Đang mở thêm profile "${nextProfile.name}" làm Slave...`, 'info');
  await fetch(`${API_BASE}/profiles/${nextProfile.id}/start`, { method: 'POST' });
  await fetchProfiles();
  showToast(`Đã mở thành công profile "${nextProfile.name}" làm Slave!`, 'success');
}

// Event Listeners
if (btnToggleSync) {
  btnToggleSync.addEventListener('click', toggleSync);
}

if (btnTileWindows) {
  btnTileWindows.addEventListener('click', () => tileWindows('auto'));
}

document.querySelectorAll('.sync-tile-btn').forEach(btn => {
  btn.addEventListener('click', () => tileWindows(btn.dataset.layout));
});

if (syncMasterSelect) {
  syncMasterSelect.addEventListener('change', () => {
    const masterP = allProfiles.find(p => p.id === syncMasterSelect.value);
    if (syncStatMaster && masterP) syncStatMaster.innerText = masterP.name;
    renderSyncWorkspace();
  });
}

if (syncSelectAllSlaves) {
  syncSelectAllSlaves.addEventListener('change', () => {
    document.querySelectorAll('.sync-slave-cb').forEach(cb => {
      cb.checked = syncSelectAllSlaves.checked;
    });
  });
}

// Window Global Exports
window.renderSyncWorkspace = renderSyncWorkspace;
window.fetchSyncStatus = fetchSyncStatus;
window.toggleSync = toggleSync;
window.tileWindows = tileWindows;
window.quickStartTwoProfiles = quickStartTwoProfiles;
window.quickStartOneMoreSlave = quickStartOneMoreSlave;
window.setSyncUIState = setSyncUIState;

// Initial fetch
fetchSyncStatus();
