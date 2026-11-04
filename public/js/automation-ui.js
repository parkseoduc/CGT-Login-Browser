/**
 * OmniBrowser No-code Automation Studio (Lượt 2)
 * Giao diện hiện đại, icon SVG sắc nét chuẩn SaaS / UIverse
 */

(function () {
  const automationState = {
    scripts: [],
    currentCategory: 'all',
    activeRun: null,
    pollTimer: null,
    editingScriptId: null,
    builderSteps: []
  };

  const SVG_ICONS = {
    navigate: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    sleep: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    scroll: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="7 13 12 18 17 13"/><polyline points="7 6 12 11 17 6"/></svg>`,
    click: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="m13 13 6 6"/></svg>`,
    type: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/></svg>`,
    press_key: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/><line x1="9" y1="12" x2="15" y2="12"/></svg>`,
    screenshot: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
    rotate_ip: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
    arrowUp: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`,
    arrowDown: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
    trash: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
    copy: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    eye: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
    edit: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`,
    play: `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    sparkle: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`
  };

  const CATEGORY_META = {
    'all': { label: 'Tất cả' },
    'muse-ai': { label: 'Muse AI & Tools', icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="10" r="1.5" fill="currentColor"/><circle cx="15" cy="10" r="1.5" fill="currentColor"/><path d="M9 15h6"/></svg>` },
    'warmup': { label: 'Nuôi Cookie & Lịch Sử', icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>` },
    'social': { label: 'Video Ngắn (TikTok/Shorts)', icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>` },
    'audit': { label: 'Kiểm Tra Dấu Vân Tay', icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>` },
    'custom': { label: 'Kịch Bản Tùy Biến', icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>` }
  };

  const STEP_TYPE_LABELS = {
    'navigate': 'Mở trang Web (Navigate)',
    'sleep': 'Tạm dừng / Chờ đợi (Sleep)',
    'scroll': 'Cuộn trang mượt mà (Scroll)',
    'click': 'Nhấp chuột vào phần tử (Click)',
    'type': 'Gõ văn bản mô phỏng người thật (Type)',
    'press_key': 'Nhấn phím chức năng (Key)',
    'screenshot': 'Chụp ảnh màn hình (Screenshot)',
    'rotate_ip': 'Xoay IP 4G Webhook (Rotate IP)'
  };

    // Toast helper
  function notify(msg, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, type);
    } else {
      console.log(`[Toast ${type}]:`, msg);
    }
  }

  function cleanTitle(str) {
    if (!str) return '';
    return str.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '').replace(/\s+/g, ' ').trim();
  }

  // Initialize Automation UI
  function initAutomationUI() {
    bindEvents();
    fetchAutomationScripts();
    checkAutomationStatus();
  }

  function bindEvents() {
    // Category tabs
    document.querySelectorAll('.automation-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.automation-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        automationState.currentCategory = btn.dataset.category || 'all';
        renderAutomationGrid();
      });
    });

    // Top action buttons
    const btnCreate = document.getElementById('btn-create-automation-script');
    if (btnCreate) {
      btnCreate.addEventListener('click', () => openScriptBuilderModal());
    }

    const btnBatch = document.getElementById('btn-open-batch-modal');
    if (btnBatch) {
      btnBatch.addEventListener('click', () => openBatchRunnerModal());
    }

    const btnRefresh = document.getElementById('btn-refresh-automation');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        fetchAutomationScripts();
        checkAutomationStatus();
      });
    }

    // Builder modal buttons
    const btnAddStep = document.getElementById('btn-builder-add-step');
    if (btnAddStep) {
      btnAddStep.addEventListener('click', () => addBuilderStep());
    }

    const btnSaveScript = document.getElementById('btn-builder-save-script');
    if (btnSaveScript) {
      btnSaveScript.addEventListener('click', saveBuilderScript);
    }

    const btnCloseBuilder = document.getElementById('btn-builder-close-modal');
    if (btnCloseBuilder) {
      btnCloseBuilder.addEventListener('click', closeBuilderModal);
    }

    const btnCancelBuilder = document.getElementById('btn-builder-cancel');
    if (btnCancelBuilder) {
      btnCancelBuilder.addEventListener('click', closeBuilderModal);
    }

    // Batch runner modal buttons
    const btnCloseBatch = document.getElementById('btn-batch-close-modal');
    if (btnCloseBatch) {
      btnCloseBatch.addEventListener('click', closeBatchModal);
    }

    const btnCancelBatch = document.getElementById('btn-batch-cancel');
    if (btnCancelBatch) {
      btnCancelBatch.addEventListener('click', closeBatchModal);
    }

    const btnStartBatch = document.getElementById('btn-batch-start-run');
    if (btnStartBatch) {
      btnStartBatch.addEventListener('click', startBatchExecution);
    }

    const btnSelectAllProfiles = document.getElementById('btn-batch-select-all');
    if (btnSelectAllProfiles) {
      btnSelectAllProfiles.addEventListener('click', () => toggleAllProfileCheckboxes(true));
    }

    const btnDeselectAllProfiles = document.getElementById('btn-batch-deselect-all');
    if (btnDeselectAllProfiles) {
      btnDeselectAllProfiles.addEventListener('click', () => toggleAllProfileCheckboxes(false));
    }

    const batchGroupFilter = document.getElementById('batch-filter-group');
    if (batchGroupFilter) {
      batchGroupFilter.addEventListener('change', filterBatchProfileList);
    }

    // Monitor / Console controls
    const btnStopRun = document.getElementById('btn-automation-stop-run');
    if (btnStopRun) {
      btnStopRun.addEventListener('click', stopAutomationRun);
    }

    const btnClearLogs = document.getElementById('btn-automation-clear-logs');
    if (btnClearLogs) {
      btnClearLogs.addEventListener('click', () => {
        const logBox = document.getElementById('automation-live-logs');
        if (logBox) logBox.innerHTML = '<span style="color:#64748b;">// Bảng log đã được xóa. Đang chờ tác vụ tiếp theo...</span>\n';
      });
    }
  }

  // Fetch scripts from API
  async function fetchAutomationScripts() {
    try {
      const res = await fetch('/api/v1/automation/scripts');
      const data = await res.json();
      if (data && data.success) {
        automationState.scripts = data.scripts || [];
        renderAutomationGrid();
        updateAutomationStats();
      }
    } catch (err) {
      console.error('[AutomationUI] Lỗi tải danh sách kịch bản:', err);
    }
  }

  // Render script cards
  function renderAutomationGrid() {
    const grid = document.getElementById('automation-scripts-grid');
    if (!grid) return;

    let filtered = automationState.scripts;
    if (automationState.currentCategory !== 'all') {
      filtered = filtered.filter(s => s.category === automationState.currentCategory);
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 40px; text-align: center; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 14px;">
          <div style="margin-bottom: 12px; color: #94a3b8;">${SVG_ICONS.sparkle}</div>
          <h3 style="font-size: 16px; font-weight: 700; color: #0f172a;">Chưa có kịch bản nào trong danh mục này</h3>
          <p style="font-size: 13px; color: #64748b; margin-top: 4px;">Hãy nhấn nút "+ Tạo Kịch Bản Mới" phía trên để thiết lập kịch bản thao tác tự động.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(script => {
      const isPreset = !!script.is_preset;
      const steps = script.steps || [];
      const badgeHtml = isPreset
        ? `<span class="automation-badge-preset"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> Mẫu Hệ Thống</span>`
        : `<span class="automation-badge-custom">Tự Thiết Lập</span>`;

      // Filter meaningful actionable steps (exclude log)
      const actionSteps = steps.filter(s => s.type !== 'log');
      const displaySteps = actionSteps.length > 0 ? actionSteps : steps;

      // Render step pills preview (max 3 pills + more)
      let stepPills = displaySteps.slice(0, 3).map((st, idx) => {
        let label = st.type;
        let icon = SVG_ICONS[st.type] || SVG_ICONS.navigate;

        if (st.type === 'navigate') {
          const dom = (st.url || '').replace(/^https?:\/\//, '').split('/')[0];
          label = `Mở: ${dom}`;
        } else if (st.type === 'sleep') {
          label = `Chờ ${st.seconds || (st.min + '-' + st.max)}s`;
        } else if (st.type === 'scroll') {
          label = `Cuộn ${st.distance || 500}px`;
        } else if (st.type === 'click') {
          label = `Click`;
        } else if (st.type === 'type') {
          label = `Gõ chữ`;
        } else if (st.type === 'press_key') {
          label = `Phím: ${st.key || 'Enter'}`;
        } else if (st.type === 'screenshot') {
          label = `Chụp ảnh`;
        } else if (st.type === 'rotate_ip') {
          label = `Xoay IP 4G`;
        } else if (st.type === 'log') {
          label = `Khởi tạo`;
        }

        return `<span class="automation-step-pill">${icon} ${idx + 1}. ${escapeHtml(label)}</span>`;
      }).join('<span style="color:#cbd5e1; font-size:10px;">➔</span>');

      if (displaySteps.length > 3) {
        stepPills += `<span style="color:#64748b; font-size:11px; margin-left: 4px; font-weight: 500;">+${displaySteps.length - 3} bước</span>`;
      }

      const meta = CATEGORY_META[script.category] || { label: script.category, icon: SVG_ICONS.sparkle };
      const cleanedName = cleanTitle(script.name);

      return `
        <div class="automation-card" data-script-id="${script.id}">
          <div>
            <div class="automation-card-header">
              <span style="font-size: 12px; font-weight: 700; color: #0284c7; display: inline-flex; align-items: center; gap: 5px;">
                ${meta.icon || ''}
                <span>${meta.label}</span>
              </span>
              ${badgeHtml}
            </div>
            <div class="automation-card-title">${escapeHtml(cleanedName)}</div>
            <div class="automation-card-desc">${escapeHtml(cleanTitle(script.description) || 'Không có mô tả')}</div>
            
            <div class="automation-steps-summary" title="${steps.length} bước thực thi">
              ${stepPills || '<span style="color:#94a3b8;">Chưa có bước thực thi</span>'}
            </div>
          </div>

          <div class="automation-card-actions">
            <button class="uiv-cta-emerald btn-run-single-script" data-id="${script.id}" style="padding: 7px 14px; font-size: 12.5px; display: inline-flex; align-items: center; gap: 6px;">
              ${SVG_ICONS.play}
              <span>Chạy Ngay</span>
            </button>
            <button class="uiv-btn uiv-btn-secondary btn-edit-script" data-id="${script.id}" style="padding: 7px 12px; font-size: 12.5px; display: inline-flex; align-items: center; gap: 6px;">
              ${isPreset ? `${SVG_ICONS.eye} <span>Xem Chi Tiết</span>` : `${SVG_ICONS.edit} <span>Chỉnh Sửa</span>`}
            </button>
            <button class="uiv-icon-btn btn-clone-script" data-id="${script.id}" title="Nhân bản kịch bản này">
              ${SVG_ICONS.copy}
            </button>
            ${!isPreset ? `
              <button class="uiv-icon-btn uiv-icon-btn-danger btn-delete-script" data-id="${script.id}" title="Xóa kịch bản">
                ${SVG_ICONS.trash}
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Attach card event listeners
    grid.querySelectorAll('.btn-run-single-script').forEach(btn => {
      btn.addEventListener('click', () => openBatchRunnerModal(btn.dataset.id));
    });

    grid.querySelectorAll('.btn-edit-script').forEach(btn => {
      btn.addEventListener('click', () => openScriptBuilderModal(btn.dataset.id));
    });

    grid.querySelectorAll('.btn-clone-script').forEach(btn => {
      btn.addEventListener('click', () => cloneScript(btn.dataset.id));
    });

    grid.querySelectorAll('.btn-delete-script').forEach(btn => {
      btn.addEventListener('click', () => deleteScript(btn.dataset.id));
    });
  }

  function updateAutomationStats() {
    const totalEl = document.getElementById('stat-total-scripts');
    if (totalEl) totalEl.innerText = automationState.scripts.length;

    const presetEl = document.getElementById('stat-preset-scripts');
    if (presetEl) presetEl.innerText = automationState.scripts.filter(s => s.is_preset).length;
  }

  // ==========================================
  // SCRIPT BUILDER MODAL (NO-CODE BUILDER)
  // ==========================================
  function openScriptBuilderModal(scriptId = null) {
    automationState.editingScriptId = scriptId;
    const modal = document.getElementById('modal-automation-builder');
    if (!modal) return;

    const titleEl = document.getElementById('builder-modal-title');
    const iconBadge = document.getElementById('builder-modal-icon-badge');
    const subtitleEl = document.getElementById('builder-modal-subtitle');
    const nameInput = document.getElementById('builder-script-name');
    const descInput = document.getElementById('builder-script-desc');
    const catSelect = document.getElementById('builder-script-category');

    if (scriptId) {
      const script = automationState.scripts.find(s => s.id === scriptId);
      if (script) {
        const cleaned = cleanTitle(script.name);
        if (iconBadge) {
          iconBadge.innerHTML = script.is_preset ? SVG_ICONS.eye : SVG_ICONS.edit;
          iconBadge.style.background = script.is_preset ? '#e0f2fe' : '#fef3c7';
          iconBadge.style.color = script.is_preset ? '#0284c7' : '#d97706';
        }
        if (titleEl) {
          titleEl.innerHTML = script.is_preset
            ? `Chi Tiết Kịch Bản Hệ Thống: <span style="color:#0284c7;">${escapeHtml(cleaned)}</span>`
            : `Chỉnh Sửa Kịch Bản: <span style="color:#0284c7;">${escapeHtml(cleaned)}</span>`;
        }
        if (subtitleEl) {
          subtitleEl.innerText = script.is_preset
            ? 'Mẫu kịch bản tối ưu chuẩn chống checkpoint & chống disconnect'
            : 'Tùy chỉnh các bước thực thi tự động theo luồng công việc';
        }
        if (nameInput) nameInput.value = cleaned || '';
        if (descInput) descInput.value = cleanTitle(script.description) || '';
        if (catSelect) catSelect.value = script.category || 'warmup';
        automationState.builderSteps = JSON.parse(JSON.stringify(script.steps || []));
      }
    } else {
      if (iconBadge) {
        iconBadge.innerHTML = SVG_ICONS.sparkle;
        iconBadge.style.background = '#e0f2fe';
        iconBadge.style.color = '#0284c7';
      }
      if (titleEl) {
        titleEl.innerHTML = `Tạo Kịch Bản Mới <span style="color:#0284c7;">(No-code)</span>`;
      }
      if (subtitleEl) {
        subtitleEl.innerText = 'Kéo thả hoặc thêm các bước điều khiển tự động không cần lập trình';
      }
      if (nameInput) nameInput.value = '';
      if (descInput) descInput.value = '';
      if (catSelect) catSelect.value = 'muse-ai';
      automationState.builderSteps = [
        { type: 'navigate', url: 'https://muse.ai' },
        { type: 'sleep', seconds: 5 },
        { type: 'scroll', distance: 600, direction: 'down' }
      ];
    }

    renderBuilderSteps();
    modal.style.display = 'flex';
  }

  function closeBuilderModal() {
    const modal = document.getElementById('modal-automation-builder');
    if (modal) modal.style.display = 'none';
    automationState.editingScriptId = null;
    automationState.builderSteps = [];
  }

  function addBuilderStep(type = 'navigate') {
    let newStep = { type };
    if (type === 'navigate') newStep.url = 'https://';
    else if (type === 'sleep') newStep.seconds = 5;
    else if (type === 'scroll') { newStep.distance = 500; newStep.direction = 'down'; }
    else if (type === 'click') newStep.selector = '';
    else if (type === 'type') { newStep.selector = ''; newStep.text = ''; }
    else if (type === 'press_key') newStep.key = 'Enter';
    else if (type === 'screenshot') newStep.filename = 'step_capture';
    else if (type === 'rotate_ip') newStep.note = 'Kích hoạt xoay IP qua link 4G Webhook';

    automationState.builderSteps.push(newStep);
    renderBuilderSteps();
  }

  function renderBuilderSteps() {
    const list = document.getElementById('builder-steps-list');
    if (!list) return;

    if (automationState.builderSteps.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 24px; color: #94a3b8; background: #f8fafc; border-radius: 10px; border: 1px dashed #cbd5e1;">
          Chưa có bước thực thi nào. Nhấn "+ Thêm Bước Mới" bên trên để bắt đầu.
        </div>
      `;
      return;
    }

    list.innerHTML = automationState.builderSteps.map((step, idx) => {
      let inputsHtml = '';

      if (step.type === 'navigate') {
        inputsHtml = `
          <div style="flex: 1;">
            <label style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 3px; display: block;">Địa chỉ URL cần truy cập:</label>
            <input type="text" class="poly-input step-field" data-idx="${idx}" data-field="url" value="${escapeHtml(step.url || '')}" placeholder="https://example.com" style="font-size: 12.5px; padding: 8px 12px;">
          </div>
        `;
      } else if (step.type === 'sleep') {
        inputsHtml = `
          <div style="display: flex; gap: 10px; align-items: center; flex: 1;">
            <div style="flex: 1;">
              <label style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 3px; display: block;">Thời gian chờ (giây):</label>
              <input type="number" class="poly-input step-field" data-idx="${idx}" data-field="seconds" value="${step.seconds || 5}" min="1" max="300" style="font-size: 12.5px; padding: 8px 12px;">
            </div>
            <div style="flex: 1;">
              <label style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 3px; display: block;">Hoặc Khoảng ngẫu nhiên (Min - Max):</label>
              <div style="display: flex; gap: 6px; align-items: center;">
                <input type="number" class="poly-input step-field" data-idx="${idx}" data-field="min" value="${step.min || ''}" placeholder="Min" style="font-size: 12px; padding: 6px;">
                <span>-</span>
                <input type="number" class="poly-input step-field" data-idx="${idx}" data-field="max" value="${step.max || ''}" placeholder="Max" style="font-size: 12px; padding: 6px;">
              </div>
            </div>
          </div>
        `;
      } else if (step.type === 'scroll') {
        inputsHtml = `
          <div style="display: flex; gap: 12px; align-items: center; flex: 1;">
            <div style="flex: 1;">
              <label style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 3px; display: block;">Khoảng cách cuộn (px):</label>
              <input type="number" class="poly-input step-field" data-idx="${idx}" data-field="distance" value="${step.distance || 600}" style="font-size: 12.5px; padding: 8px 12px;">
            </div>
            <div style="min-width: 160px; flex: 0.8;">
              <label style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 3px; display: block;">Hướng cuộn:</label>
              <select class="poly-input step-field" data-idx="${idx}" data-field="direction" style="font-size: 12.5px; padding: 8px 10px; width: 100%;">
                <option value="down" ${step.direction === 'down' ? 'selected' : ''}>Cuộn xuống</option>
                <option value="up" ${step.direction === 'up' ? 'selected' : ''}>Cuộn lên</option>
              </select>
            </div>
          </div>
        `;
      } else if (step.type === 'click') {
        inputsHtml = `
          <div style="flex: 1;">
            <label style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 3px; display: block;">CSS Selector của nút / phần tử cần nhấp:</label>
            <input type="text" class="poly-input step-field" data-idx="${idx}" data-field="selector" value="${escapeHtml(step.selector || '')}" placeholder="ví dụ: button.btn-login hoặc #submit-btn" style="font-size: 12.5px; padding: 8px 12px;">
          </div>
        `;
      } else if (step.type === 'type') {
        inputsHtml = `
          <div style="display: flex; gap: 10px; flex: 1;">
            <div style="flex: 1;">
              <label style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 3px; display: block;">CSS Selector ô nhập:</label>
              <input type="text" class="poly-input step-field" data-idx="${idx}" data-field="selector" value="${escapeHtml(step.selector || '')}" placeholder="input[type='text'] hoặc #prompt-box" style="font-size: 12.5px; padding: 8px 12px;">
            </div>
            <div style="flex: 1.5;">
              <label style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 3px; display: block;">Nội dung văn bản (Gõ mô phỏng người thật):</label>
              <input type="text" class="poly-input step-field" data-idx="${idx}" data-field="text" value="${escapeHtml(step.text || '')}" placeholder="Nhập văn bản cần điền..." style="font-size: 12.5px; padding: 8px 12px;">
            </div>
          </div>
        `;
      } else if (step.type === 'press_key') {
        inputsHtml = `
          <div style="width: 220px;">
            <label style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 3px; display: block;">Phím bấm:</label>
            <select class="poly-input step-field" data-idx="${idx}" data-field="key" style="font-size: 12.5px; padding: 8px 10px;">
              <option value="Enter" ${step.key === 'Enter' ? 'selected' : ''}>Enter ↵</option>
              <option value="Tab" ${step.key === 'Tab' ? 'selected' : ''}>Tab ⇥</option>
              <option value="Escape" ${step.key === 'Escape' ? 'selected' : ''}>Escape (ESC)</option>
              <option value="Space" ${step.key === 'Space' ? 'selected' : ''}>Space (Khoảng trắng)</option>
              <option value="ArrowDown" ${step.key === 'ArrowDown' ? 'selected' : ''}>Mũi tên xuống (Down)</option>
              <option value="ArrowUp" ${step.key === 'ArrowUp' ? 'selected' : ''}>Mũi tên lên (Up)</option>
            </select>
          </div>
        `;
      } else if (step.type === 'screenshot') {
        inputsHtml = `
          <div style="flex: 1;">
            <label style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 3px; display: block;">Tên file ảnh chụp lưu lại:</label>
            <input type="text" class="poly-input step-field" data-idx="${idx}" data-field="filename" value="${escapeHtml(step.filename || 'screen')}" placeholder="vd: muse_ai_login_success" style="font-size: 12.5px; padding: 8px 12px;">
          </div>
        `;
      } else if (step.type === 'rotate_ip') {
        inputsHtml = `
          <div style="flex: 1; font-size: 12px; color: #0284c7; background: #e0f2fe; padding: 8px 12px; border-radius: 8px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block; vertical-align:middle; margin-right:4px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> Kích hoạt xoay IP 4G Webhook đã cấu hình trong Hồ sơ/Proxy trước khi thực hiện bước tiếp theo.
          </div>
        `;
      } else if (step.type === 'log') {
        inputsHtml = `
          <div style="flex: 1;">
            <label style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 3px; display: block;">Ghi chú thông báo (Log):</label>
            <input type="text" class="poly-input step-field" data-idx="${idx}" data-field="message" value="${escapeHtml(step.message || '')}" placeholder="Ghi chú bước..." style="font-size: 12.5px; padding: 8px 12px;">
          </div>
        `;
      }

      return `
        <div class="automation-step-item" data-step-index="${idx}">
          <div class="automation-step-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="automation-step-badge">${idx + 1}</span>
              <select class="poly-input step-type-select" data-idx="${idx}" style="font-size: 12.5px; font-weight: 600; padding: 5px 10px; width: 250px;">
                ${Object.entries(STEP_TYPE_LABELS).map(([k, lbl]) => `
                  <option value="${k}" ${step.type === k ? 'selected' : ''}>${lbl}</option>
                `).join('')}
              </select>
            </div>
            
            <div style="display: flex; gap: 6px;">
              <button type="button" class="uiv-icon-btn btn-step-move-up" data-idx="${idx}" title="Di chuyển lên" ${idx === 0 ? 'disabled' : ''}>
                ${SVG_ICONS.arrowUp}
              </button>
              <button type="button" class="uiv-icon-btn btn-step-move-down" data-idx="${idx}" title="Di chuyển xuống" ${idx === automationState.builderSteps.length - 1 ? 'disabled' : ''}>
                ${SVG_ICONS.arrowDown}
              </button>
              <button type="button" class="uiv-icon-btn uiv-icon-btn-danger btn-step-delete" data-idx="${idx}" title="Xóa bước này">
                ${SVG_ICONS.trash}
              </button>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 12px;">
            ${inputsHtml}
          </div>
        </div>
      `;
    }).join('');

    // Attach step input listeners
    list.querySelectorAll('.step-type-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt(sel.dataset.idx, 10);
        const newType = sel.value;
        automationState.builderSteps[idx] = { type: newType };
        if (newType === 'navigate') automationState.builderSteps[idx].url = 'https://';
        else if (newType === 'sleep') automationState.builderSteps[idx].seconds = 5;
        else if (newType === 'scroll') { automationState.builderSteps[idx].distance = 600; automationState.builderSteps[idx].direction = 'down'; }
        renderBuilderSteps();
      });
    });

    list.querySelectorAll('.step-field').forEach(input => {
      input.addEventListener('input', () => {
        const idx = parseInt(input.dataset.idx, 10);
        const field = input.dataset.field;
        let val = input.value;
        if (input.type === 'number') val = val === '' ? '' : Number(val);
        automationState.builderSteps[idx][field] = val;
      });
    });

    list.querySelectorAll('.btn-step-move-up').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        if (idx > 0) {
          const temp = automationState.builderSteps[idx];
          automationState.builderSteps[idx] = automationState.builderSteps[idx - 1];
          automationState.builderSteps[idx - 1] = temp;
          renderBuilderSteps();
        }
      });
    });

    list.querySelectorAll('.btn-step-move-down').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        if (idx < automationState.builderSteps.length - 1) {
          const temp = automationState.builderSteps[idx];
          automationState.builderSteps[idx] = automationState.builderSteps[idx + 1];
          automationState.builderSteps[idx + 1] = temp;
          renderBuilderSteps();
        }
      });
    });

    list.querySelectorAll('.btn-step-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        automationState.builderSteps.splice(idx, 1);
        renderBuilderSteps();
      });
    });
  }

  async function saveBuilderScript() {
    const nameInput = document.getElementById('builder-script-name');
    const descInput = document.getElementById('builder-script-desc');
    const catSelect = document.getElementById('builder-script-category');

    const name = nameInput ? nameInput.value.trim() : '';
    const description = descInput ? descInput.value.trim() : '';
    const category = catSelect ? catSelect.value : 'custom';

    if (!name) {
      notify('Vui lòng nhập tên kịch bản!', 'warning');
      return;
    }

    if (automationState.builderSteps.length === 0) {
      notify('Kịch bản phải có ít nhất 1 bước thao tác!', 'warning');
      return;
    }

    const payload = {
      name,
      description,
      category,
      steps: automationState.builderSteps
    };

    try {
      let res;
      if (automationState.editingScriptId) {
        // If editing a preset, prompt or create as a new custom script
        const existing = automationState.scripts.find(s => s.id === automationState.editingScriptId);
        if (existing && existing.is_preset) {
          payload.name = `${name} (Bản sao)`;
          res = await fetch('/api/v1/automation/scripts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } else {
          res = await fetch(`/api/v1/automation/scripts/${automationState.editingScriptId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }
      } else {
        res = await fetch('/api/v1/automation/scripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (data.success) {
        closeBuilderModal();
        await fetchAutomationScripts();
        notify('Đã lưu kịch bản thành công!', 'success');
      } else {
        notify('Lỗi lưu kịch bản: ' + (data.error || 'Không rõ nguyên nhân'), 'danger');
      }
    } catch (err) {
      console.error('[AutomationUI] Lỗi lưu kịch bản:', err);
      notify('Có lỗi xảy ra trong quá trình lưu kịch bản!', 'danger');
    }
  }

  async function cloneScript(scriptId) {
    const script = automationState.scripts.find(s => s.id === scriptId);
    if (!script) return;

    try {
      const res = await fetch('/api/v1/automation/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${cleanTitle(script.name)} (Bản sao)`,
          description: script.description,
          category: script.category,
          steps: script.steps
        })
      });
      const data = await res.json();
      if (data.success) {
        await fetchAutomationScripts();
        notify(`Đã nhân bản kịch bản "${cleanTitle(script.name)}" thành công!`, 'success');
      }
    } catch (err) {
      console.error('[AutomationUI] Lỗi nhân bản:', err);
    }
  }

  async function deleteScript(scriptId) {
    const confirmed = typeof window.showConfirmDialog === 'function'
      ? await window.showConfirmDialog({
          title: 'Xóa Kịch Bản',
          message: 'Bạn có chắc chắn muốn xóa kịch bản này không? Thao tác này không thể hoàn tác.',
          type: 'danger',
          confirmText: 'Xóa Kịch Bản',
          cancelText: 'Hủy'
        })
      : confirm('Bạn có chắc chắn muốn xóa kịch bản này không?');
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/v1/automation/scripts/${scriptId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        await fetchAutomationScripts();
      } else {
        notify(data.error || 'Không thể xóa kịch bản này', 'danger');
      }
    } catch (err) {
      console.error('[AutomationUI] Lỗi xóa kịch bản:', err);
    }
  }

  // ==========================================
  // BATCH RUNNER MODAL
  // ==========================================
  async function openBatchRunnerModal(defaultScriptId = null) {
    const modal = document.getElementById('modal-automation-batch');
    if (!modal) return;

    // Populate script dropdown
    const scriptSelect = document.getElementById('batch-select-script');
    if (scriptSelect) {
      scriptSelect.innerHTML = automationState.scripts.map(s => `
        <option value="${s.id}" ${s.id === defaultScriptId ? 'selected' : ''}>
          ${escapeHtml(cleanTitle(s.name))} (${s.steps ? s.steps.length : 0} bước)
        </option>
      `).join('');
    }

    // Populate profiles
    await populateBatchProfilesList();

    modal.style.display = 'flex';
  }

  function closeBatchModal() {
    const modal = document.getElementById('modal-automation-batch');
    if (modal) modal.style.display = 'none';
  }

  async function populateBatchProfilesList() {
    const container = document.getElementById('batch-profiles-checklist');
    const groupSelect = document.getElementById('batch-filter-group');
    if (!container) return;

    try {
      const res = await fetch('/api/v1/profiles');
      const data = await res.json();
      const profiles = (data && data.profiles) ? data.profiles : [];

      // Collect unique groups
      const groups = Array.from(new Set(profiles.map(p => p.group_name || 'Mặc định')));
      if (groupSelect) {
        groupSelect.innerHTML = `<option value="all">Tất cả các nhóm (${profiles.length} hồ sơ)</option>` +
          groups.map(g => `<option value="${escapeHtml(g)}">Nhóm: ${escapeHtml(g)}</option>`).join('');
      }

      if (profiles.length === 0) {
        container.innerHTML = '<div style="padding: 16px; color: #94a3b8; text-align: center;">Chưa có hồ sơ nào. Hãy tạo hồ sơ trước.</div>';
        return;
      }

      const hasSelection = (window.selectedProfileIds && window.selectedProfileIds.size > 0);

      container.innerHTML = profiles.map(p => {
        const isChecked = hasSelection ? window.selectedProfileIds.has(p.id) : true;
        const hasProxy = !!(p.proxy_host || p.proxy);
        const proxyBadge = hasProxy
          ? `<span style="background: #e0f2fe; color: #0284c7; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Proxy ISP/USA
            </span>`
          : `<span style="background: #f1f5f9; color: #64748b; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 500;">Mạng gốc</span>`;

        return `
          <label class="batch-profile-row" data-group="${escapeHtml(p.group_name || 'Mặc định')}" style="display: flex; align-items: center; justify-content: space-between; padding: 9px 14px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.15s ease;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <input type="checkbox" class="batch-profile-checkbox" value="${p.id}" ${isChecked ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: #0284c7; cursor: pointer;">
              <span style="font-size: 13px; font-weight: 600; color: #0f172a;">${escapeHtml(p.name)}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              ${proxyBadge}
              <span style="font-size: 11px; color: #94a3b8;">${escapeHtml(p.group_name || 'Mặc định')}</span>
            </div>
          </label>
        `;
      }).join('');

      updateBatchSelectedCount();

      // Bind checkbox change
      container.querySelectorAll('.batch-profile-checkbox').forEach(cb => {
        cb.addEventListener('change', updateBatchSelectedCount);
      });
    } catch (err) {
      console.error('[AutomationUI] Lỗi tải profiles cho batch:', err);
    }
  }

  function filterBatchProfileList() {
    const groupSelect = document.getElementById('batch-filter-group');
    const selectedGroup = groupSelect ? groupSelect.value : 'all';
    document.querySelectorAll('.batch-profile-row').forEach(row => {
      if (selectedGroup === 'all' || row.dataset.group === selectedGroup) {
        row.style.display = 'flex';
      } else {
        row.style.display = 'none';
      }
    });
    updateBatchSelectedCount();
  }

  function toggleAllProfileCheckboxes(check) {
    document.querySelectorAll('.batch-profile-row').forEach(row => {
      if (row.style.display !== 'none') {
        const cb = row.querySelector('.batch-profile-checkbox');
        if (cb) cb.checked = check;
      }
    });
    updateBatchSelectedCount();
  }

  function updateBatchSelectedCount() {
    const checked = document.querySelectorAll('.batch-profile-row:not([style*="display: none"]) .batch-profile-checkbox:checked');
    const countEl = document.getElementById('batch-selected-count');
    if (countEl) countEl.innerText = checked.length;
  }

  async function startBatchExecution() {
    const scriptSelect = document.getElementById('batch-select-script');
    const concurrencyInput = document.getElementById('batch-concurrency');
    const autoCloseCheck = document.getElementById('batch-auto-close');
    const proxyGuardCheck = document.getElementById('batch-proxy-guard');

    const script_id = scriptSelect ? scriptSelect.value : null;
    const concurrency = concurrencyInput ? Math.max(1, parseInt(concurrencyInput.value, 10) || 2) : 2;
    const auto_close = autoCloseCheck ? autoCloseCheck.checked : true;
    const bypass_proxy_guard = proxyGuardCheck ? !proxyGuardCheck.checked : false;

    const checkedBoxes = document.querySelectorAll('.batch-profile-row:not([style*="display: none"]) .batch-profile-checkbox:checked');
    const profile_ids = Array.from(checkedBoxes).map(cb => cb.value);

    if (!script_id) {
      notify('Vui lòng chọn kịch bản cần thực thi!', 'warning');
      return;
    }

    if (profile_ids.length === 0) {
      notify('Vui lòng chọn ít nhất 1 hồ sơ để chạy!', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/v1/automation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script_id,
          profile_ids,
          concurrency,
          auto_close,
          bypass_proxy_guard
        })
      });

      const data = await res.json();
      if (data.success) {
        closeBatchModal();
        scrollToMonitor();
        checkAutomationStatus();
      } else {
        notify(data.error || 'Không thể khởi động batch runner', 'danger');
      }
    } catch (err) {
      console.error('[AutomationUI] Lỗi chạy batch:', err);
      notify('Lỗi kết nối máy chủ khi khởi chạy tự động hóa', 'danger');
    }
  }

  // ==========================================
  // REAL-TIME MONITOR & STATUS POLLING
  // ==========================================
  function scrollToMonitor() {
    const monitor = document.getElementById('automation-monitor-card');
    if (monitor) {
      monitor.style.display = 'block';
      monitor.scrollIntoView({ behavior: 'smooth' });
    }
  }

  async function checkAutomationStatus() {
    try {
      const res = await fetch('/api/v1/automation/status');
      const data = await res.json();
      if (data && data.success) {
        automationState.activeRun = data.status;
        renderActiveStatus(data.status);

        if (data.status && data.status.is_running) {
          if (!automationState.pollTimer) {
            automationState.pollTimer = setInterval(checkAutomationStatus, 1000);
          }
        } else {
          if (automationState.pollTimer) {
            clearInterval(automationState.pollTimer);
            automationState.pollTimer = null;
          }
        }
      }
    } catch (err) {
      console.error('[AutomationUI] Lỗi lấy status:', err);
    }
  }

  function renderActiveStatus(status) {
    const monitorCard = document.getElementById('automation-monitor-card');
    if (!monitorCard) return;

    if (!status || (!status.is_running && status.total === 0)) {
      monitorCard.style.display = 'none';
      return;
    }

    monitorCard.style.display = 'block';

    const percent = status.total > 0 ? Math.round((status.completed / status.total) * 100) : 0;
    const progressFill = document.getElementById('automation-progress-fill');
    if (progressFill) {
      progressFill.style.width = `${percent}%`;
    }

    const percentText = document.getElementById('automation-progress-percent');
    if (percentText) percentText.innerText = `${percent}%`;

    const completedText = document.getElementById('stat-completed-count');
    if (completedText) completedText.innerText = `${status.completed}/${status.total}`;

    const runningText = document.getElementById('stat-running-count');
    if (runningText) runningText.innerText = status.running;

    const failedText = document.getElementById('stat-failed-count');
    if (failedText) failedText.innerText = status.failed;

    const statusBadge = document.getElementById('automation-status-badge');
    if (statusBadge) {
      if (status.is_running) {
        statusBadge.innerHTML = `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981; animation:pulse 1.5s infinite; margin-right:5px;"></span> Đang Chạy (${status.concurrency} Luồng Song Song)`;
        statusBadge.style.background = '#dcfce7';
        statusBadge.style.color = '#15803d';
      } else {
        statusBadge.innerHTML = `<span style="display:inline-flex; align-items:center; gap:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Hoàn Tất Tác Vụ</span>`;
        statusBadge.style.background = '#e0f2fe';
        statusBadge.style.color = '#0369a1';
      }
    }

    // Render log lines
    const logBox = document.getElementById('automation-live-logs');
    if (logBox && Array.isArray(status.recent_logs)) {
      const logsHtml = status.recent_logs.map(line => {
        let color = '#94a3b8';
        if (line.includes('[SUCCESS]') || line.includes('✅') || line.includes('HOÀN THÀNH')) color = '#34d399';
        else if (line.includes('[ERROR]') || line.includes('❌') || line.includes('CHẶN AN TOÀN')) color = '#f87171';
        else if (line.includes('[STEP]')) color = '#38bdf8';
        else if (line.includes('[WARN]') || line.includes('⚠️')) color = '#fbbf24';
        else if (line.includes('[START]')) color = '#a78bfa';

        return `<div style="color: ${color}; margin-bottom: 2px;">${escapeHtml(line)}</div>`;
      }).join('');

      logBox.innerHTML = logsHtml || '<span style="color:#64748b;">// Đang ghi nhận các bước thực thi...</span>';
      logBox.scrollTop = logBox.scrollHeight;
    }
  }

  async function stopAutomationRun() {
    const confirmed = typeof window.showConfirmDialog === 'function'
      ? await window.showConfirmDialog({
          title: 'Dừng Tiến Trình',
          message: 'Bạn có chắc chắn muốn dừng toàn bộ tiến trình tự động hóa đang chạy không?',
          type: 'warning',
          confirmText: 'Dừng Ngay',
          cancelText: 'Tiếp tục'
        })
      : confirm('Bạn có chắc chắn muốn dừng toàn bộ tiến trình tự động hóa đang chạy không?');
    if (!confirmed) return;
    try {
      const res = await fetch('/api/v1/automation/stop', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        notify('Đã gửi yêu cầu dừng tiến trình.', 'info');
        checkAutomationStatus();
      }
    } catch (err) {
      console.error('[AutomationUI] Lỗi dừng automation:', err);
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

  // Expose to window
  window.AutomationUI = {
    init: initAutomationUI,
    fetchScripts: fetchAutomationScripts,
    openBatchModal: openBatchRunnerModal,
    openBuilderModal: openScriptBuilderModal,
    checkStatus: checkAutomationStatus
  };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutomationUI);
  } else {
    initAutomationUI();
  }
})();
