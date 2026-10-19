const fs = require('node:fs');
const path = require('node:path');
const { exec } = require('node:child_process');
const crypto = require('node:crypto');
const config = require('./config');
const db = require('./db');
const launcher = require('./launcher');

const BACKUP_TMP_DIR = path.join(config.DATA_DIR, 'tmp_backups');
if (!fs.existsSync(BACKUP_TMP_DIR)) {
  fs.mkdirSync(BACKUP_TMP_DIR, { recursive: true });
}

/**
 * Xuất toàn bộ dữ liệu User Data Dir và cấu hình profile thành file zip
 */
async function exportProfileToZip(profileId) {
  const profile = db.getProfile(profileId);
  if (!profile) {
    throw new Error(`Profile ${profileId} không tồn tại`);
  }

  // Đảm bảo dừng profile nếu đang chạy để dữ liệu SQLite/LevelDB được lưu sạch
  if (launcher.isProfileRunning(profileId)) {
    await launcher.stopProfile(profileId);
  }

  const profileDir = path.join(config.PROFILES_DIR, profileId);
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  // Ghi metadata cấu hình profile vào thư mục
  const metadataPath = path.join(profileDir, 'omni_profile_meta.json');
  fs.writeFileSync(metadataPath, JSON.stringify(profile, null, 2), 'utf8');

  const safeName = (profile.name || profileId).replace(/[^a-zA-Z0-9_\-]/g, '_');
  const zipFileName = `OmniProfile_${safeName}_${profileId.slice(0, 8)}.zip`;
  const zipFilePath = path.join(BACKUP_TMP_DIR, zipFileName);

  if (fs.existsSync(zipFilePath)) {
    try { fs.unlinkSync(zipFilePath); } catch {}
  }

  return new Promise((resolve, reject) => {
    // Dùng tar.exe tạo file zip (tar.exe -a -cf file.zip *)
    const tarCmd = `tar.exe -a -cf "${zipFilePath}" -C "${profileDir}" .`;
    exec(tarCmd, { windowsHide: true }, (err) => {
      if (!err && fs.existsSync(zipFilePath)) {
        return resolve({ zipFilePath, zipFileName, profile });
      }

      // Fallback sang PowerShell Compress-Archive
      const psCmd = `Compress-Archive -Path "${profileDir}\\*" -DestinationPath "${zipFilePath}" -Force`;
      exec(`powershell -NoProfile -Command "${psCmd}"`, { windowsHide: true }, (psErr) => {
        if (psErr || !fs.existsSync(zipFilePath)) {
          return reject(new Error(`Nén profile thất bại: ${psErr ? psErr.message : 'Unknown'}`));
        }
        resolve({ zipFilePath, zipFileName, profile });
      });
    });
  });
}

/**
 * Khôi phục Profile từ file zip
 */
async function importProfileFromZip(zipBufferOrPath, customName = '') {
  let zipPath = '';
  let needCleanup = false;

  if (typeof zipBufferOrPath === 'string' && fs.existsSync(zipBufferOrPath)) {
    zipPath = zipBufferOrPath;
  } else if (Buffer.isBuffer(zipBufferOrPath)) {
    zipPath = path.join(BACKUP_TMP_DIR, `import_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.zip`);
    fs.writeFileSync(zipPath, zipBufferOrPath);
    needCleanup = true;
  } else {
    throw new Error('Dữ liệu file zip không hợp lệ');
  }

  const newProfileId = crypto.randomUUID();
  const destDir = path.join(config.PROFILES_DIR, newProfileId);
  fs.mkdirSync(destDir, { recursive: true });

  try {
    await new Promise((resolve, reject) => {
      exec(`tar.exe -xf "${zipPath}" -C "${destDir}"`, { windowsHide: true }, (err) => {
        if (!err) return resolve();
        const psCmd = `Expand-Archive -Path "${zipPath}" -DestinationPath "${destDir}" -Force`;
        exec(`powershell -NoProfile -Command "${psCmd}"`, { windowsHide: true }, (psErr) => {
          if (psErr) return reject(new Error(`Giải nén thất bại: ${psErr.message}`));
          resolve();
        });
      });
    });

    // Đọc metadata nếu có
    const metaPath = path.join(destDir, 'omni_profile_meta.json');
    let importedData = {};
    if (fs.existsSync(metaPath)) {
      try {
        importedData = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      } catch {}
    }

    const created = db.createProfile({
      id: newProfileId,
      name: customName || (importedData.name ? `${importedData.name} (Imported)` : `Restored Profile ${newProfileId.slice(0, 8)}`),
      group_id: importedData.group_id || null,
      kernel_path: importedData.kernel_path || config.getDefaultKernelPath(),
      proxy_id: importedData.proxy_id || null,
      user_agent: importedData.user_agent,
      canvas_noise: importedData.canvas_noise,
      webgl_noise: importedData.webgl_noise,
      audio_noise: importedData.audio_noise,
      webrtc_mode: importedData.webrtc_mode,
      cpu_cores: importedData.cpu_cores,
      ram_gb: importedData.ram_gb,
      screen_width: importedData.screen_width,
      screen_height: importedData.screen_height,
      custom_flags: importedData.custom_flags,
      start_url: importedData.start_url,
      notes: importedData.notes,
      fingerprint: importedData.fingerprint ? (typeof importedData.fingerprint === 'string' ? JSON.parse(importedData.fingerprint) : importedData.fingerprint) : null,
      extension_ids: importedData.extension_ids ? (typeof importedData.extension_ids === 'string' ? JSON.parse(importedData.extension_ids) : importedData.extension_ids) : [],
    });

    return created;
  } finally {
    if (needCleanup && fs.existsSync(zipPath)) {
      try { fs.unlinkSync(zipPath); } catch {}
    }
  }
}

module.exports = {
  exportProfileToZip,
  importProfileFromZip,
};
