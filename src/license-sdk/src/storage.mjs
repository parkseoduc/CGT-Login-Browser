import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { getHardwareId, encryptCache, decryptCache } from './crypto.mjs';

export class SecureLicenseStorage {
  constructor(productCode, customDir = null) {
    this.productCode = productCode;
    this.hwid = getHardwareId();

    if (customDir) {
      this.dirPath = path.resolve(customDir);
    } else {
      const platform = os.platform();
      let baseDir = '';
      if (platform === 'win32') {
        baseDir = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
      } else if (platform === 'darwin') {
        baseDir = path.join(os.homedir(), 'Library', 'Application Support');
      } else {
        baseDir = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
      }
      this.dirPath = path.join(baseDir, 'CGT-License', productCode);
    }

    this.encFile = path.join(this.dirPath, 'license.enc');
    this.legacyFile = path.join(this.dirPath, 'license.json');
  }

  save({ envelope, keyHash, lastWall, generation = 1, licenseKey = '' }) {
    try {
      fs.mkdirSync(this.dirPath, { recursive: true });
      const data = {
        envelope,
        key_hash: keyHash,
        license_key: licenseKey,
        last_wall: lastWall,
        generation,
        hwid: this.hwid
      };
      const encryptedBuffer = encryptCache(data, this.hwid);
      fs.writeFileSync(this.encFile, encryptedBuffer);

      // Xóa file JSON cũ nếu còn tồn tại
      if (fs.existsSync(this.legacyFile)) {
        try {
          fs.unlinkSync(this.legacyFile);
        } catch {}
      }
    } catch (err) {
      console.error(`[@tumy/license] Lỗi ghi cache bản quyền: ${err.message}`);
    }
  }

  load() {
    if (!fs.existsSync(this.encFile)) {
      return null;
    }

    try {
      const encryptedBuffer = fs.readFileSync(this.encFile);
      const decrypted = decryptCache(encryptedBuffer, this.hwid);

      if (!decrypted) {
        // Dữ liệu bị giả mạo hoặc copy từ máy khác -> Tự xóa file
        this.clear();
        return null;
      }

      if (decrypted.hwid !== this.hwid) {
        this.clear();
        return null;
      }

      return decrypted;
    } catch {
      this.clear();
      return null;
    }
  }

  checkpoint(wallTime) {
    const cached = this.load();
    if (cached) {
      cached.last_wall = Math.max(cached.last_wall || 0, wallTime);
      this.save({
        envelope: cached.envelope,
        keyHash: cached.key_hash,
        lastWall: cached.last_wall,
        generation: cached.generation || 1,
        licenseKey: cached.license_key || ''
      });
    }
  }

  clear() {
    try {
      if (fs.existsSync(this.encFile)) {
        fs.unlinkSync(this.encFile);
      }
      if (fs.existsSync(this.legacyFile)) {
        fs.unlinkSync(this.legacyFile);
      }
    } catch {}
  }
}
