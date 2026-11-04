const fs = require('fs');

let code = fs.readFileSync('public/js/automation-ui.js', 'utf8');

const regexModal = /function openScriptBuilderModal\(scriptId = null\) \{[\s\S]*?modal\.style\.display = 'flex';\s*\}/;

const newModalFunc = `function openScriptBuilderModal(scriptId = null) {
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
            ? \`Chi Tiết Kịch Bản Hệ Thống: <span style="color:#0284c7;">\${escapeHtml(cleaned)}</span>\`
            : \`Chỉnh Sửa Kịch Bản: <span style="color:#0284c7;">\${escapeHtml(cleaned)}</span>\`;
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
        titleEl.innerHTML = \`Tạo Kịch Bản Mới <span style="color:#0284c7;">(No-code)</span>\`;
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
  }`;

code = code.replace(regexModal, newModalFunc);
fs.writeFileSync('public/js/automation-ui.js', code, 'utf8');
console.log('Successfully updated openScriptBuilderModal in public/js/automation-ui.js');
