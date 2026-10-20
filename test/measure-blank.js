const launcher = require('../src/launcher');
const db = require('../src/db');
const { execSync } = require('child_process');
const path = require('path');

async function test() {
  const p = db.createProfile({
    name: 'Measure Blank Profile',
    start_url: 'about:blank',
    extension_ids: []
  });

  const info = await launcher.startProfile(p.id);
  await new Promise(r => setTimeout(r, 3000));

  const scriptPath = path.join(__dirname, 'measure-pid.ps1');
  const psCmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" ${info.pid}`;
  const raw = execSync(psCmd).toString().trim();
  console.log('=== KẾT QUẢ ĐO LƯỜNG TRANG ABOUT:BLANK (CHƯA VÀO WEB NẶNG) ===');
  console.log(JSON.parse(raw));

  await launcher.stopProfile(p.id);
  db.deleteProfile(p.id);
}

test().catch(console.error);
