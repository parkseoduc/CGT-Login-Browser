/**
 * Action Synchronizer - Window Grid Tiler
 * Arranges browser windows on physical screen in structured grid layout
 */

const { CdpClient } = require('../cdp');
const launcher = require('../launcher');

class WindowTiler {
  /**
   * Tính toán số cột và hàng theo bố cục yêu cầu
   */
  static calculateGrid(layout, count) {
    let cols = 2;
    let rows = 1;

    if (layout === '2x1') {
      cols = 2; rows = 1;
    } else if (layout === '2x2') {
      cols = 2; rows = 2;
    } else if (layout === '3x2') {
      cols = 3; rows = 2;
    } else if (layout === '4x2') {
      cols = 4; rows = 2;
    } else {
      // Auto calculation
      if (count <= 1) {
        cols = 1; rows = 1;
      } else if (count === 2) {
        cols = 2; rows = 1;
      } else if (count <= 4) {
        cols = 2; rows = 2;
      } else if (count <= 6) {
        cols = 3; rows = 2;
      } else if (count <= 8) {
        cols = 4; rows = 2;
      } else {
        cols = Math.ceil(Math.sqrt(count));
        rows = Math.ceil(count / cols);
      }
    }

    return { cols, rows };
  }

  /**
   * Sắp xếp danh sách profile đang chạy lên màn hình theo lưới
   */
  static async tile({ layout = 'auto', screenWidth = 1920, screenHeight = 1040, profileIds = null } = {}) {
    const runningList = launcher.getRunningProfiles();
    if (!runningList.length) {
      throw new Error('Không có Profile nào đang chạy để sắp xếp lưới màn hình.');
    }

    const targetList = profileIds && Array.isArray(profileIds) && profileIds.length
      ? runningList.filter(p => profileIds.includes(p.profileId))
      : runningList;

    if (!targetList.length) {
      throw new Error('Các profile được chỉ định hiện không chạy.');
    }

    const n = targetList.length;
    const { cols, rows } = WindowTiler.calculateGrid(layout, n);

    const w = Math.floor(screenWidth / cols);
    const h = Math.floor(screenHeight / rows);
    const results = [];

    console.log(`[WindowTiler] Tiling ${n} windows into ${cols}x${rows} grid (cell: ${w}x${h}px)`);

    for (let i = 0; i < targetList.length; i++) {
      const p = targetList[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const left = col * w;
      const top = row * h;

      try {
        const client = new CdpClient(p.wsEndpoint);
        await client.connect(2000);

        const targetsRes = await client.send('Target.getTargets', {}, null, 2000);
        const page = (targetsRes.targetInfos || []).find(t => t.type === 'page') || targetsRes.targetInfos[0];

        if (page) {
          const winRes = await client.send('Browser.getWindowForTarget', { targetId: page.targetId }, null, 2000);
          if (winRes && winRes.windowId) {
            await client.send('Browser.setWindowBounds', {
              windowId: winRes.windowId,
              bounds: {
                left,
                top,
                width: w,
                height: h,
                windowState: 'normal',
              },
            }, null, 2000);
            results.push({ profileId: p.profileId, left, top, width: w, height: h, success: true });
          }
        }
        client.close();
      } catch (err) {
        console.warn(`[WindowTiler] Failed to tile window for profile ${p.profileId}:`, err.message);
        results.push({ profileId: p.profileId, error: err.message, success: false });
      }
    }

    return {
      success: true,
      count: targetList.length,
      grid: { cols, rows, width: w, height: h, layout },
      results,
    };
  }
}

module.exports = WindowTiler;
