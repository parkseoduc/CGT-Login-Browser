let currentDomain = '';
let currentUrl = '';
let allCookies = [];

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) {
    document.getElementById('current-url').textContent = 'Không có tab hợp lệ';
    return;
  }
  currentUrl = tab.url;
  try {
    const urlObj = new URL(tab.url);
    currentDomain = urlObj.hostname;
    document.getElementById('current-url').textContent = currentDomain;
    loadCookies();
  } catch (e) {
    document.getElementById('current-url').textContent = tab.url;
  }
}

async function loadCookies() {
  const container = document.getElementById('cookies-container');
  container.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8; font-size:11px;">Đang tải...</div>';
  
  chrome.cookies.getAll({ url: currentUrl }, (cookies) => {
    allCookies = cookies || [];
    renderCookies(allCookies);
  });
}

function renderCookies(list) {
  const container = document.getElementById('cookies-container');
  container.innerHTML = '';
  if (!list || list.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8; font-size:11px;">Không tìm thấy cookie cho trang này.</div>';
    return;
  }
  list.forEach(c => {
    const div = document.createElement('div');
    div.className = 'cookie-item';
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="cookie-name">${c.name}</span>
        <button style="padding:2px 6px; font-size:9px; color:#f87171;" class="btn-del" data-name="${c.name}">Xóa</button>
      </div>
      <div class="cookie-val">${c.value}</div>
    `;
    container.appendChild(div);
  });

  container.querySelectorAll('.btn-del').forEach(b => {
    b.onclick = (e) => {
      const name = e.target.dataset.name;
      chrome.cookies.remove({ url: currentUrl, name }, () => loadCookies());
    };
  });
}

document.getElementById('search-input').oninput = (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = allCookies.filter(c => c.name.toLowerCase().includes(query) || c.value.toLowerCase().includes(query));
  renderCookies(filtered);
};

document.getElementById('btn-refresh').onclick = loadCookies;

document.getElementById('btn-export').onclick = () => {
  const jsonStr = JSON.stringify(allCookies, null, 2);
  navigator.clipboard.writeText(jsonStr).then(() => {
    alert(`Đã sao chép ${allCookies.length} cookies dạng JSON vào Clipboard!`);
  });
};

document.getElementById('btn-import').onclick = () => {
  document.getElementById('import-modal').style.display = 'block';
};

document.getElementById('btn-cancel-import').onclick = () => {
  document.getElementById('import-modal').style.display = 'none';
};

document.getElementById('btn-save-import').onclick = async () => {
  const text = document.getElementById('import-text').value.trim();
  if (!text) return;
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error('Dữ liệu cookie phải là một mảng JSON []');
    
    let count = 0;
    for (const c of parsed) {
      if (!c.name) continue;
      await chrome.cookies.set({
        url: currentUrl,
        name: c.name,
        value: c.value || '',
        domain: c.domain && !c.domain.startsWith('.') ? c.domain : undefined,
        path: c.path || '/',
        secure: c.secure !== undefined ? c.secure : true,
        httpOnly: c.httpOnly !== undefined ? c.httpOnly : false,
      });
      count++;
    }
    alert(`Đã nhập thành công ${count} cookies!`);
    document.getElementById('import-modal').style.display = 'none';
    document.getElementById('import-text').value = '';
    loadCookies();
  } catch (err) {
    alert('Lỗi nhập cookie: ' + err.message);
  }
};

document.getElementById('btn-clear').onclick = () => {
  if (!confirm('Bạn có chắc muốn xóa toàn bộ cookies của trang này?')) return;
  allCookies.forEach(c => {
    chrome.cookies.remove({ url: currentUrl, name: c.name });
  });
  setTimeout(loadCookies, 300);
};

init();