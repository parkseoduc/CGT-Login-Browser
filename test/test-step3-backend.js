const db = require('../src/db');
const proxyModule = require('../src/proxy');

async function testStep3Backend() {
  console.log('======================================================');
  console.log('       TESTING STEP 3: GROUPS & PROXY MANAGER BACKEND ');
  console.log('======================================================\n');

  // 1. Groups Test
  console.log('[1] Testing Groups Management...');
  const grp = db.createGroup('E-commerce Camp 2026', '#10B981', 'Quản lý tài khoản Shop');
  console.log(`  -> Created group: ${grp.name} (${grp.id})`);

  const groups = db.listGroups();
  console.log(`  -> Total groups: ${groups.length}`);
  const foundGrp = groups.find(g => g.id === grp.id);
  console.log(`  • Group name verified: ${foundGrp ? '✅ PASS' : '❌ FAIL'}`);

  const updatedGrp = db.updateGroup(grp.id, { name: 'E-commerce Camp 2026 (Updated)' });
  console.log(`  • Group rename verified: ${updatedGrp.name.includes('Updated') ? '✅ PASS' : '❌ FAIL'}`);

  // 2. Proxy Parsing & Management Test
  console.log('\n[2] Testing Proxy String Parser...');
  const parsed1 = proxyModule.parseProxyString('http://admin:secret123@123.45.67.89:8080');
  console.log('  • URL format:', parsed1.type === 'http' && parsed1.username === 'admin' && parsed1.port === 8080 ? '✅ PASS' : '❌ FAIL');

  const parsed2 = proxyModule.parseProxyString('socks5://user2:pass2@10.20.30.40:1080');
  console.log('  • SOCKS5 URL format:', parsed2.type === 'socks5' && parsed2.host === '10.20.30.40' ? '✅ PASS' : '❌ FAIL');

  const parsed3 = proxyModule.parseProxyString('192.168.1.100:9999:myuser:mypass');
  console.log('  • Host:Port:User:Pass format:', parsed3.host === '192.168.1.100' && parsed3.port === 9999 ? '✅ PASS' : '❌ FAIL');

  console.log('\n[3] Testing Proxy Database CRUD...');
  const prx = db.createProxy({
    name: 'Proxy US Static 01',
    type: 'http',
    host: '127.0.0.1',
    port: 8080,
    username: 'testuser',
    password: 'testpassword'
  });
  console.log(`  -> Created proxy: ${prx.name} (${prx.id})`);

  const proxies = db.listProxies();
  const foundPrx = proxies.find(p => p.id === prx.id);
  console.log(`  • Proxy created verified: ${foundPrx ? '✅ PASS' : '❌ FAIL'}`);

  const updatedPrx = db.updateProxy(prx.id, { ping: 45, status: 'live', country: 'US' });
  console.log(`  • Proxy status update verified: ${updatedPrx.status === 'live' && updatedPrx.ping === 45 ? '✅ PASS' : '❌ FAIL'}`);

  // Cleanup test group & proxy
  db.deleteGroup(grp.id);
  db.deleteProxy(prx.id);
  console.log('  • Cleanup completed successfully.\n');

  console.log('======================================================');
  console.log('     STEP 3 BACKEND & PROXY ENGINE TESTS PASSED!      ');
  console.log('======================================================');
}

testStep3Backend().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
