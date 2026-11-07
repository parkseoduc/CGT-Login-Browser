const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
console.log('=== BẮT ĐẦU DỌN DẸP BẢN TRẮNG SẠCH & ĐÓNG GÓI RELEASE ===\n');

// 1. Dọn dẹp dữ liệu test trong Database
console.log('[1/6] Dọn dẹp cơ sở dữ liệu antidetect.db...');
const db = require('../src/db');
const rawDb = db.getDb();

// Xóa toàn bộ profile test
rawDb.prepare('DELETE FROM profiles').run();
rawDb.prepare('DELETE FROM groups').run();
rawDb.prepare('DELETE FROM proxies').run();

// Thu gọn dung lượng database (VACUUM)
rawDb.prepare('VACUUM').run();

const remainingProfiles = db.listAllProfiles();
const remainingGroups = db.listGroups();
const remainingProxies = db.listProxies();
const extensions = db.listExtensions();

console.log(`✓ Database đã sạch hoàn toàn:`);
console.log(`  • Profiles: ${remainingProfiles.length}`);
console.log(`  • Groups: ${remainingGroups.length}`);
console.log(`  • Proxies: ${remainingProxies.length}`);
console.log(`  • Preset Extensions: ${extensions.length} (Sẵn sàng sử dụng)`);

// 2. Dọn dẹp thư mục profiles trên ổ đĩa
console.log('\n[2/6] Dọn dẹp thư mục data/profiles/ ...');
const profilesDir = path.join(ROOT_DIR, 'data', 'profiles');
if (fs.existsSync(profilesDir)) {
  for (const item of fs.readdirSync(profilesDir)) {
    if (item === '.gitkeep') continue;
    const fullPath = path.join(profilesDir, item);
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`  - Đã xóa thư mục profile cũ: ${item}`);
    } catch (e) {
      console.warn(`  ! Không thể xóa ${item}: ${e.message}`);
    }
  }
}
fs.writeFileSync(path.join(profilesDir, '.gitkeep'), '', 'utf8');

// 3. Dọn dẹp các thư mục test rác
console.log('\n[3/6] Dọn dẹp các thư mục bộ nhớ đệm test...');
const cleanupTargets = [
  path.join(ROOT_DIR, 'data', 'temp_web_test_profile'),
  path.join(ROOT_DIR, 'bin', 'chromium', 'test_user'),
  path.join(ROOT_DIR, 'scratch')
];

for (const target of cleanupTargets) {
  if (fs.existsSync(target)) {
    try {
      fs.rmSync(target, { recursive: true, force: true });
      console.log(`  - Đã dọn dẹp: ${path.relative(ROOT_DIR, target)}`);
    } catch (e) {
      console.warn(`  ! Bỏ qua ${target}: ${e.message}`);
    }
  }
}

// 4. Đảm bảo Node.js Portable tồn tại
console.log('\n[4/6] Kiểm tra Node.js Portable Runtime trong bin/node/ ...');
const nodePortable = path.join(ROOT_DIR, 'bin', 'node', 'node.exe');
if (!fs.existsSync(nodePortable)) {
  const systemNode = 'C:\\Program Files\\nodejs\\node.exe';
  if (fs.existsSync(systemNode)) {
    fs.mkdirSync(path.dirname(nodePortable), { recursive: true });
    fs.copyFileSync(systemNode, nodePortable);
    console.log('✓ Đã sao chép Node.js Runtime vào bin/node/node.exe');
  } else {
    console.warn('! Cảnh báo: Không tìm thấy system node.exe để sao chép.');
  }
} else {
  console.log(`✓ Node.js Portable đã sẵn sàng (${(fs.statSync(nodePortable).size / 1024 / 1024).toFixed(1)} MB)`);
}

// 5. Biên dịch lại OmniBrowser.exe với icon chính hãng
console.log('\n[5/6] Biên dịch OmniBrowser.exe native...');
try {
  const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
  const cmd = `"${cscPath}" /nologo /target:winexe /win32icon:app.ico /r:System.Windows.Forms.dll /r:System.Drawing.dll /out:OmniBrowser.exe "src\\app-launcher.cs"`;
  execSync(cmd, { cwd: ROOT_DIR, stdio: 'inherit' });
  console.log('✓ Đã biên dịch OmniBrowser.exe thành công!');
} catch (err) {
  console.error('! Lỗi biên dịch OmniBrowser.exe:', err.message);
  process.exit(1);
}

// 6. Đóng gói ra thư mục releases
console.log('\n[6/6] Đóng gói bản phát hành trắng sạch ra thư mục releases/ ...');
const releasesDir = path.join(ROOT_DIR, 'releases');
fs.mkdirSync(releasesDir, { recursive: true });

const releaseZip = path.join(releasesDir, 'OmniBrowser-v1.0.0-Portable-x64.zip');
const tempStagingDir = path.join(releasesDir, 'OmniBrowser-Portable');

if (fs.existsSync(tempStagingDir)) {
  fs.rmSync(tempStagingDir, { recursive: true, force: true });
}
fs.mkdirSync(tempStagingDir, { recursive: true });

console.log('  • Đang sao chép các tệp vào thư mục đóng gói tạm thời...');

function copyFolderRecursive(src, dest, ignoreList = []) {
  fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    if (ignoreList.includes(item)) continue;
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyFolderRecursive(srcPath, destPath, ignoreList);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Sao chép các tệp gốc
const rootFilesToCopy = [
  'OmniBrowser.exe',
  'start-desktop.bat',
  'start-web.bat',
  'download-kernel.bat',
  'HUONG-DAN-SU-DUNG.txt',
  'app.ico',
  'package.json'
];

for (const f of rootFilesToCopy) {
  const src = path.join(ROOT_DIR, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(tempStagingDir, f));
  }
}

// Sao chép thư mục
copyFolderRecursive(path.join(ROOT_DIR, 'public'), path.join(tempStagingDir, 'public'));
copyFolderRecursive(path.join(ROOT_DIR, 'src'), path.join(tempStagingDir, 'src'));
copyFolderRecursive(path.join(ROOT_DIR, 'desktop'), path.join(tempStagingDir, 'desktop'));

// Cấu trúc data trắng sạch
const dataDest = path.join(tempStagingDir, 'data');
fs.mkdirSync(dataDest, { recursive: true });
fs.mkdirSync(path.join(dataDest, 'profiles'), { recursive: true });
fs.writeFileSync(path.join(dataDest, 'profiles', '.gitkeep'), '', 'utf8');
copyFolderRecursive(path.join(ROOT_DIR, 'data', 'extensions'), path.join(dataDest, 'extensions'));

// Sao chép database trắng sạch
fs.copyFileSync(path.join(ROOT_DIR, 'data', 'antidetect.db'), path.join(dataDest, 'antidetect.db'));

// Sao chép bin (node + chromium)
const binDest = path.join(tempStagingDir, 'bin');
fs.mkdirSync(binDest, { recursive: true });
copyFolderRecursive(path.join(ROOT_DIR, 'bin', 'node'), path.join(binDest, 'node'));
copyFolderRecursive(path.join(ROOT_DIR, 'bin', 'chromium'), path.join(binDest, 'chromium'), ['test_user']);

console.log('  • Đang nén file zip chuẩn Windows (Optimal Compression)...');
if (fs.existsSync(releaseZip)) {
  fs.unlinkSync(releaseZip);
}

// Dùng PowerShell nén zip không cần công cụ ngoài
const psCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${tempStagingDir}', '${releaseZip}', [System.IO.Compression.CompressionLevel]::Optimal, $false)"`;
execSync(psCmd, { stdio: 'inherit' });

// Xóa thư mục tạm sau khi nén xong
fs.rmSync(tempStagingDir, { recursive: true, force: true });

const zipStats = fs.statSync(releaseZip);
console.log('\n============================================================');
console.log('🎉 ĐÃ HOÀN TẤT ĐÓNG GÓI BẢN TRẮNG SẠCH THÀNH CÔNG!');
console.log(`📦 Đường dẫn file zip: ${releaseZip}`);
console.log(`📊 Kích thước gói nén: ${(zipStats.size / 1024 / 1024).toFixed(1)} MB`);
console.log('============================================================\n');
