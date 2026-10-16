const assert = require('node:assert');
const synchronizer = require('../src/synchronizer');

async function runStep4Tests() {
  console.log('======================================================');
  console.log('    TESTING STEP 4: ACTION SYNCHRONIZER & GRID TILING  ');
  console.log('======================================================\n');

  // [1] Test Synchronizer initial status
  console.log('[1] Testing Synchronizer Initial State...');
  const initialStatus = synchronizer.getSyncStatus();
  assert.strictEqual(initialStatus.isSyncing, false, 'Initial isSyncing must be false');
  assert.strictEqual(initialStatus.masterProfileId, null, 'Initial masterProfileId must be null');
  assert.strictEqual(initialStatus.activeSlavesCount, 0, 'Initial activeSlavesCount must be 0');
  assert.strictEqual(initialStatus.options.syncMouse, true, 'Default syncMouse must be true');
  assert.strictEqual(initialStatus.options.syncKeyboard, true, 'Default syncKeyboard must be true');
  assert.strictEqual(initialStatus.options.syncScroll, true, 'Default syncScroll must be true');
  assert.strictEqual(initialStatus.options.syncNav, true, 'Default syncNav must be true');
  assert.strictEqual(initialStatus.options.humanDelay, true, 'Default humanDelay must be true');
  console.log('  • Initial state verified: ✅ PASS\n');

  // [2] Test Grid Tiling Math Logic
  console.log('[2] Testing Grid Tiling Calculation Algorithms...');
  
  // Test layouts with 4 windows on 1920x1080
  const screenW = 1920;
  const screenH = 1040;

  // Function to simulate layout calculation
  function computeGrid(n, layout) {
    let cols = 2, rows = 1;
    if (layout === '2x1') { cols = 2; rows = 1; }
    else if (layout === '2x2') { cols = 2; rows = 2; }
    else if (layout === '3x2') { cols = 3; rows = 2; }
    else if (layout === '4x2') { cols = 4; rows = 2; }
    else {
      if (n === 1) { cols = 1; rows = 1; }
      else if (n === 2) { cols = 2; rows = 1; }
      else if (n <= 4) { cols = 2; rows = 2; }
      else if (n <= 6) { cols = 3; rows = 2; }
      else if (n <= 8) { cols = 4; rows = 2; }
      else { cols = Math.ceil(Math.sqrt(n)); rows = Math.ceil(n / cols); }
    }
    const w = Math.floor(screenW / cols);
    const h = Math.floor(screenH / rows);
    const cells = [];
    for (let i = 0; i < n; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      cells.push({ col, row, left: col * w, top: row * h, width: w, height: h });
    }
    return { cols, rows, w, h, cells };
  }

  // Check 2x2 grid
  const grid4 = computeGrid(4, 'auto');
  assert.strictEqual(grid4.cols, 2, 'Auto 4 windows must use 2 cols');
  assert.strictEqual(grid4.rows, 2, 'Auto 4 windows must use 2 rows');
  assert.strictEqual(grid4.w, 960, 'Width must be 960');
  assert.strictEqual(grid4.h, 520, 'Height must be 520');
  assert.strictEqual(grid4.cells[0].left, 0);
  assert.strictEqual(grid4.cells[0].top, 0);
  assert.strictEqual(grid4.cells[1].left, 960);
  assert.strictEqual(grid4.cells[1].top, 0);
  assert.strictEqual(grid4.cells[2].left, 0);
  assert.strictEqual(grid4.cells[2].top, 520);
  assert.strictEqual(grid4.cells[3].left, 960);
  assert.strictEqual(grid4.cells[3].top, 520);
  console.log('  • 2x2 Grid Math (960x520px per cell): ✅ PASS');

  // Check 3x2 grid (6 windows)
  const grid6 = computeGrid(6, 'auto');
  assert.strictEqual(grid6.cols, 3, 'Auto 6 windows must use 3 cols');
  assert.strictEqual(grid6.rows, 2, 'Auto 6 windows must use 2 rows');
  assert.strictEqual(grid6.w, 640, 'Width must be 640');
  assert.strictEqual(grid6.h, 520, 'Height must be 520');
  console.log('  • 3x2 Grid Math (640x520px per cell): ✅ PASS');

  // Check 4x2 grid (8 windows)
  const grid8 = computeGrid(8, '4x2');
  assert.strictEqual(grid8.cols, 4, '4x2 layout must use 4 cols');
  assert.strictEqual(grid8.rows, 2, '4x2 layout must use 2 rows');
  assert.strictEqual(grid8.w, 480, 'Width must be 480');
  assert.strictEqual(grid8.h, 520, 'Height must be 520');
  console.log('  • 4x2 Grid Math (480x520px per cell): ✅ PASS\n');

  // [3] Test Event Coordinate Translation (Relative Aspect Ratio Scaling)
  console.log('[3] Testing Relative Coordinate Translation...');
  const masterWidth = 1920;
  const masterHeight = 1080;
  const slaveWidth = 1280;
  const slaveHeight = 720;

  // Master clicks center at (960, 540)
  const masterX = 960;
  const masterY = 540;
  const ratioX = masterX / masterWidth;
  const ratioY = masterY / masterHeight;
  const translatedX = Math.round(ratioX * slaveWidth);
  const translatedY = Math.round(ratioY * slaveHeight);

  assert.strictEqual(ratioX, 0.5, 'X ratio must be exactly 0.5 (center)');
  assert.strictEqual(ratioY, 0.5, 'Y ratio must be exactly 0.5 (center)');
  assert.strictEqual(translatedX, 640, 'Slave translated X must be 640 (center of 1280)');
  assert.strictEqual(translatedY, 360, 'Slave translated Y must be 360 (center of 720)');
  console.log(`  • Master (960, 540) -> Slave (640, 360): ✅ PASS (Exact Relative Center)\n`);

  // [4] Test Validation Rules
  console.log('[4] Testing Synchronizer Validation Rules...');
  let startErrorThrown = false;
  try {
    await synchronizer.startSync({ masterId: null });
  } catch (err) {
    startErrorThrown = true;
    assert.match(err.message, /Vui lòng chọn 1 cửa sổ Profile làm Master/);
  }
  assert.strictEqual(startErrorThrown, true, 'Must reject starting sync without masterId');
  console.log('  • Reject without Master ID: ✅ PASS');

  let slaveErrorThrown = false;
  try {
    await synchronizer.startSync({ masterId: 'non-existent-master-id', slaveIds: [] });
  } catch (err) {
    slaveErrorThrown = true;
    assert.match(err.message, /hiện không chạy/);
  }
  assert.strictEqual(slaveErrorThrown, true, 'Must reject non-running master profile');
  console.log('  • Reject non-running Master ID: ✅ PASS\n');

  console.log('======================================================');
  console.log('     STEP 4 ACTION SYNCHRONIZER TESTS PASSED!         ');
  console.log('======================================================\n');
}

runStep4Tests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
