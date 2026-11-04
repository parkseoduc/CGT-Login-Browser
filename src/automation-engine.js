const { CdpClient } = require('./cdp');
const launcher = require('./launcher');
const db = require('./db');
const proxy = require('./proxy');
const fs = require('node:fs');
const path = require('node:path');

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Danh sách trang tin tức uy tín nuôi cookie
const NEWS_SITES = [
  'https://news.google.com',
  'https://vnexpress.net',
  'https://dantri.com.vn',
  'https://vi.wikipedia.org/wiki/Trang_Ch%C3%ADnh',
  'https://www.youtube.com'
];

/**
 * Các kịch bản mẫu cài sẵn (Preset Automation Templates)
 */
const PRESET_TEMPLATES = [
  {
    id: 'preset-warmup',
    name: '🌾 Nuôi Cookie & Lướt Tin Tức Tự Nhiên (Natural Warm-up)',
    description: 'Tự động mở 3 trang tin tức, cuộn đọc mượt mà 3-6s như người thật, tích lũy lịch sử duyệt web & cookie sạch.',
    category: 'warmup',
    icon: '🌾',
    steps: [
      { type: 'log', message: 'Bắt đầu phiên nuôi Cookie tự nhiên...' },
      { type: 'navigate', url: 'https://news.google.com', waitSec: 4 },
      { type: 'scroll', direction: 'down', minDistance: 300, maxDistance: 700, repeat: 3, delaySec: 2 },
      { type: 'sleep', minSec: 2, maxSec: 4 },
      { type: 'navigate', url: 'https://vnexpress.net', waitSec: 4 },
      { type: 'scroll', direction: 'down', minDistance: 400, maxDistance: 800, repeat: 3, delaySec: 2 },
      { type: 'sleep', minSec: 2, maxSec: 3 },
      { type: 'navigate', url: 'https://vi.wikipedia.org/wiki/Trang_Ch%C3%ADnh', waitSec: 3 },
      { type: 'scroll', direction: 'down', minDistance: 250, maxDistance: 500, repeat: 2, delaySec: 2 },
      { type: 'log', message: 'Hoàn tất nuôi cookie thành công! Lịch sử & Cookie đã được lưu êm.' }
    ]
  },
  {
    id: 'preset-muse-ai',
    name: '🤖 Muse AI Bot Runner (Giữ Kết Nối & Chống Disconnected)',
    description: 'Tự động mở Muse AI, kiểm tra kết nối mạng an toàn, giữ session socket online và tương tác nhẹ.',
    category: 'muse-ai',
    icon: '🤖',
    steps: [
      { type: 'log', message: 'Bắt đầu phiên làm việc an toàn trên Muse AI...' },
      { type: 'navigate', url: 'https://muse.ai', waitSec: 5 },
      { type: 'scroll', direction: 'down', minDistance: 200, maxDistance: 450, repeat: 2, delaySec: 3 },
      { type: 'sleep', minSec: 3, maxSec: 5 },
      { type: 'scroll', direction: 'up', minDistance: 200, maxDistance: 350, repeat: 1, delaySec: 2 },
      { type: 'log', message: 'Kết nối Muse AI ổn định. Session duy trì hoạt động tốt.' }
    ]
  },
  {
    id: 'preset-social-shorts',
    name: '📱 Lướt Video Ngắn Tự Động (TikTok / Shorts Simulator)',
    description: 'Mô phỏng người thật lướt xem video ngắn, dừng xem 10-25s rồi cuộn sang video kế tiếp.',
    category: 'social',
    icon: '📱',
    steps: [
      { type: 'log', message: 'Khởi chạy luồng tương tác video ngắn...' },
      { type: 'navigate', url: 'https://www.youtube.com/shorts', waitSec: 4 },
      { type: 'sleep', minSec: 8, maxSec: 15 },
      { type: 'press_key', key: 'ArrowDown', count: 1 },
      { type: 'sleep', minSec: 10, maxSec: 20 },
      { type: 'press_key', key: 'ArrowDown', count: 1 },
      { type: 'sleep', minSec: 8, maxSec: 15 },
      { type: 'log', message: 'Đã hoàn tất chuỗi tương tác video ngắn ngẫu nhiên.' }
    ]
  },
  {
    id: 'preset-iphey-audit',
    name: '🛡️ Kiểm Tra Vân Tay & Điểm Tin Cậy (Iphey Audit 100%)',
    description: 'Tự động vào Iphey.com, chờ hệ thống quét 6 chỉ số vân tay và lấy báo cáo kết quả kiểm tra.',
    category: 'audit',
    icon: '🛡️',
    steps: [
      { type: 'log', message: 'Truy cập trang đánh giá độ ẩn danh Iphey...' },
      { type: 'navigate', url: 'https://iphey.com', waitSec: 6 },
      { type: 'scroll', direction: 'down', minDistance: 300, maxDistance: 500, repeat: 2, delaySec: 2 },
      { type: 'sleep', minSec: 2, maxSec: 4 },
      { type: 'screenshot', name: 'iphey_audit_result' },
      { type: 'log', message: 'Đã hoàn thành kiểm tra độ uy tín và chụp ảnh báo cáo.' }
    ]
  }
];

/**
 * Trình thực thi một kịch bản trên một Profile qua CDP
 */
async function executeScriptOnProfile(profileId, steps, onLog = null) {
  const profile = db.getProfile(profileId);
  const profileName = profile ? profile.name : `Profile ${profileId.slice(0, 8)}`;
  
  const log = (msg, level = 'info') => {
    const time = new Date().toLocaleTimeString('vi-VN');
    const logItem = { time, profileId, profileName, message: msg, level };
    if (typeof onLog === 'function') onLog(logItem);
    console.log(`[Automation][${time}][${profileName}] ${msg}`);
  };

  log(`Chuẩn bị thực thi kịch bản (${steps.length} bước)...`);

  // 1. Đảm bảo profile đang chạy
  let info = launcher.getRunningInfo(profileId);
  let wasStartedByAutomation = false;
  if (!info) {
    log(`Khởi chạy trình duyệt...`);
    info = await launcher.startProfile(profileId);
    wasStartedByAutomation = true;
    await sleep(2000);
  }

  if (!info || !info.wsEndpoint) {
    throw new Error('Không thể kết nối cổng CDP của Profile');
  }

  // 2. Kết nối CDP Client
  const client = new CdpClient(info.wsEndpoint);
  await client.connect(6000);

  try {
    // Lấy target tab đang mở
    const { targetInfos } = await client.send('Target.getTargets');
    let pageTarget = targetInfos.find(t => t.type === 'page');
    let targetId = pageTarget ? pageTarget.targetId : null;

    if (!targetId) {
      const created = await client.send('Target.createTarget', { url: 'about:blank' });
      targetId = created.targetId;
    }

    const attachRes = await client.send('Target.attachToTarget', {
      targetId,
      flatten: true
    });
    const sessionId = attachRes.sessionId;

    await client.send('Page.enable', {}, sessionId);
    await client.send('Runtime.enable', {}, sessionId);

    // 3. Thực thi lần lượt từng bước trong kịch bản
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepIndex = i + 1;

      switch (step.type) {
        case 'log': {
          log(`[${stepIndex}/${steps.length}] ${step.message || ''}`);
          break;
        }

        case 'navigate': {
          const url = step.url || 'about:blank';
          const waitSec = Number(step.waitSec || 3);
          log(`[${stepIndex}/${steps.length}] Mở đường dẫn: ${url} (Chờ ${waitSec}s)...`);
          await client.send('Page.navigate', { url }, sessionId);
          await sleep(waitSec * 1000);
          break;
        }

        case 'sleep':
        case 'delay': {
          const min = Number(step.minSec || step.sec || 2);
          const max = Number(step.maxSec || min);
          const actualSec = (Math.random() * (max - min) + min).toFixed(1);
          log(`[${stepIndex}/${steps.length}] Tạm dừng nghỉ ${actualSec}s (Mô phỏng người thật)...`);
          await sleep(actualSec * 1000);
          break;
        }

        case 'scroll': {
          const repeat = Number(step.repeat || 1);
          const dir = step.direction === 'up' ? -1 : 1;
          const minD = Number(step.minDistance || 250);
          const maxD = Number(step.maxDistance || 600);
          const delaySec = Number(step.delaySec || 2);

          log(`[${stepIndex}/${steps.length}] Cuộn chuột ${step.direction === 'up' ? 'lên' : 'xuống'} (${repeat} lượt)...`);
          for (let r = 0; r < repeat; r++) {
            const dist = Math.floor(Math.random() * (maxD - minD) + minD) * dir;
            await client.send('Runtime.evaluate', {
              expression: `window.scrollBy({ top: ${dist}, behavior: 'smooth' });`
            }, sessionId).catch(() => {});
            if (r < repeat - 1) await sleep(delaySec * 1000);
          }
          break;
        }

        case 'click': {
          const selector = step.selector;
          log(`[${stepIndex}/${steps.length}] Nhấp chuột vào: ${selector}...`);
          const clickRes = await client.send('Runtime.evaluate', {
            expression: `
              (function() {
                const el = document.querySelector('${selector.replace(/'/g, "\\'")}');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el.click();
                  return true;
                }
                return false;
              })()
            `,
            returnByValue: true
          }, sessionId).catch(() => ({ result: { value: false } }));

          if (!clickRes.result?.value) {
            log(`[${stepIndex}/${steps.length}] ⚠️ Cảnh báo: Không tìm thấy phần tử "${selector}" để click`, 'warning');
          }
          await sleep(1500);
          break;
        }

        case 'type': {
          const selector = step.selector;
          const text = step.text || '';
          log(`[${stepIndex}/${steps.length}] Gõ văn bản vào "${selector}"...`);
          await client.send('Runtime.evaluate', {
            expression: `
              (function() {
                const el = document.querySelector('${selector.replace(/'/g, "\\'")}');
                if (el) {
                  el.focus();
                  el.value = '${text.replace(/'/g, "\\'")}';
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                }
              })()
            `
          }, sessionId).catch(() => {});
          await sleep(1000);
          break;
        }

        case 'press_key': {
          const key = step.key || 'Enter';
          const count = Number(step.count || 1);
          log(`[${stepIndex}/${steps.length}] Nhấn phím "${key}" (${count} lần)...`);
          for (let c = 0; c < count; c++) {
            await client.send('Input.dispatchKeyEvent', {
              type: 'keyDown',
              key: key,
              code: key,
              windowsVirtualKeyCode: key === 'Enter' ? 13 : (key === 'ArrowDown' ? 40 : 0)
            }, sessionId).catch(() => {});
            await sleep(100);
            await client.send('Input.dispatchKeyEvent', {
              type: 'keyUp',
              key: key,
              code: key,
              windowsVirtualKeyCode: key === 'Enter' ? 13 : (key === 'ArrowDown' ? 40 : 0)
            }, sessionId).catch(() => {});
            await sleep(600);
          }
          break;
        }

        case 'screenshot': {
          const name = step.name || `shot_${Date.now()}`;
          log(`[${stepIndex}/${steps.length}] Chụp ảnh màn hình lưu bằng chứng...`);
          const ssRes = await client.send('Page.captureScreenshot', { format: 'png' }, sessionId);
          const ssDir = path.join(__dirname, '..', 'data', 'screenshots');
          if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });
          const ssPath = path.join(ssDir, `${name}_${profileId.slice(0, 8)}.png`);
          fs.writeFileSync(ssPath, Buffer.from(ssRes.data, 'base64'));
          log(`[${stepIndex}/${steps.length}] Đã lưu ảnh: ${path.basename(ssPath)}`, 'success');
          break;
        }

        case 'rotate_ip': {
          log(`[${stepIndex}/${steps.length}] Kích hoạt xoay IP 4G giữa chừng...`);
          if (profile && profile.proxy_id) {
            const px = db.getProxy(profile.proxy_id);
            if (px && px.rotation_api_url) {
              const rot = await proxy.triggerProxyRotation(px);
              log(`[${stepIndex}/${steps.length}] Xoay IP thành công: ${rot.newProxyInfo?.ip || 'Mới'}`, 'success');
            } else {
              log(`[${stepIndex}/${steps.length}] Proxy không có link xoay IP`, 'warning');
            }
          }
          break;
        }

        default: {
          log(`[${stepIndex}/${steps.length}] Bỏ qua bước không xác định: ${step.type}`);
        }
      }
    }

    log(`🎉 Hoàn tất kịch bản trên profile ${profileName}!`, 'success');
    return { success: true, profileId, profileName };

  } finally {
    try { client.close(); } catch {}
  }
}

/**
 * Trình thực thi hàng loạt với cơ chế giới hạn luồng đồng thời (Concurrency Pool)
 */
async function executeBatch(profileIds, steps, options = {}, onProgress = null, onLog = null) {
  const concurrency = Math.max(1, parseInt(options.concurrency, 10) || 2);
  const autoClose = Boolean(options.autoClose);
  const total = profileIds.length;
  let completed = 0;
  let successCount = 0;
  let failCount = 0;

  const results = [];
  const queue = [...profileIds];

  const updateProgress = () => {
    if (typeof onProgress === 'function') {
      onProgress({
        total,
        completed,
        successCount,
        failCount,
        percent: Math.round((completed / total) * 100)
      });
    }
  };

  updateProgress();

  async function worker() {
    while (queue.length > 0) {
      const pid = queue.shift();
      try {
        const res = await executeScriptOnProfile(pid, steps, onLog);
        successCount++;
        results.push({ profileId: pid, success: true, result: res });
      } catch (err) {
        failCount++;
        results.push({ profileId: pid, success: false, error: err.message });
        if (typeof onLog === 'function') {
          onLog({
            time: new Date().toLocaleTimeString('vi-VN'),
            profileId: pid,
            message: `❌ Lỗi thực thi: ${err.message}`,
            level: 'error'
          });
        }
      } finally {
        if (autoClose) {
          try {
            await launcher.stopProfile(pid, 3000);
          } catch {}
        }
        completed++;
        updateProgress();
      }
    }
  }

  // Khởi chạy các worker theo concurrency
  const workers = [];
  for (let w = 0; w < Math.min(concurrency, total); w++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  return {
    total,
    successCount,
    failCount,
    results
  };
}

module.exports = {
  PRESET_TEMPLATES,
  executeScriptOnProfile,
  executeBatch,
};
