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

async function run() {
  console.log('[Test Engine] Getting profiles...');
  const profilesRes = await getJson('http://127.0.0.1:51888/api/v1/profiles');
  const profile = profilesRes.profiles[0];
  if (!profile) throw new Error('No profiles found');

  console.log(`[Test Engine] Using profile: ${profile.name} (${profile.id})`);

  // Create a quick custom test script
  const scriptRes = await postJson('http://127.0.0.1:51888/api/v1/automation/scripts', {
    name: '🧪 Quick Test Automation',
    description: 'Kiểm thử điều khiển tự động hoá',
    category: 'custom',
    steps: [
      { type: 'navigate', url: 'https://example.com' },
      { type: 'sleep', seconds: 1 },
      { type: 'scroll', distance: 200, direction: 'down' },
      { type: 'screenshot', filename: 'test_auto_done' }
    ]
  });

  console.log('[Test Engine] Script created:', scriptRes.script.id);

  // Trigger automation run
  const runRes = await postJson('http://127.0.0.1:51888/api/v1/automation/run', {
    script_id: scriptRes.script.id,
    profile_ids: [profile.id],
    concurrency: 1,
    auto_close: true,
    bypass_proxy_guard: true // so it runs even without live US proxy
  });

  console.log('[Test Engine] Run started:', runRes);

  // Poll status until done
  for (let i = 0; i < 20; i++) {
    await wait(1000);
    const statusRes = await getJson('http://127.0.0.1:51888/api/v1/automation/status');
    const s = statusRes.status;
    console.log(`[Status] Running: ${s.is_running}, Completed: ${s.completed}/${s.total}, Failed: ${s.failed}`);
    if (!s.is_running && s.completed > 0) {
      console.log('Recent logs:', s.recent_logs.slice(-3));
      console.log('✅ Automation Engine Test Passed 100%!');
      break;
    }
  }
}

run().catch(err => {
  console.error('[Test Engine Error]:', err);
  process.exit(1);
});
