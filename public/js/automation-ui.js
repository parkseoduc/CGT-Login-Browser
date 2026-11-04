/**
 * OmniBrowser No-code Automation Studio (Lượt 2)
 * Giữ kết nối an toàn cho Muse AI, Nuôi Cookie tự nhiên & Chạy đa luồng
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

  const CATEGORY_NAMES = {
    'all': 'Tất cả',
    'muse-ai': '🤖 Muse AI & Tools',
    'warmup': '🌾 Nuôi Cookie & Lịch Sử',
    'social': '📱 Video Ngắn (TikTok/Shorts)',
    'audit': '🛡️ Kiểm Tra Dấu Vân Tay',
    'custom': '⚙️ Kịch Bản Tùy Biến'
  };

  const STEP_TYPE_LABELS = {
    'navigate': '🌐 Mở trang Web (Navigate)',
    'sleep': '⏳ Chờ thời gian (Sleep)',
    'scroll': '📜 Cuộn trang tự nhiên (Scroll)',
    'click': '🖱️ Nhấp chuột (Click)',
    'type': '⌨️ Gõ văn bản mô phỏng người thật (Type)',
    'press_key': '🔘 Nhấn phím đặc biệt (Key)',
    'screenshot': '📸 Chụp ảnh màn hình (Screenshot)',
    'rotate_ip': '🔄 Xoay IP 4G Webhook (Rotate IP)'
  };

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
          <div style="font-size: 32px; margin-bottom: 10px;">📋</div>
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
        : `<span class="automation-badge-custom">⚙️ Tự Thiết Lập</span>`;

      // Render step pills preview (max 3 pills + more)
      let stepPills = steps.slice(0, 3).map((st, idx) => {
        let label = st.type;
        if (st.type === 'navigate') label = `🌐 Mở: ${(st.url || '').replace(/^https?:\/\//, '').split('/')[0]}`;
        else if (st.type === 'sleep') label = `⏳ Chờ ${st.seconds || (st.min + '-' + st.max)}s`;
        else if (st.type === 'scroll') label = `📜 Cuộn ${st.distance || 500}px`;
        else if (st.type === 'click') label = `🖱️ Click ${st.selector || 'button'}`;
        else if (st.type === 'type') label = `⌨️ Nhập chữ`;
        else if (st.type === 'screenshot') label = `📸 Chụp ảnh`;
        else if (st.type === 'rotate_ip') label = `🔄 Xoay IP 4G`;
        return `<span style="background: #ffffff; border: 1px solid #e2e8f0; padding: 2px 8px; border-radius: 6px; font-size: 11px; white-space: nowrap;">${idx + 1}. ${label}</span>`;
      }).join('<span style="color:#94a3b8; font-size:11px;">➔</span>');

      if (steps.length > 3) {
        stepPills += `<span style="color:#64748b; font-size:11px; margin-left: 4px;">+${steps.length - 3} bước nữa</span>`;
      }

      return `
        <div class="automation-card" data-script-id="${script.id}">
          <div>
            <div class="automation-card-header">
              <span style="font-size: 12px; font-weight: 600; color: #0284c7;">${CATEGORY_NAMES[script.category] || script.category}</span>
              ${badgeHtml}
            </div>
            <div class="automation-card-title">${escapeHtml(script.name)}</div>
            <div class="automation-card-desc">${escapeHtml(script.description || 'Không có mô tả')}</div>
            
            <div class="automation-steps-summary" title="${steps.length} bước thực thi">
              ${stepPills || '<span style="color:#94a3b8;">Chưa có bước thực thi</span>'}
            </div>
          </div>

          <div class="automation-card-actions">
            <button class="uiv-cta-emerald btn-run-single-script" data-id="${script.id}" style="padding: 7px 14px; font-size: 12.5px; display: flex; align-items: center; gap: 5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>Chạy Ngay</span>
            </button>
            <button class="uiv-btn uiv-btn-secondary btn-edit-script" data-id="${script.id}" style="padding: 7px 12px; font-size: 12.5px;">
              ${isPreset ? '👁️ Xem Chi Tiết' : '✏️ Chỉnh Sửa'}
            </button>
            <button class="uiv-btn uiv-btn-secondary btn-clone-script" data-id="${script.id}" title="Nhân bản kịch bản này" style="padding: 7px 10px; font-size: 12.5px;">
              📋
            </button>
            ${!isPreset ? `
              <button class="uiv-btn uiv-btn-danger btn-delete-script" data-id="${script.id}" title="Xóa kịch bản" style="padding: 7px 10px; font-size: 12.5px;">
                🗑️
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
    const nameInput = document.getElementById('builder-script-name');
    const descInput = document.getElementById('builder-script-desc');
    const catSelect = document.getElementById('builder-script-category');

    if (scriptId) {
      const script = automationState.scripts.find(s => s.id === scriptId);
      if (script) {
        if (titleEl) titleEl.innerText = script.is_preset ? `👁️ Chi Tiết Kịch Bản Hệ Thống: ${script.name}` : `✏️ Chỉnh Sửa Kịch Bản: ${script.name}`;
        if (nameInput) nameInput.value = script.name || '';
        if (descInput) descInput.value = script.description || '';
        if (catSelect) catSelect.value = script.category || 'warmup';
        automationState.builderSteps = JSON.parse(JSON.stringify(script.steps || []));
      }
    } else {
      if (titleEl) titleEl.innerText = '✨ Tạo Kịch Bản Tự Động Hóa Mới (No-code)';
      if (nameInput) nameInput.value = '';
      if (descInput) descInput.value = '';
      if (catSelect) catSelect.value = 'muse-ai';
      // Default initial step for Muse AI
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
          Chưa có bước thực thi nào. Nhấn "+ Thêm Bước" bên dưới để bắt đầu.
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
            <div style="width: 140px;">
              <label style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 3px; display: block;">Hướng cuộn:</label>
              <select class="poly-input step-field" data-idx="${idx}" data-field="direction" style="font-size: 12.5px; padding: 8px 10px;">
                <option value="down" ${step.direction === 'down' ? 'selected' : ''}>Cuộn xuống ⬇️</option>
                <option value="up" ${step.direction === 'up' ? 'selected' : ''}>Cuộn lên ⬆️</option>
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
              <option value="ArrowDown" ${step.key === 'ArrowDown' ? 'selected' : ''}>Arrow Down ⬇️</option>
              <option value="ArrowUp" ${step.key === 'ArrowUp' ? 'selected' : ''}>Arrow Up ⬆️</option>
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
            ℹ️ Kích hoạt xoay IP 4G Webhook đã cấu hình trong Hồ sơ/Proxy trước khi thực hiện bước tiếp theo.
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
            
            <div style="display: flex; gap: 4px;">
              <button type="button" class="uiv-btn uiv-btn-secondary btn-step-move-up" data-idx="${idx}" title="Di chuyển lên" ${idx === 0 ? 'disabled' : ''} style="padding: 4px 8px; font-size: 11px;">⬆️</button>
              <button type="button" class="uiv-btn uiv-btn-secondary btn-step-move-down" data-idx="${idx}" title="Di chuyển xuống" ${idx === automationState.builderSteps.length - 1 ? 'disabled' : ''} style="padding: 4px 8px; font-size: 11px;">⬇️</button>
              <button type="button" class="uiv-btn uiv-btn-danger btn-step-delete" data-idx="${idx}" title="Xóa bước này" style="padding: 4px 8px; font-size: 11px;">🗑️</button>
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
      alert('Vui lòng nhập tên kịch bản!');
      return;
    }

    if (automationState.builderSteps.length === 0) {
      alert('Kịch bản phải có ít nhất 1 bước thao tác!');
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
        alert('✅ Đã lưu kịch bản thành công!');
      } else {
        alert('Lỗi lưu kịch bản: ' + (data.error || 'Không rõ nguyên nhân'));
      }
    } catch (err) {
      console.error('[AutomationUI] Lỗi lưu kịch bản:', err);
      alert('Có lỗi xảy ra trong quá trình lưu kịch bản!');
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
          name: `${script.name} (Bản sao)`,
          description: script.description,
          category: script.category,
          steps: script.steps
        })
      });
      const data = await res.json();
      if (data.success) {
        await fetchAutomationScripts();
        alert(`✅ Đã nhân bản kịch bản "${script.name}" thành công!`);
      }
    } catch (err) {
      console.error('[AutomationUI] Lỗi nhân bản:', err);
    }
  }

  async function deleteScript(scriptId) {
    if (!confirm('Bạn có chắc chắn muốn xóa kịch bản này không?')) return;
    try {
      const res = await fetch(`/api/v1/automation/scripts/${scriptId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        await fetchAutomationScripts();
      } else {
        alert(data.error || 'Không thể xóa kịch bản này');
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
          ${escapeHtml(s.name)} (${s.steps ? s.steps.length : 0} bước)
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

      container.innerHTML = profiles.map(p => {
        const hasProxy = !!(p.proxy_host || p.proxy);
        const proxyBadge = hasProxy
          ? `<span style="background: #e0f2fe; color: #0284c7; padding: 2px 6px; border-radius: 4px; font-size: 11px;">🛡️ Proxy ISP/USA</span>`
          : `<span style="background: #f1f5f9; color: #64748b; padding: 2px 6px; border-radius: 4px; font-size: 11px;">Mạng gốc</span>`;

        return `
          <label class="batch-profile-row" data-group="${escapeHtml(p.group_name || 'Mặc định')}" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #f1f5f9; cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <input type="checkbox" class="batch-profile-checkbox" value="${p.id}" checked style="width: 16px; height: 16px; accent-color: #0284c7;">
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
      alert('Vui lòng chọn kịch bản cần thực thi!');
      return;
    }

    if (profile_ids.length === 0) {
      alert('Vui lòng chọn ít nhất 1 hồ sơ để chạy!');
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
        // Switch to monitor section and start polling
        scrollToMonitor();
        checkAutomationStatus();
      } else {
        alert(data.error || 'Không thể khởi động batch runner');
      }
    } catch (err) {
      console.error('[AutomationUI] Lỗi chạy batch:', err);
      alert('Lỗi kết nối máy chủ khi khởi chạy tự động hóa');
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
        statusBadge.innerHTML = `✅ Hoàn Tất Tác Vụ`;
        statusBadge.style.background = '#e0f2fe';
        statusBadge.style.color = '#0369a1';
      }
    }

    // Render log lines
    const logBox = document.getElementById('automation-live-logs');
    if (logBox && Array.isArray(status.recent_logs)) {
      const logsHtml = status.recent_logs.map(line => {
        let color = '#94a3b8';
        if (line.includes('[SUCCESS]') || line.includes('✅')) color = '#34d399';
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
    if (!confirm('Bạn có chắc chắn muốn dừng toàn bộ tiến trình tự động hóa đang chạy không?')) return;
    try {
      const res = await fetch('/api/v1/automation/stop', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Đã gửi yêu cầu dừng tiến trình.');
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
