const { CdpClient } = require('./cdp');
const launcher = require('./launcher');

/**
 * Trích xuất cookies từ profile qua CDP
 */
async function exportCookies(profileId) {
  let wasRunning = launcher.isProfileRunning(profileId);
  let info = launcher.getRunningInfo(profileId);

  if (!info) {
    info = await launcher.startProfile(profileId);
    await new Promise(r => setTimeout(r, 2000));
  }

  if (!info || !info.wsEndpoint) {
    throw new Error('Không thể kết nối tới trình duyệt để xuất cookie');
  }

  const client = new CdpClient(info.wsEndpoint);
  await client.connect(5000);

  try {
    let res = null;
    try {
      res = await client.send('Network.getAllCookies');
    } catch {
      res = await client.send('Storage.getCookies');
    }
    const cookies = (res && res.cookies) ? res.cookies : [];

    // Nếu lúc gọi profile chưa chạy, có thể đóng lại để trả về trạng thái cũ
    if (!wasRunning) {
      setTimeout(() => launcher.stopProfile(profileId).catch(() => {}), 1500);
    }

    return {
      success: true,
      count: cookies.length,
      cookies,
      netscape: convertToNetscape(cookies),
    };
  } finally {
    client.close();
  }
}

/**
 * Nhập cookies vào profile qua CDP
 */
async function importCookies(profileId, cookiesList) {
  if (!Array.isArray(cookiesList) || cookiesList.length === 0) {
    throw new Error('Danh sách cookie không hợp lệ hoặc trống');
  }

  let info = launcher.getRunningInfo(profileId);
  let wasRunning = !!info;

  if (!info) {
    info = await launcher.startProfile(profileId);
    await new Promise(r => setTimeout(r, 2000));
  }

  const client = new CdpClient(info.wsEndpoint);
  await client.connect(5000);

  try {
    // Chuẩn hóa định dạng cookies cho CDP Network.setCookies
    const formatted = cookiesList.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path || '/',
      secure: typeof c.secure === 'boolean' ? c.secure : false,
      httpOnly: typeof c.httpOnly === 'boolean' ? c.httpOnly : false,
      sameSite: c.sameSite || undefined,
      expires: c.expires || c.expirationDate || Math.floor(Date.now() / 1000) + 31536000,
    }));

    try {
      await client.send('Network.setCookies', { cookies: formatted });
    } catch {
      await client.send('Storage.setCookies', { cookies: formatted });
    }

    if (!wasRunning) {
      setTimeout(() => launcher.stopProfile(profileId).catch(() => {}), 1500);
    }

    return {
      success: true,
      count: formatted.length,
    };
  } finally {
    client.close();
  }
}

/**
 * Chuyển danh sách cookie sang định dạng Netscape (dùng cho curl / wget / cookie extensions)
 */
function convertToNetscape(cookies) {
  let lines = ['# Netscape HTTP Cookie File', '# https://curl.haxx.se/rfc/cookie_spec.html', ''];
  for (const c of cookies) {
    const flag = c.domain && c.domain.startsWith('.') ? 'TRUE' : 'FALSE';
    const path = c.path || '/';
    const secure = c.secure ? 'TRUE' : 'FALSE';
    const expires = Math.floor(c.expires || 2147483647);
    lines.push(`${c.domain}\t${flag}\t${path}\t${secure}\t${expires}\t${c.name}\t${c.value}`);
  }
  return lines.join('\n');
}

module.exports = {
  exportCookies,
  importCookies,
  convertToNetscape,
};
