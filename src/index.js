const config = require('./config');
const db = require('./db');
const launcher = require('./launcher');
const server = require('./server');
const license = require('./license-manager');

async function main() {
  console.log('==================================================');
  console.log('       ANTIDETECT PROFILE MANAGER - CORE ENGINE    ');
  console.log('==================================================');

  config.ensureDirectories();
  console.log(`[Storage] Data Dir: ${config.DATA_DIR}`);
  console.log(`[Storage] Database: ${config.DB_PATH}`);

  // Khởi tạo Database
  db.getDb();
  console.log('[Database] SQLite initialized with WAL mode.');

  // Khởi tạo License Engine
  const licStatus = await license.initLicense();
  console.log(`[License] Plan: ${licStatus.plan} | HWID: ${licStatus.device_id} | Quota: ${licStatus.current_profiles}/${licStatus.max_profiles}`);

  // Kiểm tra các nhân Chromium có sẵn
  const kernels = config.getAvailableKernels();
  console.log('\n[Kernels] Detected Chromium engines:');
  for (const k of kernels) {
    const status = k.exists ? '✅ READY' : '❌ NOT FOUND';
    const tag = k.isPrimary ? ' (PRIMARY)' : '';
    console.log(`  • ${k.name}${tag}: ${status}`);
    console.log(`    Path: ${k.path}`);
  }

  // Khởi chạy REST API Server
  try {
    await server.startServer(config.API_PORT);
    console.log(`\n[API Ready] Endpoint: http://127.0.0.1:${config.API_PORT}`);
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      console.log(`\n⚠️  [Thông Báo] Máy chủ OmniBrowser đã đang chạy sẵn tại: http://127.0.0.1:${config.API_PORT}`);
      console.log(`   (Cổng 51888 đang hoạt động, bạn có thể sử dụng bình thường trên trình duyệt)`);
      return;
    }
    throw err;
  }

  // Dọn dẹp an toàn khi tắt app
  const cleanExit = async () => {
    console.log('\n[Shutdown] Closing all running profiles cleanly...');
    const running = launcher.getRunningProfiles();
    for (const p of running) {
      await launcher.stopProfile(p.profileId);
    }
    console.log('[Shutdown] All profiles closed. Goodbye!');
    process.exit(0);
  };

  process.on('SIGINT', cleanExit);
  process.on('SIGTERM', cleanExit);
}

if (require.main === module) {
  main().catch(err => {
    console.error('[Fatal Error]', err);
    process.exit(1);
  });
}

module.exports = {
  config,
  db,
  launcher,
  server,
};
