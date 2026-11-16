const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const ROOT_DIR = path.resolve(__dirname, '..');
const sourceDbPath = path.join(ROOT_DIR, 'data', 'antidetect.db');
const cleanDbPath = path.join(ROOT_DIR, 'data', 'clean_antidetect.db');
const rootCleanDbPath = path.join(ROOT_DIR, 'clean_antidetect.db');

console.log('[CleanDB] Tạo bản sao cơ sở dữ liệu mẫu trắng sạch...');
if (fs.existsSync(cleanDbPath)) {
  try { fs.unlinkSync(cleanDbPath); } catch {}
}

fs.copyFileSync(sourceDbPath, cleanDbPath);

const db = new DatabaseSync(cleanDbPath);

// Xóa dữ liệu cá nhân & test
db.exec('DELETE FROM profiles;');
db.exec('DELETE FROM proxies;');
db.exec('DELETE FROM groups;');
try { db.exec('DELETE FROM orders;'); } catch (e) {}
try { db.exec('DELETE FROM otp_codes;'); } catch (e) {}
try { db.exec('DELETE FROM password_resets;'); } catch (e) {}

// Giữ lại hoặc cập nhật tài khoản quản trị mẫu mở full hạn mức 999999
db.exec(`
  UPDATE users 
  SET max_profiles = 999999, plan = 'CGT Team Unlimited', plan_code = 'TEAM_UNLIMITED', role = 'admin', status = 'ACTIVE';
`);

// Thu nhỏ dung lượng
db.exec('VACUUM;');
db.close();

// Sao chép ra thư mục gốc
fs.copyFileSync(cleanDbPath, rootCleanDbPath);

console.log('✓ Đã tạo thành công database mẫu trắng sạch tại:');
console.log('  1.', cleanDbPath);
console.log('  2.', rootCleanDbPath);
