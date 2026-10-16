const { CdpClient } = require('./cdp');
const launcher = require('./launcher');
const db = require('./db');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

// Danh sách trang web uy tín dùng cho kịch bản Nuôi Cookie / Warm-up
const WARMUP_SITES = [
  { name: 'Google News', url: 'https://news.google.com' },
  { name: 'VnExpress', url: 'https://vnexpress.net' },
  { name: 'Dân Trí', url: 'https://dantri.com.vn' },
  { name: 'Wikipedia', url: 'https://vi.wikipedia.org/wiki/Trang_Ch%C3%ADnh' },
  { name: 'YouTube Trending', url: 'https://www.youtube.com' },
];

/**
 * Chạy kịch bản Làm ấm Profile (Warm-up / Nuôi cookie tự nhiên)
 */
async function runProfileWarmup(profileId, onProgress = null) {
  const log = (msg) => {
    if (typeof onProgress === 'function') onProgress(msg);
  };

  log(`[Warm-up] Đang chuẩn bị profile ${profileId.slice(0, 8)}...`);

  // 1. Đảm bảo profile đang chạy
  let info = launcher.getRunningInfo(profileId);
  if (!info) {
    log(`[Warm-up] Khởi chạy trình duyệt...`);
    info = await launcher.startProfile(profileId);
    await new Promise(r => setTimeout(r, 2000));
  }

  if (!info || !info.wsEndpoint) {
    throw new Error('Không lấy được cổng kết nối CDP của profile');
  }

  // 2. Kết nối CDP
  log(`[Warm-up] Kết nối giao thức CDP...`);
  const client = new CdpClient(info.wsEndpoint);
  await client.connect(6000);

  try {
    // Lấy danh sách target trang đang mở
    const { targetInfos } = await client.send('Target.getTargets');
    const pageTarget = targetInfos.find(t => t.type === 'page');
    let sessionId = null;

    if (pageTarget) {
      const attachRes = await client.send('Target.attachToTarget', {
        targetId: pageTarget.targetId,
        flatten: true
      });
      sessionId = attachRes.sessionId;
    }

    // Chọn ngẫu nhiên 2 - 3 trang web để lướt
    const shuffled = [...WARMUP_SITES].sort(() => 0.5 - Math.random()).slice(0, 3);

    for (let i = 0; i < shuffled.length; i++) {
      const site = shuffled[i];
      log(`[Warm-up] (${i + 1}/${shuffled.length}) Đang mở ${site.name} (${site.url})...`);

      if (sessionId) {
        await client.send('Page.navigate', { url: site.url }, sessionId);
      } else {
        await client.send('Target.createTarget', { url: site.url });
      }

      // Đợi trang tải
      await new Promise(r => setTimeout(r, 4000));

      // Thực hiện mô phỏng cuộn chuột ngẫu nhiên 3 lần
      log(`[Warm-up] Đang mô phỏng cuộn đọc tin tức trên ${site.name}...`);
      for (let s = 1; s <= 3; s++) {
        if (sessionId) {
          const scrollDistance = Math.floor(Math.random() * 400) + 250;
          await client.send('Runtime.evaluate', {
            expression: `window.scrollBy({ top: ${scrollDistance}, behavior: 'smooth' });`
          }, sessionId).catch(() => {});
        }
        await new Promise(r => setTimeout(r, 2500));
      }
    }

    log(`[Warm-up] Hoàn thành phiên làm ấm! Đã lưu trữ cookie và lịch sử duyệt web tự nhiên.`);
    return { success: true, sitesVisited: shuffled.map(s => s.name) };
  } finally {
    client.close();
  }
}

/**
 * Kiểm tra kết quả Iphey tự động
 */
async function runIpheyAudit(profileId) {
  let info = launcher.getRunningInfo(profileId);
  if (!info) {
    info = await launcher.startProfile(profileId);
    await new Promise(r => setTimeout(r, 2000));
  }

  const client = new CdpClient(info.wsEndpoint);
  await client.connect(6000);

  try {
    const { targetInfos } = await client.send('Target.getTargets');
    const pageTarget = targetInfos.find(t => t.type === 'page');
    if (pageTarget) {
      const attachRes = await client.send('Target.attachToTarget', {
        targetId: pageTarget.targetId,
        flatten: true
      });
      await client.send('Page.navigate', { url: 'https://iphey.com' }, attachRes.sessionId);
    } else {
      await client.send('Target.createTarget', { url: 'https://iphey.com' });
    }
    return { success: true, url: 'https://iphey.com' };
  } finally {
    client.close();
  }
}

/**
 * Kích hoạt kịch bản Facebook Auto Post (Playwright) kết nối với profile này
 */
async function triggerFacebookAutomation(profileId) {
  const fbDir = 'E:\\fb-real-estate-auto-post';
  if (!fs.existsSync(fbDir)) {
    throw new Error(`Không tìm thấy thư mục dự án Facebook tại ${fbDir}`);
  }

  // Đảm bảo profile đang chạy để CDP sẵn sàng
  let info = launcher.getRunningInfo(profileId);
  if (!info) {
    info = await launcher.startProfile(profileId);
    await new Promise(r => setTimeout(r, 2500));
  }

  const pythonVenv = path.join(fbDir, '.venv', 'Scripts', 'python.exe');
  const pythonCmd = fs.existsSync(pythonVenv) ? pythonVenv : 'python';

  // Chạy script Playwright test bridge trong background
  const scriptPath = path.join(fbDir, 'api', 'test_bridge.py');
  
  // Nếu chưa có file test_bridge.py thì tạo sẵn script chạy nhẹ
  if (!fs.existsSync(scriptPath)) {
    const testScriptCode = `
import asyncio
import sys
from api.omnibrowser_bridge import start_omnibrowser_profile, is_omnibrowser_running
from playwright.async_api import async_playwright

async def main():
    profile_id = sys.argv[1] if len(sys.argv) > 1 else ""
    print(f"[FB Automation] Kết nối tới OmniBrowser profile: {profile_id}")
    cdp_info = start_omnibrowser_profile(profile_id)
    if not cdp_info:
        print("[FB Automation] Lỗi: Không lấy được CDP endpoint")
        return

    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp(cdp_info["wsEndpoint"])
        context = browser.contexts[0] if browser.contexts else await browser.new_context()
        page = context.pages[0] if context.pages else await context.new_page()
        
        print("[FB Automation] Mở Facebook...")
        await page.goto("https://www.facebook.com", timeout=30000)
        print("[FB Automation] Tiêu đề trang:", await page.title())
        print("[FB Automation] Sẵn sàng tự động hóa Facebook!")

if __name__ == "__main__":
    asyncio.run(main())
`;
    fs.writeFileSync(scriptPath, testScriptCode, 'utf8');
  }

  const child = spawn(pythonCmd, [scriptPath, profileId], {
    cwd: fbDir,
    detached: true,
    stdio: 'ignore'
  });
  child.unref();

  return {
    success: true,
    message: `Đã kích hoạt kịch bản Facebook Automation liên kết với Profile ${profileId.slice(0, 8)}`,
    pid: child.pid
  };
}

module.exports = {
  runProfileWarmup,
  runIpheyAudit,
  triggerFacebookAutomation,
};
