const fs = require('node:fs');
const path = require('node:path');

// Đọc cổng loopback CDP từ tệp DevToolsActivePort do Chromium sinh ra
function readDevToolsEndpoint(userDataDir) {
  try {
    const f = path.join(userDataDir, 'DevToolsActivePort');
    if (!fs.existsSync(f)) return null;
    const txt = fs.readFileSync(f, 'utf8').trim();
    const lines = txt.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (!lines.length) return null;
    const port = parseInt(lines[0], 10);
    if (!port || isNaN(port)) return null;
    const browserPath = lines[1] || '';
    const wsEndpoint = `ws://127.0.0.1:${port}${browserPath}`;
    return { port, browserPath, wsEndpoint };
  } catch {
    return null;
  }
}

// Chờ cho đến khi file DevToolsActivePort xuất hiện
async function waitForDevToolsEndpoint(userDataDir, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ep = readDevToolsEndpoint(userDataDir);
    if (ep && ep.port) return ep;
    await new Promise(r => setTimeout(r, 150));
  }
  return null;
}

const { EventEmitter } = require('node:events');

// Client CDP đơn giản dựa trên WebSocket có sẵn của Node.js (không cần thêm dependency ngoài)
class CdpClient extends EventEmitter {
  constructor(wsEndpoint) {
    super();
    this.wsEndpoint = wsEndpoint;
    this.ws = null;
    this.nextId = 1;
    this.callbacks = new Map();
  }

  async connect(timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.ws) this.ws.close();
        reject(new Error(`CDP connect timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        this.ws = new WebSocket(this.wsEndpoint);

        this.ws.onopen = () => {
          clearTimeout(timer);
          resolve();
        };

        this.ws.onerror = (err) => {
          clearTimeout(timer);
          reject(err);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.id && this.callbacks.has(data.id)) {
              const cb = this.callbacks.get(data.id);
              this.callbacks.delete(data.id);
              if (data.error) cb.reject(new Error(data.error.message || 'CDP Error'));
              else cb.resolve(data.result);
            } else if (data.method) {
              // CDP Event notification (e.g. Target.attachedToTarget)
              this.emit(data.method, data.params, data.sessionId);
              this.emit('*', data.method, data.params, data.sessionId);
            }
          } catch {
            // ignore malformed cdp message
          }
        };

        this.ws.onclose = () => {
          // Reject remaining pending callbacks
          for (const cb of this.callbacks.values()) {
            cb.reject(new Error('WebSocket closed'));
          }
          this.callbacks.clear();
          this.emit('close');
        };
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    });
  }

  send(method, params = {}, sessionId = null) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== 1) { // 1 = OPEN
        return reject(new Error('CDP WebSocket not connected'));
      }
      const id = this.nextId++;
      this.callbacks.set(id, { resolve, reject });
      const payload = { id, method, params };
      if (sessionId) payload.sessionId = sessionId;
      this.ws.send(JSON.stringify(payload));
    });
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch { /* ignore */ }
      this.ws = null;
    }
  }
}

// Đóng êm (Graceful Shutdown) qua Browser.close
async function gracefulQuit(userDataDir, pid, timeoutMs = 4000) {
  const ep = readDevToolsEndpoint(userDataDir);
  if (!ep || !ep.wsEndpoint) return false;

  let client = null;
  try {
    client = new CdpClient(ep.wsEndpoint);
    await client.connect(1500);
    // Gửi lệnh đóng an toàn để Chromium xả sạch Cookie / Cache xuống đĩa
    await client.send('Browser.close');
  } catch {
    // Không kết nối được hoặc lỗi gửi lệnh
    return false;
  } finally {
    if (client) client.close();
  }

  // Chờ tiến trình chính tắt hẳn
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isPidAlive(pid)) return true;
    await new Promise(r => setTimeout(r, 100));
  }
  return !isPidAlive(pid);
}

function isPidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  readDevToolsEndpoint,
  waitForDevToolsEndpoint,
  CdpClient,
  gracefulQuit,
  isPidAlive,
};
