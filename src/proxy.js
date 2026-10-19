const http = require('node:http');
const net = require('node:net');
const { URL } = require('node:url');

/**
 * Phân tích chuỗi proxy theo các định dạng phổ biến:
 * 1. http://user:pass@host:port
 * 2. socks5://user:pass@host:port
 * 3. host:port:user:pass
 * 4. host:port
 */
function parseProxyString(str) {
  if (!str || typeof str !== 'string') return null;
  const raw = str.trim();
  if (!raw) return null;

  // Trường hợp có scheme (http://, https://, socks5://)
  if (raw.includes('://')) {
    try {
      const u = new URL(raw);
      return {
        type: u.protocol.replace(':', '').toLowerCase() || 'http',
        host: u.hostname,
        port: parseInt(u.port, 10) || (u.protocol === 'socks5:' ? 1080 : 8080),
        username: decodeURIComponent(u.username || ''),
        password: decodeURIComponent(u.password || '')
      };
    } catch {
      return null;
    }
  }

  // Trường hợp định dạng host:port:user:pass hoặc host:port
  const parts = raw.split(':');
  if (parts.length >= 2) {
    const host = parts[0].trim();
    const port = parseInt(parts[1].trim(), 10);
    if (!host || isNaN(port)) return null;

    const username = parts[2] ? parts[2].trim() : '';
    const password = parts[3] ? parts[3].trim() : '';

    return {
      type: 'http',
      host,
      port,
      username,
      password
    };
  }

  return null;
}

/**
 * Kiểm tra kết nối Proxy HTTP/HTTPS
 */
function checkHttpProxy(proxy, timeoutMs = 7000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const testHost = 'ip-api.com';
    const testPath = '/json/?fields=status,message,country,countryCode,city,query,isp';

    const headers = {
      Host: testHost,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AntidetectProxyChecker/1.0',
    };

    if (proxy.username && proxy.password) {
      const auth = Buffer.from(`${proxy.username}:${proxy.password}`).toString('base64');
      headers['Proxy-Authorization'] = `Basic ${auth}`;
    }

    const options = {
      host: proxy.host,
      port: proxy.port,
      method: 'GET',
      path: `http://${testHost}${testPath}`,
      headers,
      timeout: timeoutMs,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        const ping = Date.now() - startTime;
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const json = JSON.parse(data);
            if (json.status === 'success') {
              return resolve({
                live: true,
                ping,
                ip: json.query || proxy.host,
                country: json.countryCode || 'UN',
                city: json.city || '',
                isp: json.isp || '',
              });
            }
          } catch {}
          return resolve({
            live: true,
            ping,
            ip: proxy.host,
            country: 'OK',
            city: '',
            isp: '',
          });
        }
        resolve({
          live: false,
          ping,
          error: `HTTP ${res.statusCode} ${res.statusMessage || ''}`,
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ live: false, ping: timeoutMs, error: 'Connection Timeout' });
    });

    req.on('error', (err) => {
      resolve({ live: false, ping: Date.now() - startTime, error: err.message });
    });

    req.end();
  });
}

/**
 * Kiểm tra kết nối SOCKS5 thuần (Native Socket Handshake)
 */
function checkSocks5Proxy(proxy, timeoutMs = 7000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = net.connect({ host: proxy.host, port: proxy.port });
    let isFinished = false;

    const timer = setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        socket.destroy();
        resolve({ live: false, ping: timeoutMs, error: 'SOCKS5 Timeout' });
      }
    }, timeoutMs);

    socket.on('error', (err) => {
      if (!isFinished) {
        isFinished = true;
        clearTimeout(timer);
        resolve({ live: false, ping: Date.now() - startTime, error: err.message });
      }
    });

    // 1. Gửi Method Selection Request (0x05 = Socks5, 0x01/0x02 methods)
    const hasAuth = Boolean(proxy.username && proxy.password);
    const methods = hasAuth ? Buffer.from([0x05, 0x02, 0x00, 0x02]) : Buffer.from([0x05, 0x01, 0x00]);
    socket.write(methods);

    let step = 1;
    socket.on('data', (data) => {
      if (isFinished) return;

      if (step === 1) {
        // Response method selection: [0x05, selectedMethod]
        if (data[0] !== 0x05) {
          isFinished = true;
          clearTimeout(timer);
          socket.destroy();
          return resolve({ live: false, ping: Date.now() - startTime, error: 'Invalid SOCKS5 version' });
        }

        const method = data[1];
        if (method === 0x02 && hasAuth) {
          // Gửi Subnegotiation User/Pass
          step = 2;
          const uBuf = Buffer.from(proxy.username);
          const pBuf = Buffer.from(proxy.password);
          const authMsg = Buffer.concat([
            Buffer.from([0x01, uBuf.length]),
            uBuf,
            Buffer.from([pBuf.length]),
            pBuf
          ]);
          socket.write(authMsg);
        } else if (method === 0x00) {
          // Không cần Auth, tiếp tục bước Connect
          step = 3;
          sendSocks5Connect(socket);
        } else {
          isFinished = true;
          clearTimeout(timer);
          socket.destroy();
          return resolve({ live: false, ping: Date.now() - startTime, error: 'SOCKS5 Auth Required or Rejected' });
        }
      } else if (step === 2) {
        // Response auth: [0x01, status] (0x00 = success)
        if (data[1] === 0x00) {
          step = 3;
          sendSocks5Connect(socket);
        } else {
          isFinished = true;
          clearTimeout(timer);
          socket.destroy();
          return resolve({ live: false, ping: Date.now() - startTime, error: 'SOCKS5 Authentication Failed' });
        }
      } else if (step === 3) {
        // Response connect: [0x05, 0x00, 0x00, ...]
        if (data[1] === 0x00) {
          // Kết nối SOCKS5 thành công! Gửi HTTP request
          step = 4;
          const ping = Date.now() - startTime;
          const httpReq = `GET /json/?fields=status,message,country,countryCode,city,query,isp HTTP/1.1\r\nHost: ip-api.com\r\nUser-Agent: Antidetect\r\nConnection: close\r\n\r\n`;
          socket.write(httpReq);
        } else {
          isFinished = true;
          clearTimeout(timer);
          socket.destroy();
          return resolve({ live: false, ping: Date.now() - startTime, error: `SOCKS5 Connect Code: ${data[1]}` });
        }
      } else if (step === 4) {
        isFinished = true;
        clearTimeout(timer);
        const ping = Date.now() - startTime;
        const respText = data.toString('utf8');
        socket.destroy();

        try {
          const bodyIndex = respText.indexOf('\r\n\r\n');
          if (bodyIndex !== -1) {
            const body = respText.slice(bodyIndex + 4);
            const json = JSON.parse(body);
            return resolve({
              live: true,
              ping,
              ip: json.query || proxy.host,
              country: json.countryCode || 'SOCKS5',
              city: json.city || '',
              isp: json.isp || '',
            });
          }
        } catch {}

        resolve({
          live: true,
          ping,
          ip: proxy.host,
          country: 'SOCKS5',
          city: '',
          isp: '',
        });
      }
    });
  });
}

function sendSocks5Connect(socket) {
  const hostBuf = Buffer.from('ip-api.com');
  const portBuf = Buffer.alloc(2);
  portBuf.writeUInt16BE(80, 0);

  const connectMsg = Buffer.concat([
    Buffer.from([0x05, 0x01, 0x00, 0x03, hostBuf.length]),
    hostBuf,
    portBuf
  ]);
  socket.write(connectMsg);
}

/**
 * Hàm kiểm tra Proxy tổng quát
 */
async function checkProxy(proxy, timeoutMs = 7000) {
  const type = (proxy.type || 'http').toLowerCase();
  if (type === 'socks5') {
    return checkSocks5Proxy(proxy, timeoutMs);
  }
  return checkHttpProxy(proxy, timeoutMs);
}

/**
 * Tạo một HTTP Proxy Forwarder cục bộ (Loopback) tại 127.0.0.1
 * Tự động chèn Proxy-Authorization header hoặc xử lý handshake SOCKS5
 * Giúp Chromium kết nối mượt mà tới các proxy có User/Password mà không bị lỗi ERR_TUNNEL_CONNECTION_FAILED
 */
function createLocalProxyForwarder(remoteProxy) {
  return new Promise((resolve, reject) => {
    const isSocks5 = (remoteProxy.type || '').toLowerCase() === 'socks5';
    const authHeader = (remoteProxy.username && remoteProxy.password)
      ? 'Basic ' + Buffer.from(`${remoteProxy.username}:${remoteProxy.password}`).toString('base64')
      : null;

    const server = http.createServer((req, res) => {
      // Chuyển tiếp request HTTP thông thường
      const headers = { ...req.headers };
      if (authHeader) {
        headers['Proxy-Authorization'] = authHeader;
      }
      const options = {
        host: remoteProxy.host,
        port: remoteProxy.port,
        path: req.url,
        method: req.method,
        headers,
      };

      const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      });
      proxyReq.on('error', (err) => {
        if (!res.headersSent) res.writeHead(502);
        res.end(`Proxy Forwarder Error: ${err.message}`);
      });
      req.pipe(proxyReq, { end: true });
    });

    server.on('connect', (req, clientSocket, head) => {
      const [targetHost, targetPortStr] = req.url.split(':');
      const targetPort = parseInt(targetPortStr, 10) || 443;

      if (isSocks5) {
        // Chuyển tiếp HTTPS qua SOCKS5
        const remoteSocket = net.connect({ host: remoteProxy.host, port: remoteProxy.port });
        let isFinished = false;

        const cleanup = () => {
          if (!isFinished) {
            isFinished = true;
            try { clientSocket.end(); } catch {}
            try { remoteSocket.destroy(); } catch {}
          }
        };

        clientSocket.on('error', cleanup);
        remoteSocket.on('error', cleanup);

        const hasAuth = Boolean(remoteProxy.username && remoteProxy.password);
        const methods = hasAuth ? Buffer.from([0x05, 0x02, 0x00, 0x02]) : Buffer.from([0x05, 0x01, 0x00]);
        remoteSocket.write(methods);

        let step = 1;
        remoteSocket.on('data', function onSocksData(chunk) {
          if (step === 1) {
            if (chunk[0] !== 0x05) return cleanup();
            if (chunk[1] === 0x02 && hasAuth) {
              step = 2;
              const uBuf = Buffer.from(remoteProxy.username);
              const pBuf = Buffer.from(remoteProxy.password);
              remoteSocket.write(Buffer.concat([
                Buffer.from([0x01, uBuf.length]), uBuf,
                Buffer.from([pBuf.length]), pBuf
              ]));
            } else if (chunk[1] === 0x00) {
              step = 3;
              sendConnect();
            } else {
              return cleanup();
            }
          } else if (step === 2) {
            if (chunk[1] === 0x00) {
              step = 3;
              sendConnect();
            } else {
              return cleanup();
            }
          } else if (step === 3) {
            if (chunk[1] === 0x00) {
              remoteSocket.removeListener('data', onSocksData);
              clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
              if (head && head.length > 0) remoteSocket.write(head);
              remoteSocket.pipe(clientSocket);
              clientSocket.pipe(remoteSocket);
            } else {
              cleanup();
            }
          }
        });

        function sendConnect() {
          const hBuf = Buffer.from(targetHost);
          const pBuf = Buffer.alloc(2);
          pBuf.writeUInt16BE(targetPort, 0);
          remoteSocket.write(Buffer.concat([
            Buffer.from([0x05, 0x01, 0x00, 0x03, hBuf.length]),
            hBuf,
            pBuf
          ]));
        }
      } else {
        // Chuyển tiếp HTTPS qua HTTP Proxy
        const remoteSocket = net.connect({ host: remoteProxy.host, port: remoteProxy.port }, () => {
          let connectReq = `CONNECT ${req.url} HTTP/1.1\r\nHost: ${req.url}\r\n`;
          if (authHeader) {
            connectReq += `Proxy-Authorization: ${authHeader}\r\n`;
          }
          connectReq += `\r\n`;
          remoteSocket.write(connectReq);
        });

        const cleanup = () => {
          try { clientSocket.end(); } catch {}
          try { remoteSocket.destroy(); } catch {}
        };

        clientSocket.on('error', cleanup);
        remoteSocket.on('error', cleanup);

        let buffer = Buffer.alloc(0);
        function onHttpProxyData(chunk) {
          buffer = Buffer.concat([buffer, chunk]);
          const headerEnd = buffer.indexOf('\r\n\r\n');
          if (headerEnd !== -1) {
            remoteSocket.removeListener('data', onHttpProxyData);
            const firstLine = buffer.slice(0, headerEnd).toString('utf8').split('\r\n')[0];
            const statusCode = parseInt(firstLine.split(' ')[1], 10);

            if (statusCode === 200) {
              clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
              const remaining = buffer.slice(headerEnd + 4);
              if (remaining.length > 0) clientSocket.write(remaining);
              if (head && head.length > 0) remoteSocket.write(head);
              remoteSocket.pipe(clientSocket);
              clientSocket.pipe(remoteSocket);
            } else {
              console.error('[Forwarder] Remote proxy rejected CONNECT:', firstLine);
              clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
              cleanup();
            }
          }
        }
        remoteSocket.on('data', onHttpProxyData);
      }
    });

      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        resolve({
          port,
          url: `http://127.0.0.1:${port}`,
          close: () => new Promise((res) => {
            server.close(() => res());
          }),
        });
      });

      server.on('error', reject);
    });
  }

async function triggerProxyRotation(proxyObj) {
  const rotationUrl = proxyObj.rotation_api_url;
  if (!rotationUrl || !rotationUrl.trim()) {
    throw new Error('Proxy này chưa được cấu hình Link API Xoay IP (rotation_api_url)');
  }

  const client = rotationUrl.startsWith('https:') ? require('node:https') : require('node:http');

  const apiRes = await new Promise((resolve, reject) => {
    const req = client.get(rotationUrl, { timeout: 15000 }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: body.trim() });
      });
    });
    req.on('error', (err) => reject(new Error(`Lỗi kết nối API xoay IP: ${err.message}`)));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Yêu cầu đổi IP qua API bị quá thời gian chờ (15s)'));
    });
  });

  let parsed = null;
  try {
    parsed = JSON.parse(apiRes.body);
  } catch {
    parsed = { raw: apiRes.body };
  }

  // Đợi 1.5 giây để modem/gateway hoàn tất đổi IP
  await new Promise(r => setTimeout(r, 1500));

  // Kiểm tra lại IP mới
  const checkRes = await checkProxy(proxyObj);

  return {
    success: true,
    statusCode: apiRes.statusCode,
    apiResponse: parsed,
    newProxyInfo: checkRes,
  };
}

module.exports = {
  parseProxyString,
  checkProxy,
  createLocalProxyForwarder,
  triggerProxyRotation,
};
