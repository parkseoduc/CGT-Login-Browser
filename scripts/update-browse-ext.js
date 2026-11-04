const fs = require('fs');

let code = fs.readFileSync('public/app.js', 'utf8');

const oldBrowseBlockRegex = /if \(btnBrowseExtFolder\) \{[\s\S]*?showToast\('Đã nhận diện:.*?'\s*,\s*'success'\);[\s\S]*?showToast\('Đã lưu đường dẫn tiện ích', 'info'\);[\s\S]*?\}\s*\}\s*\}\s*\}\);?\s*\}/;

const newBrowseBlock = `if (btnBrowseExtFolder) {
  btnBrowseExtFolder.addEventListener('click', async () => {
    let folderPath = null;

    // 1. If running in Electron
    if (window.electronAPI && typeof window.electronAPI.openDirectory === 'function') {
      try {
        folderPath = await window.electronAPI.openDirectory();
      } catch (e) {
        console.warn('Electron openDirectory error:', e);
      }
    }

    // 2. If in browser, call backend API to open Windows FolderBrowserDialog
    if (!folderPath) {
      try {
        if (typeof showToast === 'function') {
          showToast('Đang mở hộp thoại chọn thư mục Windows...', 'info');
        }
        const res = await fetch(\`\${API_BASE}/system/browse-folder\`);
        const data = await res.json();
        if (data && data.success && data.path) {
          folderPath = data.path;
        }
      } catch (err) {
        console.warn('Backend browse-folder error:', err);
      }
    }

    // 3. Fallback to hidden file input if still no path
    if (!folderPath) {
      const hiddenInput = document.getElementById('ext-folder-input');
      if (hiddenInput) {
        hiddenInput.click();
        return;
      }
    }

    if (folderPath) {
      extFormPath.value = folderPath;
      try {
        const res = await fetch(\`\${API_BASE}/extensions/parse\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: folderPath })
        });
        const data = await res.json();
        if (data.success && data.manifest) {
          extFormName.value = data.manifest.name || '';
          showToast(\`Đã nhận diện: \${data.manifest.name} v\${data.manifest.version}\`, 'success');
        } else {
          showToast('Đã chọn thư mục: ' + folderPath, 'success');
        }
      } catch (e) {
        showToast('Đã chọn thư mục: ' + folderPath, 'info');
      }
    }
  });

  const extFolderInput = document.getElementById('ext-folder-input');
  if (extFolderInput) {
    extFolderInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const firstFile = e.target.files[0];
        const relPath = firstFile.webkitRelativePath || '';
        const folderName = relPath.split('/')[0] || firstFile.name;
        extFormName.value = folderName;
        extFormPath.value = firstFile.path || ('[Thư mục: ' + folderName + ']');
        showToast('Đã chọn thư mục: ' + folderName, 'success');
      }
    });
  }
}`;

code = code.replace(oldBrowseBlockRegex, newBrowseBlock);

fs.writeFileSync('public/app.js', code, 'utf8');
console.log('Successfully updated btnBrowseExtFolder in public/app.js');
