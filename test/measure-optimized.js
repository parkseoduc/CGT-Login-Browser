const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

async function testOptimized() {
  const kernelPath = 'C:\\Users\\Admin\\.gemini\\antigravity\\scratch\\antidetect-manager\\bin\\chromium\\chrome.exe';
  const testDir = 'C:\\Users\\Admin\\.gemini\\antigravity\\scratch\\antidetect-manager\\data\\profiles\\test-optimized\\chrome';
  fs.mkdirSync(testDir, { recursive: true });

  const optimizedArgs = [
    `--user-data-dir=${testDir}`,
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--remote-debugging-port=0',
    '--remote-debugging-address=127.0.0.1',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-mode',
    '--password-store=basic',
    '--force-color-profile=srgb',
    '--webrtc-ip-handling-policy=disable_non_proxied_udp',
    '--force-webrtc-ip-handling-policy',
    '--no-session-restore',
    '--disable-session-crashed-bubble',
    '--disable-restore-session-state',
    // === CÁC CỜ TỐI ƯU SIÊU NHẸ (RESOURCE OPTIMIZATION FLAGS) ===
    '--disable-component-update',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-default-apps',
    '--disable-client-side-phishing-detection',
    '--disable-hang-monitor',
    '--disable-popup-blocking',
    '--disable-prompt-on-repost',
    '--disable-domain-reliability',
    '--disable-features=OptimizationGuideModelDownloading,OptimizationHints,MediaRouter,DialMediaRouteProvider,CalculateNativeWinOcclusion,FlashDeprecationWarning',
    '--disk-cache-size=20971520',
    '--media-cache-size=10485760',
    '--js-flags=--max-old-space-size=256',
    'about:blank'
  ];

  console.log('Spawning optimized Chromium instance...');
  const child = spawn(kernelPath, optimizedArgs, { detached: false, stdio: 'ignore' });
  const pid = child.pid;
  console.log(`Optimized Chromium PID: ${pid}`);

  await new Promise(r => setTimeout(r, 3500));

  const scriptPath = path.join(__dirname, 'measure-pid.ps1');
  const psCmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" ${pid}`;
  const raw = execSync(psCmd).toString().trim();
  const stats = JSON.parse(raw);

  console.log('\n=== KẾT QUẢ ĐO LƯỜNG SAU KHI TỐI ƯU CỜ BẬT (OPTIMIZED FLAGS) ===');
  console.log(`- Số tiến trình (Process Count): ${stats.ProcessCount}`);
  console.log(`- Tổng Working Set (kèm thư viện DLL chia sẻ): ${stats.WorkingSetTotalMB} MB`);
  console.log(`- RAM thực tế chiếm dụng độc quyền (Actual Private RAM): ${stats.ActualPrivateRamMB} MB`);
  console.log(`- RAM tiến trình chính (Main Process): ${stats.MainRamMB} MB`);
  console.log(`- Tổng CPU tiêu thụ (Total CPU): ${stats.TotalCpuSec}s`);

  child.kill();
  try {
    fs.rmSync(path.dirname(testDir), { recursive: true, force: true });
  } catch {}
}

testOptimized().catch(console.error);
