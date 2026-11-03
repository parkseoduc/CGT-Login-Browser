const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'app.js');
let code = fs.readFileSync(filePath, 'utf8');

const oldBlock = `  // Submit Login handler
  async function handleLoginSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const email = (document.getElementById('auth-login-email')?.value || '').trim();
    const password = document.getElementById('auth-login-password')?.value || '';
    const btnSubmit = document.getElementById('btn-submit-login');
    if (!email || !password) {
      return showToast('Vui lòng nhập đầy đủ Email và Mật khẩu', 'warning');
    }
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Đang đăng nhập...';
    }

    try {
      const res = await originalFetch(\`\${API_BASE}/auth/login\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.removeItem('cgt_manual_logout');
        setAuthToken(data.token);
        closeModalEl(authModal);
        showToast(\`🎉 Xin chào \${data.user.name || data.user.email}! Đăng nhập thành công.\`, 'success');
        await checkAuthState();
        await fetchLicense();
        await fetchProfiles();
      } else {
        showToast(data.error || 'Đăng nhập thất bại', 'danger');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ: ' + err.message, 'danger');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Đăng Nhập Ngay';
      }
    }
  }

  if (formLogin) formLogin.onsubmit = handleLoginSubmit;
  const btnSubmitLogin = document.getElementById('btn-submit-login');
  if (btnSubmitLogin) {
    btnSubmitLogin.onclick = (e) => {
      if (formLogin) {
        if (formLogin.checkValidity && !formLogin.checkValidity()) return;
      }
      handleLoginSubmit(e);
    };
  }

  // Submit Register handler
  async function handleRegisterSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const name = (document.getElementById('auth-reg-name')?.value || '').trim();
    const email = (document.getElementById('auth-reg-email')?.value || '').trim();
    const password = document.getElementById('auth-reg-password')?.value || '';
    const confirm = document.getElementById('auth-reg-confirm')?.value || '';

    if (!email || !password) {
      return showToast('Vui lòng nhập Email và Mật khẩu', 'warning');
    }
    if (password !== confirm) {
      return showToast('Mật khẩu xác nhận không khớp', 'danger');
    }

    const btnSubmit = document.getElementById('btn-submit-register');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Đang tạo tài khoản...';
    }

    try {
      const res = await originalFetch(\`\${API_BASE}/auth/register\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.removeItem('cgt_manual_logout');
        setAuthToken(data.token);
        closeModalEl(authModal);
        showToast(\`🎉 Đăng ký thành công! Chào mừng \${data.user.email} (Nhận ngay 50 hồ sơ).\`, 'success');
        await checkAuthState();
        await fetchLicense();
        await fetchProfiles();
      } else {
        showToast(data.error || 'Đăng ký thất bại', 'danger');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ: ' + err.message, 'danger');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Tạo Tài Khoản Mới';
      }
    }
  }

  if (formReg) formReg.onsubmit = handleRegisterSubmit;
  const btnSubmitReg = document.getElementById('btn-submit-register');
  if (btnSubmitReg) {
    btnSubmitReg.onclick = (e) => {
      if (formReg) {
        if (formReg.checkValidity && !formReg.checkValidity()) return;
      }
      handleRegisterSubmit(e);
    };
  }`;

const newBlock = `  // Submit Login handler
  async function handleLoginSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const email = (document.getElementById('auth-login-email')?.value || '').trim();
    const password = document.getElementById('auth-login-password')?.value || '';
    const btnSubmit = document.getElementById('btn-submit-login');

    if (!email) {
      return showToast('Vui lòng nhập Email đăng nhập', 'warning');
    }
    if (!password) {
      return showToast('Vui lòng nhập Mật khẩu', 'warning');
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Đang đăng nhập...';
    }

    try {
      const res = await originalFetch(\`\${API_BASE}/auth/login\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.removeItem('cgt_manual_logout');
        setAuthToken(data.token);
        closeModalEl(authModal);
        showToast(\`🎉 Xin chào \${data.user.name || data.user.email}! Đăng nhập thành công.\`, 'success');
        await checkAuthState();
        await fetchLicense();
        await fetchProfiles();
      } else {
        showToast(data.error || 'Đăng nhập thất bại', 'danger');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ: ' + err.message, 'danger');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Đăng Nhập Ngay';
      }
    }
  }

  if (formLogin) formLogin.onsubmit = handleLoginSubmit;
  const btnSubmitLogin = document.getElementById('btn-submit-login');
  if (btnSubmitLogin) {
    btnSubmitLogin.onclick = (e) => {
      handleLoginSubmit(e);
    };
  }

  // Submit Register handler
  async function handleRegisterSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const name = (document.getElementById('auth-reg-name')?.value || '').trim();
    const email = (document.getElementById('auth-reg-email')?.value || '').trim();
    const password = document.getElementById('auth-reg-password')?.value || '';
    const confirm = document.getElementById('auth-reg-confirm')?.value || '';

    if (!email) {
      return showToast('Vui lòng nhập Email đăng ký', 'warning');
    }
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    if (!emailRegex.test(email)) {
      return showToast('Địa chỉ Email không đúng định dạng', 'warning');
    }
    if (!password) {
      return showToast('Vui lòng nhập Mật khẩu', 'warning');
    }
    if (password.length < 6) {
      return showToast('Mật khẩu phải có tối thiểu 6 ký tự', 'warning');
    }
    if (!confirm) {
      return showToast('Vui lòng nhập lại mật khẩu để xác nhận', 'warning');
    }
    if (password !== confirm) {
      return showToast('Mật khẩu xác nhận không khớp, vui lòng kiểm tra lại', 'danger');
    }

    const btnSubmit = document.getElementById('btn-submit-register');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Đang tạo tài khoản...';
    }

    try {
      const res = await originalFetch(\`\${API_BASE}/auth/register\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.removeItem('cgt_manual_logout');
        setAuthToken(data.token);
        closeModalEl(authModal);
        showToast(\`🎉 Đăng ký thành công! Chào mừng \${data.user.email} (Nhận ngay 50 hồ sơ).\`, 'success');
        await checkAuthState();
        await fetchLicense();
        await fetchProfiles();
      } else {
        showToast(data.error || 'Đăng ký thất bại', 'danger');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ: ' + err.message, 'danger');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Tạo Tài Khoản Mới';
      }
    }
  }

  if (formReg) formReg.onsubmit = handleRegisterSubmit;
  const btnSubmitReg = document.getElementById('btn-submit-register');
  if (btnSubmitReg) {
    btnSubmitReg.onclick = (e) => {
      handleRegisterSubmit(e);
    };
  }`;

// normalize CRLF
const normalizedCode = code.replace(/\r\n/g, '\n');
const normalizedOld = oldBlock.replace(/\r\n/g, '\n');
const normalizedNew = newBlock.replace(/\r\n/g, '\n');

if (!normalizedCode.includes(normalizedOld)) {
  console.error('Could not find oldBlock in app.js');
  process.exit(1);
}

const updated = normalizedCode.replace(normalizedOld, normalizedNew);
fs.writeFileSync(filePath, updated.replace(/\n/g, '\r\n'), 'utf8');
console.log('Successfully updated app.js submit handlers!');
