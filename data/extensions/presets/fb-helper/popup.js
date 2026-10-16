async function extractFB() {
  const uidEl = document.getElementById('val-uid');
  const cookieEl = document.getElementById('val-cookie');
  const uaEl = document.getElementById('val-ua');

  uaEl.textContent = navigator.userAgent;

  chrome.cookies.getAll({ domain: 'facebook.com' }, (cookies) => {
    if (!cookies || cookies.length === 0) {
      uidEl.textContent = 'Chưa đăng nhập Facebook';
      cookieEl.textContent = 'Không có cookie';
      return;
    }
    const cUser = cookies.find(c => c.name === 'c_user');
    const xs = cookies.find(c => c.name === 'xs');

    uidEl.textContent = cUser ? cUser.value : 'Chưa có c_user';
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    cookieEl.textContent = cookieString;

    document.getElementById('btn-copy-uid').onclick = () => {
      navigator.clipboard.writeText(uidEl.textContent);
      alert('Đã chép UID!');
    };

    document.getElementById('btn-copy-cookie').onclick = () => {
      navigator.clipboard.writeText(cookieString);
      alert('Đã chép chuỗi Cookie!');
    };

    document.getElementById('btn-copy-ua').onclick = () => {
      navigator.clipboard.writeText(navigator.userAgent);
      alert('Đã chép User-Agent!');
    };

    document.getElementById('btn-copy-all').onclick = () => {
      const payload = {
        uid: uidEl.textContent,
        cookies: cookieString,
        user_agent: navigator.userAgent
      };
      navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      alert('Đã chép JSON tài khoản Facebook tương thích hoàn toàn với tool auto post!');
    };
  });
}

document.getElementById('btn-refresh').onclick = extractFB;
extractFB();