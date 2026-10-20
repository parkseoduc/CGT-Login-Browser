const launcher = require('../src/launcher');
const db = require('../src/db');
const { execSync } = require('child_process');

async function run() {
  const profiles = db.listProfiles();
  const p = profiles[0];
  console.log(`Starting profile: ${p.name} (${p.id})`);
  
  const startTime = Date.now();
  const info = await launcher.startProfile(p.id);
  const launchDuration = Date.now() - startTime;
  console.log(`Launched in ${launchDuration}ms with PID: ${info.pid}`);

  // Chờ 3s để Chromium load trang iphey.com xong
  await new Promise(r => setTimeout(r, 4000));

  // Đo RAM của tất cả tiến trình con thuộc PID này
  const psCmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${require('path').join(__dirname, 'measure-pid.ps1')}" ${info.pid}`;

  try {
    const raw = execSync(psCmd).toString().trim();
    const stats = JSON.parse(raw);
    console.log('=== KẾT QUẢ ĐO LƯỜNG TÀI NGUYÊN THỰC TẾ TRÊN 1 PROFILE ===');
    console.log(`- Số tiến trình Chromium sinh ra: ${stats.ProcessCount} processes`);
    console.log(`- Tổng dung lượng RAM chiếm dụng (Working Set): ${stats.TotalRamMB} MB`);
    console.log(`- Dung lượng RAM tiến trình Browser chính: ${stats.MainRamMB} MB`);
    console.log(`- Tổng thời gian CPU đã tiêu thụ: ${stats.TotalCpuSec}s`);
  } catch (err) {
    console.error('Lỗi đo lường:', err.message);
  }

  await launcher.stopProfile(p.id);
  console.log('Đã đóng profile an toàn.');
}

run().catch(console.error);
