const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
console.log('=== BẮT ĐẦU ĐÓNG GÓI BẢN PORTABLE CGT-LOGIN (KÈM CHROMIUM 153 & BAT LAUNCHER) ===\n');

// 1. Biên dịch lại CGT-Login.exe và OmniBrowser.exe
console.log('[1/5] Biên dịch CGT-Login.exe & OmniBrowser.exe...');
const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
execSync(`"${cscPath}" /nologo /target:winexe /win32icon:app.ico /r:System.Windows.Forms.dll /r:System.Drawing.dll /out:CGT-Login.exe "src\\app-launcher.cs"`, { cwd: ROOT_DIR, stdio: 'inherit' });
execSync(`"${cscPath}" /nologo /target:winexe /win32icon:app.ico /r:System.Windows.Forms.dll /r:System.Drawing.dll /out:OmniBrowser.exe "src\\app-launcher.cs"`, { cwd: ROOT_DIR, stdio: 'inherit' });
console.log('✓ Đã biên dịch CGT-Login.exe thành công!');

// 2. Thư mục đích releases
const releasesDir = path.join(ROOT_DIR, 'releases');
fs.mkdirSync(releasesDir, { recursive: true });

const targetZipName = 'CGT-Login-v1.0.0-Portable-x64.zip';
const targetZip = path.join(releasesDir, targetZipName);
const stagingDir = path.join(releasesDir, 'CGT-Login-Portable');

if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

console.log('\n[2/5] Chuẩn bị tệp và thư mục staging...');

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
const rootFiles = [
  'CGT-Login.exe',
  'OmniBrowser.exe',
  'Khoi_Dong_CGT_Login.bat',
  'CHAY_CGT_LOGIN.bat',
  'start-desktop.bat',
  'start-web.bat',
  'HANDOVER_CGT_LOGIN.md',
  'HUONG_DAN_VAN_HANH.md',
  '.env.example',
  'clean_antidetect.db',
  'app.ico',
  'package.json'
];

for (const f of rootFiles) {
  const src = path.join(ROOT_DIR, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(stagingDir, f));
    console.log(`  + Đã sao chép: ${f}`);
  }
}

// Sao chép thư mục mã nguồn
console.log('\n[3/5] Sao chép public, src, desktop...');
copyFolderRecursive(path.join(ROOT_DIR, 'public'), path.join(stagingDir, 'public'));
copyFolderRecursive(path.join(ROOT_DIR, 'src'), path.join(stagingDir, 'src'));
copyFolderRecursive(path.join(ROOT_DIR, 'desktop'), path.join(stagingDir, 'desktop'));

// Cấu trúc data trắng sạch
const dataDest = path.join(stagingDir, 'data');
fs.mkdirSync(dataDest, { recursive: true });
fs.mkdirSync(path.join(dataDest, 'profiles'), { recursive: true });
fs.writeFileSync(path.join(dataDest, 'profiles', '.gitkeep'), '', 'utf8');
if (fs.existsSync(path.join(ROOT_DIR, 'data', 'extensions'))) {
  copyFolderRecursive(path.join(ROOT_DIR, 'data', 'extensions'), path.join(dataDest, 'extensions'));
}

// Lấy database trắng sạch đặt làm antidetect.db
const cleanDbSource = path.join(ROOT_DIR, 'data', 'clean_antidetect.db');
if (fs.existsSync(cleanDbSource)) {
  fs.copyFileSync(cleanDbSource, path.join(dataDest, 'antidetect.db'));
} else {
  fs.copyFileSync(path.join(ROOT_DIR, 'clean_antidetect.db'), path.join(dataDest, 'antidetect.db'));
}
console.log('✓ Đã nạp cơ sở dữ liệu mẫu trắng sạch (0 profile, full hạn mức 999,999)');

// Sao chép bin (node portable + nhân Chromium antidetect 153)
console.log('\n[4/5] Sao chép Node Portable & Nhân Chromium 153 Core...');
const binDest = path.join(stagingDir, 'bin');
fs.mkdirSync(binDest, { recursive: true });

copyFolderRecursive(path.join(ROOT_DIR, 'bin', 'node'), path.join(binDest, 'node'));
console.log('  ✓ Đã sao chép bin/node/node.exe');

copyFolderRecursive(path.join(ROOT_DIR, 'bin', 'chromium'), path.join(binDest, 'chromium'), ['test_user']);
console.log('  ✓ Đã sao chép bin/chromium/ (Nhân Chromium 153 antidetect đầy đủ)');

// Nén gói ZIP tối ưu
console.log('\n[5/5] Tiến hành nén file ZIP bằng PowerShell Optimal Compression...');
if (fs.existsSync(targetZip)) {
  fs.unlinkSync(targetZip);
}

const psCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${stagingDir}', '${targetZip}', [System.IO.Compression.CompressionLevel]::Optimal, $false)"`;
execSync(psCmd, { stdio: 'inherit' });

// Xóa thư mục staging tạm
fs.rmSync(stagingDir, { recursive: true, force: true });

const zipStats = fs.statSync(targetZip);
const zipSizeMB = (zipStats.size / 1024 / 1024).toFixed(1);

console.log('\n============================================================');
console.log('🎉 ĐÃ HOÀN TẤT ĐÓNG GÓI GÓI CHẠY SẴN CGT-LOGIN PORTABLE!');
console.log(`📦 Đường dẫn file: ${targetZip}`);
console.log(`📊 Dung lượng file ZIP: ${zipSizeMB} MB`);
console.log('============================================================\n');

// Sao chép thêm ra Desktop để tiện gửi qua Telegram
const desktopPath = path.join(process.env.USERPROFILE || 'C:\\Users\\Admin', 'Desktop', targetZipName);
try {
  fs.copyFileSync(targetZip, desktopPath);
  console.log(`🚀 Đã sao chép thêm 1 bản ra Desktop để gửi ngay: ${desktopPath}`);
} catch (e) {
  console.warn('! Không thể sao chép ra Desktop:', e.message);
}
