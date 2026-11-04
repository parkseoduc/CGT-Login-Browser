const http = require('http');

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let resp = '';
      res.on('data', chunk => resp += chunk);
      res.on('end', () => resolve(JSON.parse(resp)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCleanExecution() {
  console.log('[Test Clean] Creating clean test profile (Direct connection)...');
  const profRes = await postJson('http://127.0.0.1:51888/api/v1/profiles', {
    name: 'Automation Direct Test Profile',
    group_name: 'Test Group',
    os: 'Windows 11',
    browser: 'Chrome 122',
    proxy_type: 'direct' // no proxy
  });
  const profileId = profRes.profile.id;
  console.log(`[Test Clean] Created profile: ${profRes.profile.name} (${profileId})`);

  // Run Warm-up or custom steps
  const runRes = await postJson('http://127.0.0.1:51888/api/v1/automation/run', {
    script_id: 'preset-warmup',
    profile_ids: [profileId],
    concurrency: 1,
    auto_close: true,
    bypass_proxy_guard: true
  });
  console.log('[Test Clean] Started run:', runRes);

  for (let i = 0; i < 30; i++) {
    await wait(1000);
    const statusRes = await getJson('http://127.0.0.1:51888/api/v1/automation/status');
    const s = statusRes.status;
    console.log(`[Status ${i + 1}s] Running: ${s.is_running}, Completed: ${s.completed}/${s.total}, Success: ${s.total - s.failed}`);
    if (!s.is_running && s.completed > 0) {
      console.log('Final logs:', s.recent_logs);
      break;
    }
  }

  // Cleanup profile
  await new Promise(res => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 51888,
      path: `/api/v1/profiles/${profileId}`,
      method: 'DELETE'
    }, () => res());
    req.end();
  });
  console.log('[Test Clean] Profile cleaned up.');
}

testCleanExecution().catch(err => {
  console.error('[Clean Test Error]:', err);
});
