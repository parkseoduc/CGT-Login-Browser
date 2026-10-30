/**
 * Action Synchronizer - Main Controller / Orchestrator
 * Coordinates SessionManager, EventDispatcher, and WindowTiler for real-time Master-to-Slave sync
 */

const { EventEmitter } = require('node:events');
const launcher = require('./launcher');
const SessionManager = require('./sync/session-manager');
const EventDispatcher = require('./sync/event-dispatcher');
const WindowTiler = require('./sync/window-tiler');

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

    // profileId -> connection object managed by SessionManager
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
      success: true,
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

    try {
      // 1. Kết nối vào Master qua SessionManager
      const masterInfo = launcher.getRunningInfo(masterId);
      if (!masterInfo || !masterInfo.wsEndpoint) {
        throw new Error('Không lấy được cổng kết nối CDP của Master');
      }

      const masterConn = await SessionManager.attachToProfile(masterId, masterInfo.wsEndpoint, true, {
        onSyncEvent: (ev) => this._broadcastToSlaves(ev),
        onNavigate: (url) => this._broadcastToSlaves({ type: 'nav', data: { url } }),
        onTabCreated: (url) => {
          if (this.isSyncing) {
            this._broadcastToSlaves({ type: 'tab-create', data: { url: url || 'about:blank' } });
          }
        },
        onTabClosed: (targetId) => {
          if (this.isSyncing) {
            this._broadcastToSlaves({ type: 'tab-close', data: { targetId } });
          }
        },
      });
      this.connections.set(masterId, masterConn);

      // 2. Kết nối vào từng Slave qua SessionManager
      for (const slaveId of validSlaveIds) {
        try {
          const sInfo = launcher.getRunningInfo(slaveId);
          if (sInfo && sInfo.wsEndpoint) {
            const sConn = await SessionManager.attachToProfile(slaveId, sInfo.wsEndpoint, false);
            this.connections.set(slaveId, sConn);
          }
        } catch (err) {
          console.warn(`[Synchronizer] Could not connect to slave ${slaveId}:`, err.message);
        }
      }

      if (this.connections.size <= 1) {
        throw new Error('Không thể thiết lập kết nối đồng bộ tới Profile Slave nào.');
      }

      this.isSyncing = true;
      this.emit('sync-started', this.getSyncStatus());
      return this.getSyncStatus();
    } catch (err) {
      await this.stopSync();
      throw err;
    }
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
      SessionManager.closeConnection(conn);
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
    if (conn) {
      SessionManager.closeConnection(conn);
      this.connections.delete(slaveId);
    }
    if (this.slaveProfileIds.length === 0) {
      this.stopSync();
    }
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
          await conn.client.send('Target.createTarget', { url: targetUrl }, null, 2500);
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
            await conn.client.send('Target.closeTarget', { targetId: lastSession.targetId }, null, 2500);
          }
        } catch (err) {}
        continue;
      }

      // Tìm session mục tiêu phù hợp nhất trên Slave
      const targetSession = SessionManager.getBestTargetSession(conn);
      if (!targetSession) continue;

      const dispatch = () => {
        EventDispatcher.dispatchEvent(conn.client, targetSession, eventObj, this.options);
      };

      if (this.options.humanDelay) {
        const delay = Math.floor(Math.random() * (this.options.maxDelayMs - this.options.minDelayMs + 1)) + this.options.minDelayMs;
        setTimeout(dispatch, delay);
      } else {
        dispatch();
      }
    }
  }

  // Window Grid Tiling: Ủy quyền cho WindowTiler
  async tileWindows(params = {}) {
    return WindowTiler.tile(params);
  }
}

// Singleton instance
const synchronizer = new Synchronizer();

module.exports = synchronizer;
