const fs = require('fs');

let code = fs.readFileSync('public/js/automation-ui.js', 'utf8');

// Insert notify helper near the top
const helperInsert = `  // Toast helper
  function notify(msg, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, type);
    } else {
      console.log(\`[Toast \${type}]:\`, msg);
    }
  }
`;

if (!code.includes('function notify(')) {
  code = code.replace('function cleanTitle(str) {', helperInsert + '\n  function cleanTitle(str) {');
}

// Replace openScriptBuilderModal header handling
const oldOpenModalHeader = `      if (scriptId) {
        const script = automationState.scripts.find(s => s.id === scriptId);
        if (script) {
          const cleaned = cleanTitle(script.name);
          if (titleEl) {
            titleEl.innerHTML = script.is_preset
              ? \`<span style="display: inline-flex; align-items: center; gap: 7px;">\${SVG_ICONS.eye} Chi Tiết Kịch Bản Hệ Thống: <strong>\${escapeHtml(cleaned)}</strong></span>\`
              : \`<span style="display: inline-flex; align-items: center; gap: 7px;">\${SVG_ICONS.edit} Chỉnh Sửa Kịch Bản: <strong>\${escapeHtml(cleaned)}</strong></span>\`;
          }
          if (nameInput) nameInput.value = cleaned || '';
          if (descInput) descInput.value = cleanTitle(script.description) || '';
          if (catSelect) catSelect.value = script.category || 'warmup';
          automationState.builderSteps = JSON.parse(JSON.stringify(script.steps || []));
        }
      } else {
        if (titleEl) {
          titleEl.innerHTML = \`<span style="display: inline-flex; align-items: center; gap: 7px;">\${SVG_ICONS.sparkle} Tạo Kịch Bản Tự Động Hóa Mới (No-code)</span>\`;
        }
        if (nameInput) nameInput.value = '';
        if (descInput) descInput.value = '';
        if (catSelect) catSelect.value = 'muse-ai';`;

const newOpenModalHeader = `      const iconBadge = document.getElementById('builder-modal-icon-badge');
      const subtitleEl = document.getElementById('builder-modal-subtitle');

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
        if (catSelect) catSelect.value = 'muse-ai';`;

code = code.replace(oldOpenModalHeader, newOpenModalHeader);

// Direction select update
code = code.replace(
  /<div style="width: 140px;">[\s\S]*?<\/select>\s*<\/div>/,
  `<div style="min-width: 160px; flex: 0.8;">
              <label style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 3px; display: block;">Hướng cuộn:</label>
              <select class="poly-input step-field" data-idx="\${idx}" data-field="direction" style="font-size: 12.5px; padding: 8px 10px; width: 100%;">
                <option value="down" \${step.direction === 'down' ? 'selected' : ''}>Cuộn xuống</option>
                <option value="up" \${step.direction === 'up' ? 'selected' : ''}>Cuộn lên</option>
              </select>
            </div>`
);

// Replace all alerts with notify
code = code.replace("alert('Vui lòng nhập tên kịch bản!');", "notify('Vui lòng nhập tên kịch bản!', 'warning');");
code = code.replace("alert('Kịch bản phải có ít nhất 1 bước thao tác!');", "notify('Kịch bản phải có ít nhất 1 bước thao tác!', 'warning');");
code = code.replace("alert('Đã lưu kịch bản thành công!');", "notify('Đã lưu kịch bản thành công!', 'success');");
code = code.replace("alert('Lỗi lưu kịch bản: ' + (data.error || 'Không rõ nguyên nhân'));", "notify('Lỗi lưu kịch bản: ' + (data.error || 'Không rõ nguyên nhân'), 'danger');");
code = code.replace("alert('Có lỗi xảy ra trong quá trình lưu kịch bản!');", "notify('Có lỗi xảy ra trong quá trình lưu kịch bản!', 'danger');");
code = code.replace("alert(`Đã nhân bản kịch bản \"${cleanTitle(script.name)}\" thành công!`);", "notify(`Đã nhân bản kịch bản \"${cleanTitle(script.name)}\" thành công!`, 'success');");
code = code.replace("alert(data.error || 'Không thể xóa kịch bản này');", "notify(data.error || 'Không thể xóa kịch bản này', 'danger');");
code = code.replace("alert('Vui lòng chọn kịch bản cần thực thi!');", "notify('Vui lòng chọn kịch bản cần thực thi!', 'warning');");
code = code.replace("alert('Vui lòng chọn ít nhất 1 hồ sơ để chạy!');", "notify('Vui lòng chọn ít nhất 1 hồ sơ để chạy!', 'warning');");
code = code.replace("alert(data.error || 'Không thể khởi động batch runner');", "notify(data.error || 'Không thể khởi động batch runner', 'danger');");
code = code.replace("alert('Lỗi kết nối máy chủ khi khởi chạy tự động hóa');", "notify('Lỗi kết nối máy chủ khi khởi chạy tự động hóa', 'danger');");
code = code.replace("alert('Đã gửi yêu cầu dừng tiến trình.');", "notify('Đã gửi yêu cầu dừng tiến trình.', 'info');");

// Update deleteScript confirm
const oldDeleteConfirm = `  async function deleteScript(scriptId) {
    const script = automationState.scripts.find(s => s.id === scriptId);
    if (!script || script.is_preset) return;

    if (!confirm('Bạn có chắc chắn muốn xóa kịch bản này không?')) return;`;

const newDeleteConfirm = `  async function deleteScript(scriptId) {
    const script = automationState.scripts.find(s => s.id === scriptId);
    if (!script || script.is_preset) return;

    const confirmed = typeof window.showConfirmDialog === 'function'
      ? await window.showConfirmDialog({
          title: 'Xóa Kịch Bản',
          message: \`Bạn có chắc chắn muốn xóa kịch bản "<strong>\${escapeHtml(cleanTitle(script.name))}</strong>" không? Thao tác này không thể hoàn tác.\`,
          type: 'danger',
          confirmText: 'Xóa Kịch Bản',
          cancelText: 'Hủy'
        })
      : confirm('Bạn có chắc chắn muốn xóa kịch bản này không?');

    if (!confirmed) return;`;

code = code.replace(oldDeleteConfirm, newDeleteConfirm);

// Update stopAutomationRunner confirm
const oldStopConfirm = `  async function stopAutomationRunner() {
    if (!confirm('Bạn có chắc chắn muốn dừng toàn bộ tiến trình tự động hóa đang chạy không?')) return;`;

const newStopConfirm = `  async function stopAutomationRunner() {
    const confirmed = typeof window.showConfirmDialog === 'function'
      ? await window.showConfirmDialog({
          title: 'Dừng Tiến Trình',
          message: 'Bạn có chắc chắn muốn dừng toàn bộ tiến trình tự động hóa đang chạy không?',
          type: 'warning',
          confirmText: 'Dừng Ngay',
          cancelText: 'Tiếp tục'
        })
      : confirm('Bạn có chắc chắn muốn dừng toàn bộ tiến trình tự động hóa đang chạy không?');

    if (!confirmed) return;`;

code = code.replace(oldStopConfirm, newStopConfirm);

fs.writeFileSync('public/js/automation-ui.js', code, 'utf8');
console.log('Successfully updated public/js/automation-ui.js');
