/**
 * Action Synchronizer - Session Manager
 * Manages CDP connections, auto-attaching, target tracking, and tab selection for Master & Slaves
 */

const { CdpClient } = require('../cdp');
const { getCaptureScript } = require('./capture-script');

class SessionManager {
  /**
   * Kết nối và gắn hook vào 1 Profile (Master hoặc Slave)
   */
  static async attachToProfile(profileId, wsEndpoint, isMaster, callbacks = {}) {
    const client = new CdpClient(wsEndpoint);
    await client.connect(3000);

    const conn = {
      profileId,
      client,
      isMaster,
      sessions: new Map(), // targetId -> { targetId, sessionId, width, height, url, title, visible, lastActive }
    };

    const captureScript = getCaptureScript();

    // Helper: chuẩn bị và gắn hook vào 1 page session
    const setupPageSession = async (targetId, sessionId, url = '', title = '') => {
      try {
        await client.send('Page.enable', {}, sessionId, 2000).catch(() => {});

        let width = 1920;
        let height = 1080;
        let visible = true;
        try {
          const evalRes = await client.send('Runtime.evaluate', {
            expression: '({ w: window.innerWidth, h: window.innerHeight, vis: document.visibilityState })',
            returnByValue: true,
          }, sessionId, 1500).catch(() => null);
          if (evalRes?.result?.value) {
            width = evalRes.result.value.w || 1920;
            height = evalRes.result.value.h || 1080;
            visible = evalRes.result.value.vis === 'visible';
          }
        } catch {}

        conn.sessions.set(targetId, {
          targetId,
          sessionId,
          width,
          height,
          visible,
          url: url || '',
          title: title || '',
          lastActive: Date.now()
        });

        if (isMaster) {
          await client.send('Runtime.enable', {}, sessionId, 2000).catch(() => {});
          await client.send('Runtime.addBinding', { name: '__omniSyncEvent' }, sessionId, 2000).catch(() => {});
          await client.send('Page.addScriptToEvaluateOnNewDocument', { source: captureScript }, sessionId, 2000).catch(() => {});
          await client.send('Runtime.evaluate', { expression: captureScript }, sessionId, 2000).catch(() => {});
        }
      } catch (err) {
        console.warn(`[SessionManager] setupPageSession warning on ${targetId}:`, err.message);
      }
    };

    // 1. Tự động giải phóng các hộp thoại alert(), confirm(), prompt() để không làm treo trang
    client.on('Page.javascriptDialogOpening', async (params) => {
      console.log(`[SessionManager] Auto-dismissing dialog on profile ${profileId}: ${params.message}`);
      await client.send('Page.handleJavaScriptDialog', { accept: true }, null, 1500).catch(() => {});
    });

    // 2. Lắng nghe sự kiện Target
    client.on('Target.attachedToTarget', async (params) => {
      if (params.targetInfo && params.targetInfo.type === 'page') {
        await setupPageSession(params.targetInfo.targetId, params.sessionId, params.targetInfo.url, params.targetInfo.title);
        if (callbacks.onTabCreated) {
          callbacks.onTabCreated(params.targetInfo.url);
        }
      }
    });

    client.on('Target.detachedFromTarget', (params) => {
      if (params.targetId) {
        conn.sessions.delete(params.targetId);
        if (callbacks.onTabClosed) {
          callbacks.onTabClosed(params.targetId);
        }
      }
    });

    client.on('Target.targetInfoChanged', (params) => {
      if (params.targetInfo && params.targetInfo.targetId) {
        const s = conn.sessions.get(params.targetInfo.targetId);
        if (s) {
          s.url = params.targetInfo.url || s.url;
          s.title = params.targetInfo.title || s.title;
          s.lastActive = Date.now();
        }
      }
    });

    // 3. Nếu là Master: Lắng nghe frameNavigated và bindingCalled
    if (isMaster) {
      client.on('Page.frameNavigated', (params) => {
        if (params.frame && !params.frame.parentId && params.frame.url) {
          const fUrl = params.frame.url;
          if (fUrl && fUrl !== 'about:blank' && !fUrl.startsWith('chrome://')) {
            if (callbacks.onNavigate) {
              callbacks.onNavigate(fUrl);
            }
          }
        }
      });

      client.on('Runtime.bindingCalled', (params) => {
        if (params.name === '__omniSyncEvent' && callbacks.onSyncEvent) {
          try {
            const ev = JSON.parse(params.payload);
            callbacks.onSyncEvent(ev);
          } catch (e) {
            console.error('[SessionManager] Error parsing sync event payload:', e.message);
          }
        }
      });
    }

    // 4. Kích hoạt AutoAttach để tự động phát hiện tab mới và tab hiện có
    await client.send('Target.setAutoAttach', {
      autoAttach: true,
      waitForDebuggerOnStart: false,
      flatten: true,
    }, null, 3000).catch(() => {});

    // 5. Kiểm tra targets hiện có để đảm bảo không sót tab nào
    const targetsRes = await client.send('Target.getTargets', {}, null, 3000).catch(() => ({ targetInfos: [] }));
    const targets = targetsRes.targetInfos || [];
    const pageTargets = targets.filter(t => t.type === 'page');

    for (const pt of pageTargets) {
      if (!conn.sessions.has(pt.targetId)) {
        try {
          const attachRes = await client.send('Target.attachToTarget', {
            targetId: pt.targetId,
            flatten: true,
          }, null, 2500);
          if (attachRes && attachRes.sessionId) {
            await setupPageSession(pt.targetId, attachRes.sessionId, pt.url, pt.title);
          }
        } catch (e) {
          console.warn(`[SessionManager] attach to page ${pt.targetId} warning:`, e.message);
        }
      }
    }

    return conn;
  }

  /**
   * Tìm session trang mục tiêu tốt nhất trên Slave để nhận tương tác
   */
  static getBestTargetSession(conn) {
    if (!conn || !conn.sessions || conn.sessions.size === 0) return null;

    const sessionsList = Array.from(conn.sessions.values()).filter(s => s && s.sessionId);
    if (sessionsList.length === 0) return null;

    // 1. Ưu tiên session đang hiển thị thực tế (visible)
    let target = sessionsList.find(s => s.visible === true);
    if (target) return target;

    // 2. Ưu tiên session có tương tác/hoạt động gần đây nhất
    target = [...sessionsList].sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0))[0];
    return target || sessionsList[sessionsList.length - 1];
  }

  /**
   * Đóng an toàn kết nối của một profile
   */
  static closeConnection(conn) {
    if (!conn) return;
    try {
      if (conn.client) {
        conn.client.close();
      }
    } catch {}
    if (conn.sessions) {
      conn.sessions.clear();
    }
  }
}

module.exports = SessionManager;
