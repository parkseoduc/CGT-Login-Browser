const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Double plus fix
html = html.replace('<span>+ Tạo Kịch Bản Mới</span>', '<span>Tạo Kịch Bản Mới</span>');
html = html.replace('<span>+ Thêm Bước Mới</span>', '<span>Thêm Bước Mới</span>');

// 2. Stop and clear log buttons
const oldLogBtns = `<button class="uiv-btn uiv-btn-secondary" id="btn-automation-clear-logs" style="font-size: 11.5px; padding: 4px 10px;">Xóa Log</button>
                  <button class="uiv-btn uiv-btn-danger" id="btn-automation-stop-run" style="font-size: 11.5px; padding: 4px 12px; font-weight: 700;">⏹️ Dừng Tiến Trình</button>`;

const newLogBtns = `<button class="uiv-btn uiv-btn-secondary" id="btn-automation-clear-logs" style="font-size: 11.5px; padding: 5px 12px; display: inline-flex; align-items: center; gap: 5px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    <span>Xóa Log</span>
                  </button>
                  <button class="uiv-btn uiv-btn-danger" id="btn-automation-stop-run" style="font-size: 11.5px; padding: 5px 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 5px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg>
                    <span>Dừng Tiến Trình</span>
                  </button>`;

html = html.replace(oldLogBtns, newLogBtns);

// 3. Category select
const oldCatSelect = `<select id="builder-script-category" class="poly-input" style="font-size: 13px;">
              <option value="muse-ai">🤖 Muse AI</option>
              <option value="warmup">🌾 Nuôi Cookie</option>
              <option value="social">📱 Video Ngắn (Shorts)</option>
              <option value="audit">🛡️ Kiểm Tra Vân Tay</option>
              <option value="custom">⚙️ Tùy Biến</option>
            </select>`;

const newCatSelect = `<select id="builder-script-category" class="poly-input" style="font-size: 13px;">
              <option value="muse-ai">Muse AI & Automation</option>
              <option value="warmup">Nuôi Cookie & Lịch Sử</option>
              <option value="social">Video Ngắn (Shorts / Reels)</option>
              <option value="audit">Kiểm Tra Dấu Vân Tay (Audit)</option>
              <option value="custom">Kịch Bản Tùy Biến</option>
            </select>`;

html = html.replace(oldCatSelect, newCatSelect);

// 4. Modal Header for Builder
const oldBuilderHeader = `<div class="modal-header" style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0;">
        <div>
          <h2 id="builder-modal-title" style="font-size: 17px; font-weight: 700; color: #0f172a;">✨ Trình Thiết Lập Kịch Bản No-code</h2>
          <p style="font-size: 12px; color: #64748b; margin-top: 2px;">Kéo thả hoặc thêm các bước điều khiển tự động không cần lập trình</p>
        </div>
        <button class="modal-close" id="btn-builder-close-modal" title="Đóng">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>`;

const newBuilderHeader = `<div class="modal-header" style="padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
          <div id="builder-modal-icon-badge" style="width: 38px; height: 38px; border-radius: 10px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>
          </div>
          <div style="flex: 1; min-width: 0;">
            <h2 id="builder-modal-title" style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0; line-height: 1.3; word-break: break-word;">Trình Thiết Lập Kịch Bản No-code</h2>
            <p id="builder-modal-subtitle" style="font-size: 12px; color: #64748b; margin: 2px 0 0 0;">Kéo thả hoặc thêm các bước điều khiển tự động không cần lập trình</p>
          </div>
        </div>
        <button class="modal-close" id="btn-builder-close-modal" title="Đóng">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>`;

html = html.replace(oldBuilderHeader, newBuilderHeader);

fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Successfully updated public/index.html');
