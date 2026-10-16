const http = require('node:http');
const { startServer } = require('../src/server');
const db = require('../src/db');
const config = require('../src/config');

async function testApi() {
  console.log('Testing REST API server...');
  let server = null;
  try {
    server = await startServer(51888);
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      console.log('Server already running on port 51888, testing existing instance.');
    } else {
      throw err;
    }
  }

  const request = (path, method = 'GET', body = null) => {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: 51888,
        path,
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      });
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  };

  // 1. GET /api/v1/status
  const statusRes = await request('/api/v1/status');
  console.log('1. GET /api/v1/status ->', statusRes.status, statusRes.body.status);

  // 2. GET /api/v1/profiles
  const profilesRes = await request('/api/v1/profiles');
  console.log('2. GET /api/v1/profiles -> Count:', profilesRes.body.count);

  // 3. POST /api/v1/groups
  const groupRes = await request('/api/v1/groups', 'POST', { name: 'MMO Farm Group', color: '#52c41a' });
  console.log('3. POST /api/v1/groups -> Group Created:', groupRes.body.group.name);

  // 4. POST /api/v1/profiles
  const newProfileRes = await request('/api/v1/profiles', 'POST', {
    name: 'Profile Facebook 01',
    group_id: groupRes.body.group.id,
    start_url: 'https://iphey.com'
  });
  console.log('4. POST /api/v1/profiles -> Created:', newProfileRes.body.profile.id, newProfileRes.body.profile.name);

  if (server) server.close();
  console.log('REST API test completed successfully!');
}

testApi().catch(err => {
  console.error('API Test Error:', err);
  process.exit(1);
});
