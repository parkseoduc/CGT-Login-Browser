const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Add hidden input next to btn-browse-ext-folder
const btnBrowseOld = `<button type="button" class="uiv-btn uiv-btn-secondary" id="btn-browse-ext-folder" style="white-space: nowrap; display: inline-flex; align-items: center; gap: 6px;">`;
const btnBrowseNew = `<input type="file" id="ext-folder-input" webkitdirectory directory style="display: none;">\n            <button type="button" class="uiv-btn uiv-btn-secondary" id="btn-browse-ext-folder" style="white-space: nowrap; display: inline-flex; align-items: center; gap: 6px;">`;

if (!html.includes('id="ext-folder-input"')) {
  html = html.replace(btnBrowseOld, btnBrowseNew);
}

// 2. Replace builder-script-category options with clean text
const catRegex = /<select id="builder-script-category"[\s\S]*?<\/select>/;
const catReplacement = `<select id="builder-script-category" class="poly-input" style="font-size: 13px;">
              <option value="muse-ai">Muse AI & Automation</option>
              <option value="warmup">Nuôi Cookie & Lịch Sử</option>
              <option value="social">Video Ngắn (Shorts / Reels)</option>
              <option value="audit">Kiểm Tra Dấu Vân Tay (Audit)</option>
              <option value="custom">Kịch Bản Tùy Biến</option>
            </select>`;

html = html.replace(catRegex, catReplacement);

// 3. Replace builder modal header
const headerRegex = /<div class="modal-header" style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0;">[\s\S]*?<button class="modal-close" id="btn-builder-close-modal" title="Đóng">[\s\S]*?<\/button>\s*<\/div>/;

const headerReplacement = `<div class="modal-header" style="padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: flex-start; justify-content: space-between; gap: 14px;">
        <div style="display: flex; align-items: flex-start; gap: 12px; flex: 1; min-width: 0;">
          <div id="builder-modal-icon-badge" style="width: 36px; height: 36px; border-radius: 10px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>
          </div>
          <div style="flex: 1; min-width: 0;">
            <h2 id="builder-modal-title" style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0; line-height: 1.4; word-break: break-word;">Trình Thiết Lập Kịch Bản No-code</h2>
            <p id="builder-modal-subtitle" style="font-size: 12px; color: #64748b; margin: 3px 0 0 0;">Kéo thả hoặc thêm các bước điều khiển tự động không cần lập trình</p>
          </div>
        </div>
        <button class="modal-close" id="btn-builder-close-modal" title="Đóng">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>`;

html = html.replace(headerRegex, headerReplacement);

fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Successfully updated public/index.html (cat select, header, hidden input)');
