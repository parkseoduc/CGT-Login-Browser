/**
 * OmniBrowser - Google SSO & OAuth 2.0 Identity Client
 */
(function() {
  'use strict';

  let _googleConfig = { clientId: '', enabled: false };
  let _gisLoaded = false;
  let _tokenClient = null;
  let _oauthPopup = null;

  async function getGoogleConfig() {
    try {
      const res = await fetch('/api/v1/auth/google-config');
      const data = await res.json();
      if (data.success && data.config && data.config.clientId) {
        _googleConfig = data.config;
        return _googleConfig;
      }
    } catch (e) {
      console.warn('[Google SSO] Lỗi lấy cấu hình Google:', e);
    }
    return _googleConfig;
  }

  // Load Google Identity Services SDK
  function loadGoogleGIS() {
    if (document.getElementById('google-gis-script')) return;
    const script = document.createElement('script');
    script.id = 'google-gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      _gisLoaded = true;
      initGIS();
    };
    script.onerror = () => {
      console.warn('[Google SSO] Không thể tải Google GIS script từ CDN, sẽ dùng OAuth direct popup fallback.');
    };
    document.head.appendChild(script);
  }

  function initGIS() {
    if (!window.google?.accounts?.oauth2) return;
    if (!_googleConfig.clientId) return;
    try {
      _tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: _googleConfig.clientId,
        scope: 'openid email profile',
        prompt: 'select_account',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            console.error('[Google SSO] Token error:', tokenResponse);
            if (typeof window.showToast === 'function') {
              window.showToast('Lỗi đăng nhập Google: ' + (tokenResponse.error_description || tokenResponse.error), 'danger');
            }
            return;
          }
          if (tokenResponse.access_token) {
            await handleAccessTokenReceived(tokenResponse.access_token);
          }
        }
      });
      if (_tokenClient) {
        _tokenClient._clientId = _googleConfig.clientId;
      }
    } catch (err) {
      console.warn('[Google SSO] initTokenClient warning:', err);
    }
  }

  async function handleAccessTokenReceived(accessToken) {
    try {
      if (typeof window.showToast === 'function') {
        window.showToast('Đang kết nối tài khoản Google...', 'info');
      }

      // Lấy thông tin hồ sơ từ Google UserInfo API
      let profile = {};
      try {
        const uRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (uRes.ok) {
          profile = await uRes.json();
        }
      } catch (e) {
        console.warn('[Google SSO] Userinfo fetch fallback:', e);
      }

      await submitGoogleProfile({
        accessToken,
        googleProfile: profile,
        email: profile.email || '',
        name: profile.name || (profile.email ? profile.email.split('@')[0] : 'Google User'),
        avatar: profile.picture || ''
      });
    } catch (err) {
      if (typeof window.showToast === 'function') {
        window.showToast('Lỗi xác thực Google: ' + err.message, 'danger');
      }
    }
  }

  function handleLoginSuccess(user, token) {
    localStorage.removeItem('cgt_manual_logout');
    if (typeof window.setAuthToken === 'function') {
      window.setAuthToken(token);
    } else {
      localStorage.setItem('auth_token', token);
    }

    // Đóng popup nếu còn mở
    if (_oauthPopup && !_oauthPopup.closed) {
      try { _oauthPopup.close(); } catch {}
    }

    // Ẩn tất cả các màn hình xác thực
    const authModal = document.getElementById('auth-modal');
    if (authModal) authModal.style.display = 'none';

    const polyScreen = document.getElementById('polylogin-auth-screen');
    if (polyScreen) polyScreen.style.display = 'none';

    const ssoModal = document.getElementById('google-sso-modal');
    if (ssoModal) ssoModal.style.display = 'none';

    // Hiện màn hình chính của ứng dụng
    const appContainer = document.querySelector('.app-container');
    if (appContainer) appContainer.style.display = 'flex';

    if (typeof window.showToast === 'function') {
      window.showToast(`✨ Xin chào ${user.name || user.email}! Đăng nhập Google thành công.`, 'success');
    }

    if (typeof window.checkAuthState === 'function') window.checkAuthState();
    if (typeof window.fetchLicense === 'function') window.fetchLicense();
    if (typeof window.fetchProfiles === 'function') window.fetchProfiles();
  }

  async function submitGoogleProfile(profileData) {
    try {
      const res = await fetch('/api/v1/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });

      const data = await res.json();
      if (data.success && data.token) {
        handleLoginSuccess(data.user, data.token);
      } else {
        if (typeof window.showToast === 'function') {
          window.showToast(data.error || 'Đăng nhập Google thất bại', 'danger');
        }
      }
    } catch (err) {
      if (typeof window.showToast === 'function') {
        window.showToast('Lỗi xác thực: ' + err.message, 'danger');
      }
    }
  }

  // Mở trực tiếp trang đăng nhập Google (accounts.google.com)
  async function handleGoogleSSOClick() {
    const cfg = await getGoogleConfig();
    const clientId = cfg.clientId;

    if (!clientId) {
      if (typeof window.showToast === 'function') {
        window.showToast('Chưa cấu hình Google Client ID trong hệ thống', 'warning');
      }
      return;
    }

    _googleConfig = cfg;

    // 1. Thử dùng Google Identity Services chính thức (Popup native)
    if (window.google?.accounts?.oauth2) {
      if (!_tokenClient || !_tokenClient._clientId || _tokenClient._clientId !== clientId) {
        initGIS();
      }
      if (_tokenClient) {
        try {
          _tokenClient.requestAccessToken({ prompt: 'select_account' });
          return;
        } catch (e) {
          console.warn('[Google SSO] GIS requestAccessToken failed, fallback to direct popup:', e);
        }
      }
    }

    // 2. Fallback: Mở trực tiếp cửa sổ OAuth 2.0 tới accounts.google.com
    const redirectUri = `${window.location.origin}/api/v1/auth/google/callback`;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=openid%20email%20profile&prompt=select_account`;

    const width = 500;
    const height = 620;
    const left = Math.round((window.screen.width - width) / 2);
    const top = Math.round((window.screen.height - height) / 2);

    if (_oauthPopup && !_oauthPopup.closed) {
      _oauthPopup.focus();
    } else {
      _oauthPopup = window.open(
        authUrl,
        'GoogleOAuthSignIn',
        `width=${width},height=${height},left=${left},top=${top},status=0,toolbar=0,menubar=0,location=1`
      );
    }
  }

  // Lắng nghe kết quả gửi về từ callback popup (nếu dùng fallback direct popup)
  window.addEventListener('message', async (event) => {
    if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
      const { email, name, avatar, accessToken, googleProfile } = event.data;
      await submitGoogleProfile({ email, name, avatar, accessToken, googleProfile });
    } else if (event.data?.type === 'GOOGLE_AUTH_CODE') {
      const { code } = event.data;
      await submitGoogleProfile({ code });
    } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
      if (typeof window.showToast === 'function') {
        window.showToast('Lỗi đăng nhập Google: ' + event.data.error, 'danger');
      }
    }
  });

  // Gắn sự kiện cho các nút Google Login trên giao diện
  function bindSSOButtons() {
    const buttonIds = [
      'btn-google-login',
      'btn-google-register',
      'poly-btn-google-login',
      'poly-btn-google-register'
    ];

    buttonIds.forEach(id => {
      const btn = document.getElementById(id);
      if (btn && !btn.dataset.ssoBound) {
        btn.dataset.ssoBound = 'true';
        btn.onclick = (e) => {
          e.preventDefault();
          handleGoogleSSOClick();
        };
      }
    });
  }

  async function initGoogleSSO() {
    await getGoogleConfig();
    loadGoogleGIS();
    bindSSOButtons();

    document.addEventListener('click', (e) => {
      const target = e.target.closest('#btn-google-login, #btn-google-register, #poly-btn-google-login, #poly-btn-google-register, .btn-google-sso');
      if (target) {
        e.preventDefault();
        handleGoogleSSOClick();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGoogleSSO);
  } else {
    initGoogleSSO();
  }

  window.OmniGoogleSSO = {
    init: initGoogleSSO,
    signIn: handleGoogleSSOClick
  };
})();
