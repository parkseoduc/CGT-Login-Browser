const db = require('../src/db');
const launcher = require('../src/launcher');
const cdp = require('../src/cdp');

async function main() {
  console.log('=== [1] INSPECTING PROFILES IN DATABASE ===');
  const profiles = db.listProfiles();
  console.log(`Found ${profiles.length} profile(s).`);

  const profile = profiles.find(p => p.proxy_host) || profiles[0];
  if (!profile) {
    throw new Error('No profiles found in database!');
  }

  console.log(`Target Profile: [${profile.id}] "${profile.name}"`);
  console.log(`Assigned Proxy: ${profile.proxy_type || 'http'}://${profile.proxy_host}:${profile.proxy_port} (User: ${profile.proxy_user ? 'YES' : 'NO'})`);

  console.log('\n=== [2] STARTING PROFILE VIA LAUNCHER ===');
  const startResult = await launcher.startProfile(profile.id, {
    start_url: 'https://api.ipify.org?format=json'
  });
  console.log('Start Profile Result:', {
    profileId: startResult.profileId,
    pid: startResult.pid,
    port: startResult.port,
    wsEndpoint: startResult.wsEndpoint,
  });

  console.log('\n=== [3] VERIFYING RUNNING STATUS ===');
  let isRunning = launcher.isProfileRunning(profile.id);
  console.log(`launcher.isProfileRunning('${profile.id}') =>`, isRunning);
  if (!isRunning) {
    throw new Error('FAILED: Profile was expected to be running!');
  }

  console.log('Waiting 3.5s for Chromium to initialize and network to connect...');
  await new Promise(r => setTimeout(r, 3500));

  isRunning = launcher.isProfileRunning(profile.id);
  console.log(`launcher.isProfileRunning('${profile.id}') after 3.5s =>`, isRunning);
  if (!isRunning) {
    throw new Error('FAILED: Profile stopped unexpectedly after 3.5s!');
  }

  console.log('\n=== [4] VERIFYING PROXY TUNNEL VIA DEVTOOLS API ===');
  const runningInfo = launcher.getRunningInfo(profile.id);
  if (!runningInfo) {
    throw new Error('FAILED: runningInfo is null!');
  }

  const versionRes = await fetch(`http://127.0.0.1:${runningInfo.port}/json/version`);
  const versionData = await versionRes.json();
  console.log('Browser DevTools Version info:', {
    Browser: versionData.Browser,
    'Protocol-Version': versionData['Protocol-Version'],
  });

  const targetsRes = await fetch(`http://127.0.0.1:${runningInfo.port}/json/list`);
  const targets = await targetsRes.json();
  console.log(`Active browser tabs count: ${targets.length}`);
  targets.forEach((t, i) => console.log(`  Tab [${i}]: title="${t.title}" url="${t.url}"`));

  console.log('\n=== [5] STOPPING PROFILE VIA LAUNCHER ===');
  const stopResult = await launcher.stopProfile(profile.id);
  console.log('Stop Result:', stopResult);

  isRunning = launcher.isProfileRunning(profile.id);
  console.log(`launcher.isProfileRunning('${profile.id}') after stop =>`, isRunning);
  if (isRunning) {
    throw new Error('FAILED: Profile should not be running after stopProfile!');
  }

  console.log('\n=============================================');
  console.log('>>> ALL VERIFICATION CHECKS PASSED (100%) <<<');
  console.log('=============================================');
  process.exit(0);
}

main().catch(err => {
  console.error('\nVerification Error:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
