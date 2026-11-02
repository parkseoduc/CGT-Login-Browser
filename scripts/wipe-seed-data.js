const fs = require('node:fs');
const path = require('node:path');
const { getDb } = require('../src/db');
const { PROFILES_DIR } = require('../src/config');

console.log('=== WIPING SEED DATA ===');

const db = getDb();

// 1. Delete all profiles
const delProfiles = db.prepare('DELETE FROM profiles').run();
console.log(`Deleted profiles: ${delProfiles.changes}`);

// 2. Delete all proxies
const delProxies = db.prepare('DELETE FROM proxies').run();
console.log(`Deleted proxies: ${delProxies.changes}`);

// 3. Delete all groups
const delGroups = db.prepare('DELETE FROM groups').run();
console.log(`Deleted groups: ${delGroups.changes}`);

// 4. Run VACUUM to compact database
db.exec('VACUUM;');
console.log('Database vacuumed successfully.');

// 5. Clean up data/profiles folder, keeping .gitkeep
if (fs.existsSync(PROFILES_DIR)) {
  const items = fs.readdirSync(PROFILES_DIR);
  let removedCount = 0;
  for (const item of items) {
    if (item === '.gitkeep') continue;
    const fullPath = path.join(PROFILES_DIR, item);
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
      removedCount++;
    } catch (e) {
      console.warn(`Could not delete ${fullPath}:`, e.message);
    }
  }
  console.log(`Removed ${removedCount} profile directories from ${PROFILES_DIR}`);
}

console.log('=== DATA SEEDING WIPED CLEANLY ===');
