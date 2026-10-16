const { EventEmitter } = require('node:events');
const { CdpClient } = require('./cdp');
const launcher = require('./launcher');

class Synchronizer extends EventEmitter {
  constructor() {
    super();
    this.isSyncing = false;
    this.masterProfileId = null;
    this.slaveProfileIds = [];
    this.options = {
      syncMouse: true,
      syncKeyboard: true,
      syncScroll: true,
      syncNav: true,
      humanDelay: true,
      minDelayMs: 10,
      maxDelayMs: 45,
    };
    this.metrics = {
      eventsSent: 0,
      mouseEvents: 0,
      keyEvents: 0,
      scrollEvents: 0,
      startedAt: null,
    };

    // profileId -> { client: CdpClient, sessionId: string, targetId: string, width: number, height: number }
    this.connections = new Map();

    // Lắng nghe sự kiện profile bị đóng để tự hủy đồng bộ
    launcher.events.on('profile-stopped', ({ profileId }) => {
      if (this.isSyncing) {
        if (profileId === this.masterProfileId) {
          console.log(`[Synchronizer] Master profile ${profileId} closed. Stopping sync session.`);
          this.stopSync();
        } else if (this.slaveProfileIds.includes(profileId)) {
          console.log(`[Synchronizer] Slave profile ${profileId} closed. Removing from session.`);
          this.removeSlave(profileId);
        }
      }
    });
  }

  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      masterProfileId: this.masterProfileId,
      slaveProfileIds: [...this.slaveProfileIds],
      activeSlavesCount: this.slaveProfileIds.length,
      options: { ...this.options },
      metrics: { ...this.metrics },
    };
  }

  // Khởi động đồng bộ thao tác Master -> Slaves
  async startSync({ masterId, slaveIds = [], options = {} }) {
    if (this.isSyncing) {
      await this.stopSync();
    }

    if (!masterId) {
      throw new Error('Vui lòng chọn 1 cửa sổ Profile làm Master điều khiển');
    }

    if (!launcher.isProfileRunning(masterId)) {
      throw new Error(`Profile Master (${masterId}) hiện không chạy. Vui lòng mở profile trước.`);
    }

    const validSlaveIds = (Array.isArray(slaveIds) ? slaveIds : [])
      .filter(id => id !== masterId && launcher.isProfileRunning(id));

    if (validSlaveIds.length === 0) {
      throw new Error('Cần ít nhất 1 Profile Slave đang chạy khác với Master để đồng bộ.');
    }

    this.options = { ...this.options, ...options };
    this.masterProfileId = masterId;
    this.slaveProfileIds = validSlaveIds;
    this.metrics = {
      eventsSent: 0,
      mouseEvents: 0,
      keyEvents: 0,
      scrollEvents: 0,
      startedAt: new Date().toISOString(),
    };

    console.log(`[Synchronizer] Initializing sync: Master=${masterId}, Slaves=[${validSlaveIds.join(', ')}]`);

    // 1. Kết nối vào Master qua CDP
    const masterInfo = launcher.getRunningInfo(masterId);
    if (!masterInfo || !masterInfo.wsEndpoint) {
      throw new Error('Không lấy được cổng kết nối CDP của Master');
    }

    const masterConn = await this._attachToProfile(masterId, masterInfo.wsEndpoint, true);
    this.connections.set(masterId, masterConn);

    // 2. Kết nối vào từng Slave qua CDP
    for (const slaveId of validSlaveIds) {
      try {
        const sInfo = launcher.getRunningInfo(slaveId);
        if (sInfo && sInfo.wsEndpoint) {
          const sConn = await this._attachToProfile(slaveId, sInfo.wsEndpoint, false);
          this.connections.set(slaveId, sConn);
        }
      } catch (err) {
        console.warn(`[Synchronizer] Could not connect to slave ${slaveId}:`, err.message);
      }
    }

    this.isSyncing = true;
    this.emit('sync-started', this.getSyncStatus());

    return this.getSyncStatus();
  }

  // Dừng đồng bộ
  async stopSync() {
    if (!this.isSyncing && this.connections.size === 0) {
      return { success: true, message: 'Sync was not active' };
    }

    console.log('[Synchronizer] Stopping sync session...');
    this.isSyncing = false;

    // Đóng toàn bộ kết nối CDP phụ trợ của Synchronizer
    for (const [id, conn] of this.connections.entries()) {
      try {
        if (conn.client) {
          conn.client.close();
        }
      } catch {
        // ignore
      }
    }

    this.connections.clear();
    const prevMaster = this.masterProfileId;
    this.masterProfileId = null;
    this.slaveProfileIds = [];

    this.emit('sync-stopped', { masterProfileId: prevMaster });
    return { success: true };
  }

  removeSlave(slaveId) {
    this.slaveProfileIds = this.slaveProfileIds.filter(id => id !== slaveId);
    const conn = this.connections.get(slaveId);
    if (conn && conn.client) {
      try { conn.client.close(); } catch {}
      this.connections.delete(slaveId);
    }
    if (this.slaveProfileIds.length === 0) {
      this.stopSync();
    }
  }

  // Kết nối và chuẩn bị phiên CDP cho Profile
  async _attachToProfile(profileId, wsEndpoint, isMaster) {
    const client = new CdpClient(wsEndpoint);
    await client.connect(3000);

    const conn = {
      client,
      isMaster,
      sessions: new Map(), // targetId -> { sessionId, width, height, url, title }
    };

    const captureScript = `
      (() => {
        if (window.__omniSyncInstalled) return;
        window.__omniSyncInstalled = true;

        function sendSync(type, data) {
          try {
            if (typeof window.__omniSyncEvent === 'function') {
              window.__omniSyncEvent(JSON.stringify({ type, data, ts: Date.now() }));
            }
          } catch (e) {}
        }

        // Mouse Click & Mouse Up
        window.addEventListener('mousedown', (e) => {
          sendSync('mouse', {
            eventType: 'mousePressed',
            x: e.clientX,
            y: e.clientY,
            button: e.button === 0 ? 'left' : (e.button === 1 ? 'middle' : 'right'),
            buttons: e.buttons,
            clickCount: e.detail || 1,
            modifiers: (e.altKey ? 1 : 0) | (e.ctrlKey ? 2 : 0) | (e.metaKey ? 4 : 0) | (e.shiftKey ? 8 : 0),
            w: window.innerWidth,
            h: window.innerHeight,
          });
        }, true);

        window.addEventListener('mouseup', (e) => {
          sendSync('mouse', {
            eventType: 'mouseReleased',
            x: e.clientX,
            y: e.clientY,
            button: e.button === 0 ? 'left' : (e.button === 1 ? 'middle' : 'right'),
            buttons: e.buttons,
            clickCount: e.detail || 1,
            modifiers: (e.altKey ? 1 : 0) | (e.ctrlKey ? 2 : 0) | (e.metaKey ? 4 : 0) | (e.shiftKey ? 8 : 0),
            w: window.innerWidth,
            h: window.innerHeight,
          });
        }, true);

        // Scroll Wheel
        window.addEventListener('wheel', (e) => {
          sendSync('wheel', {
            eventType: 'mouseWheel',
            x: e.clientX,
            y: e.clientY,
            deltaX: e.deltaX,
            deltaY: e.deltaY,
            w: window.innerWidth,
            h: window.innerHeight,
          });
        }, { passive: true, capture: true });

        // Keyboard Keydown / Keyup
        window.addEventListener('keydown', (e) => {
          sendSync('key', {
            eventType: 'rawKeyDown',
            key: e.key,
            code: e.code,
            windowsVirtualKeyCode: e.keyCode,
            nativeVirtualKeyCode: e.keyCode,
            text: e.key.length === 1 ? e.key : undefined,
            unmodifiedText: e.key.length === 1 ? e.key : undefined,
            modifiers: (e.altKey ? 1 : 0) | (e.ctrlKey ? 2 : 0) | (e.metaKey ? 4 : 0) | (e.shiftKey ? 8 : 0),
          });
        }, true);

        window.addEventListener('keyup', (e) => {
          sendSync('key', {
            eventType: 'keyUp',
            key: e.key,
            code: e.code,
            windowsVirtualKeyCode: e.keyCode,
            nativeVirtualKeyCode: e.keyCode,
            modifiers: (e.altKey ? 1 : 0) | (e.ctrlKey ? 2 : 0) | (e.metaKey ? 4 : 0) | (e.shiftKey ? 8 : 0),
          });
        }, true);

        // URL Change detection
        let curHref = window.location.href;
        setInterval(() => {
          if (window.location.href !== curHref) {
            curHref = window.location.href;
            sendSync('nav', { url: curHref });
          }
        }, 500);
      })();
    `;

    // Helper: chuẩn bị và gắn hook vào 1 page session
    const setupPageSession = async (targetId, sessionId, url = '', title = '') => {
      try {
        await client.send('Page.enable', {}, sessionId);

        let width = 1920;
        let height = 1080;
        try {
          const evalRes = await client.send('Runtime.evaluate', {
            expression: '({ w: window.innerWidth, h: window.innerHeight })',
            returnByValue: true,
          }, sessionId);
          if (evalRes?.result?.value) {
            width = evalRes.result.value.w || 1920;
            height = evalRes.result.value.h || 1080;
          }
        } catch {}

        conn.sessions.set(targetId, { sessionId, width, height, url, title });

        if (isMaster) {
          await client.send('Runtime.enable', {}, sessionId);
          await client.send('Runtime.addBinding', { name: '__omniSyncEvent' }, sessionId).catch(() => {});
          await client.send('Page.addScriptToEvaluateOnNewDocument', { source: captureScript }, sessionId).catch(() => {});
          await client.send('Runtime.evaluate', { expression: captureScript }, sessionId).catch(() => {});

          // Lắng nghe điều hướng URL chính thức qua CDP Page domain
          client.on('Page.frameNavigated', (params) => {
            if (!this.isSyncing) return;
            if (params.frame && !params.frame.parentId && params.frame.url) {
              const fUrl = params.frame.url;
              if (fUrl && fUrl !== 'about:blank' && !fUrl.startsWith('chrome://')) {
                this._broadcastToSlaves({
                  type: 'nav',
                  data: { url: fUrl }
                });
              }
            }
          });
        }
      } catch (err) {
        console.warn(`[Synchronizer] setupPageSession warning on ${targetId}:`, err.message);
      }
    };

    // 1. Kích hoạt AutoAttach để tự động phát hiện tab mới
    await client.send('Target.setAutoAttach', {
      autoAttach: true,
      waitForDebuggerOnStart: false,
      flatten: true,
    }).catch(() => {});

    // 2. Lấy toàn bộ các page targets hiện có
    const targetsRes = await client.send('Target.getTargets');
    const targets = targetsRes.targetInfos || [];
    const pageTargets = targets.filter(t => t.type === 'page');

    if (pageTargets.length === 0) {
      client.close();
      throw new Error(`Không tìm thấy cửa sổ trang của Profile ${profileId}`);
    }

    for (const pt of pageTargets) {
      try {
        const attachRes = await client.send('Target.attachToTarget', {
          targetId: pt.targetId,
          flatten: true,
        });
        await setupPageSession(pt.targetId, attachRes.sessionId, pt.url, pt.title);
      } catch (e) {
        console.warn(`[Synchronizer] attach to page ${pt.targetId} error:`, e.message);
      }
    }

    // 3. Lắng nghe tab mới được mở ra khi đang đồng bộ
    client.on('Target.attachedToTarget', async (params) => {
      if (params.targetInfo && params.targetInfo.type === 'page') {
        await setupPageSession(params.targetInfo.targetId, params.sessionId, params.targetInfo.url, params.targetInfo.title);
        // Đồng bộ mở thêm tab mới trên các Slaves
        if (isMaster && this.isSyncing) {
          console.log(`[Synchronizer] Master opened tab: ${params.targetInfo.url}. Syncing to slaves...`);
          this._broadcastToSlaves({
            type: 'tab-create',
            data: { url: params.targetInfo.url || 'about:blank' }
          });
        }
      }
    });

    client.on('Target.detachedFromTarget', (params) => {
      if (params.targetId) {
        conn.sessions.delete(params.targetId);
        // Đồng bộ đóng tab trên các Slaves
        if (isMaster && this.isSyncing) {
          this._broadcastToSlaves({
            type: 'tab-close',
            data: { targetId: params.targetId }
          });
        }
      }
    });

    if (isMaster) {
      client.on('Runtime.bindingCalled', (params) => {
        if (!this.isSyncing) return;
        if (params.name === '__omniSyncEvent') {
          try {
            const ev = JSON.parse(params.payload);
            this._broadcastToSlaves(ev);
          } catch (e) {
            console.error('[Synchronizer] Error parsing sync event payload:', e.message);
          }
        }
      });
    }

    return conn;
  }

  // Phát tín hiệu thao tác từ Master tới toàn bộ Slaves
  async _broadcastToSlaves(eventObj) {
    if (!this.isSyncing || this.slaveProfileIds.length === 0) return;

    const { type, data } = eventObj;

    // Lọc theo tùy chọn người dùng
    if (type === 'mouse' && !this.options.syncMouse) return;
    if (type === 'wheel' && !this.options.syncScroll) return;
    if (type === 'key' && !this.options.syncKeyboard) return;
    if (type === 'nav' && !this.options.syncNav) return;

    this.metrics.eventsSent++;
    if (type === 'mouse') this.metrics.mouseEvents++;
    else if (type === 'key') this.metrics.keyEvents++;
    else if (type === 'wheel') this.metrics.scrollEvents++;

    for (const slaveId of this.slaveProfileIds) {
      const conn = this.connections.get(slaveId);
      if (!conn || !conn.client || conn.client.ws?.readyState !== 1) continue;

      // Xử lý mở tab mới trên Slave
      if (type === 'tab-create') {
        try {
          const targetUrl = data.url && data.url !== 'about:blank' ? data.url : 'about:blank';
          await conn.client.send('Target.createTarget', { url: targetUrl });
        } catch (err) {
          console.warn('[Synchronizer] Error creating tab on slave:', err.message);
        }
        continue;
      }

      // Xử lý đóng tab trên Slave
      if (type === 'tab-close') {
        try {
          const sessionsList = Array.from(conn.sessions.values());
          if (sessionsList.length > 1) {
            const lastSession = sessionsList[sessionsList.length - 1];
            await conn.client.send('Target.closeTarget', { targetId: lastSession.targetId });
          }
        } catch (err) {}
        continue;
      }

      if (conn.sessions.size === 0) continue;

      // Tìm session trang mục tiêu phù hợp nhất trên Slave (ưu tiên trang có URL thực tế khác about:blank)
      const sessionsList = Array.from(conn.sessions.values());
      const targetSession = sessionsList.find(s => s.url && s.url !== 'about:blank' && !s.url.startsWith('chrome://')) 
        || sessionsList[sessionsList.length - 1];

      if (!targetSession) continue;

      const dispatch = async () => {
        try {
          if (type === 'mouse') {
            const ratioX = (data.x || 0) / (data.w || targetSession.width || 1920);
            const ratioY = (data.y || 0) / (data.h || targetSession.height || 1080);
            const targetX = Math.round(ratioX * (targetSession.width || 1920));
            const targetY = Math.round(ratioY * (targetSession.height || 1080));

            // 1. Luôn di chuyển chuột (mouseMoved) đến tọa độ trước khi bấm để kích hoạt focus & hover
            await conn.client.send('Input.dispatchMouseEvent', {
              type: 'mouseMoved',
              x: targetX,
              y: targetY,
              modifiers: data.modifiers || 0,
            }, targetSession.sessionId).catch(() => {});

            // 2. Dispatch sự kiện chuột chính (mousePressed / mouseReleased)
            await conn.client.send('Input.dispatchMouseEvent', {
              type: data.eventType,
              x: targetX,
              y: targetY,
              button: data.button || 'left',
              buttons: data.eventType === 'mousePressed' ? (data.buttons || 1) : 0,
              clickCount: data.clickCount || 1,
              modifiers: data.modifiers || 0,
            }, targetSession.sessionId);
          } else if (type === 'wheel') {
            const ratioX = (data.x || 0) / (data.w || targetSession.width || 1920);
            const ratioY = (data.y || 0) / (data.h || targetSession.height || 1080);
            const targetX = Math.round(ratioX * (targetSession.width || 1920));
            const targetY = Math.round(ratioY * (targetSession.height || 1080));

            await conn.client.send('Input.dispatchMouseEvent', {
              type: 'mouseWheel',
              x: targetX,
              y: targetY,
              deltaX: data.deltaX || 0,
              deltaY: data.deltaY || 0,
            }, targetSession.sessionId);
          } else if (type === 'key') {
            await conn.client.send('Input.dispatchKeyEvent', {
              type: data.eventType,
              key: data.key,
              code: data.code,
              windowsVirtualKeyCode: data.windowsVirtualKeyCode,
              nativeVirtualKeyCode: data.nativeVirtualKeyCode,
              text: data.text,
              unmodifiedText: data.unmodifiedText,
              modifiers: data.modifiers || 0,
            }, targetSession.sessionId);

            // Kích hoạt char event khi gõ ký tự thông thường
            if (data.eventType === 'rawKeyDown' && data.text) {
              await conn.client.send('Input.dispatchKeyEvent', {
                type: 'char',
                text: data.text,
                unmodifiedText: data.unmodifiedText,
                key: data.key,
                code: data.code,
              }, targetSession.sessionId);
            }
          } else if (type === 'nav' && data.url) {
            await conn.client.send('Page.navigate', { url: data.url }, targetSession.sessionId);
          }
        } catch (err) {
          // Bỏ qua lỗi gửi từng frame để không làm gián đoạn luồng đồng bộ
        }
      };

      if (this.options.humanDelay) {
        const delay = Math.floor(Math.random() * (this.options.maxDelayMs - this.options.minDelayMs + 1)) + this.options.minDelayMs;
        setTimeout(dispatch, delay);
      } else {
        dispatch();
      }
    }
  }

  // -------------------------------------------------------------
  // Window Grid Tiling: Sắp xếp cửa sổ theo lưới trên màn hình
  // -------------------------------------------------------------
  async tileWindows({ layout = 'auto', screenWidth = 1920, screenHeight = 1040, profileIds = null } = {}) {
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
      if (n === 1) {
        cols = 1; rows = 1;
      } else if (n === 2) {
        cols = 2; rows = 1;
      } else if (n <= 4) {
        cols = 2; rows = 2;
      } else if (n <= 6) {
        cols = 3; rows = 2;
      } else if (n <= 8) {
        cols = 4; rows = 2;
      } else {
        cols = Math.ceil(Math.sqrt(n));
        rows = Math.ceil(n / cols);
      }
    }

    const w = Math.floor(screenWidth / cols);
    const h = Math.floor(screenHeight / rows);
    const results = [];

    console.log(`[Synchronizer] Tiling ${n} windows into ${cols}x${rows} grid (cell: ${w}x${h}px)`);

    for (let i = 0; i < targetList.length; i++) {
      const p = targetList[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const left = col * w;
      const top = row * h;

      try {
        const client = new CdpClient(p.wsEndpoint);
        await client.connect(2000);

        // Lấy danh sách targets để tìm targetId
        const targetsRes = await client.send('Target.getTargets');
        const page = (targetsRes.targetInfos || []).find(t => t.type === 'page') || targetsRes.targetInfos[0];

        if (page) {
          const winRes = await client.send('Browser.getWindowForTarget', { targetId: page.targetId });
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
            });
            results.push({ profileId: p.profileId, left, top, width: w, height: h, success: true });
          }
        }
        client.close();
      } catch (err) {
        console.warn(`[Synchronizer] Failed to tile window for profile ${p.profileId}:`, err.message);
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

// Singleton instance
const synchronizer = new Synchronizer();

module.exports = synchronizer;
