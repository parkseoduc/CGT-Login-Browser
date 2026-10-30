import { LicenseClient } from './client.mjs';

/**
 * Lớp giao diện cấp cao của Tumy License cho Node.js & Electron
 *
 * Ví dụ sử dụng:
 * ----------------
 * import { License } from '@tumy/license';
 *
 * const license = new License({
 *   product: 'videomaker',
 *   serverUrl: 'https://lic.cgtdev.space'
 * });
 *
 * await license.init();
 * if (!license.status().allowed) {
 *   await license.activate('VMK-XXXX-XXXX-XXXX');
 * }
 *
 * // Khóa tính năng Pro
 * await license.require('export_4k');
 */
export class License {
  constructor({
    product,
    serverUrl = 'https://lic.cgtdev.space',
    publicKey = null,
    keyId = null,
    appVersion = '1.0.0',
    storageDir = null
  }) {
    this.product = product;
    this.client = new LicenseClient({
      productCode: product,
      serverUrl,
      publicKey,
      keyId,
      appVersion,
      storageDir
    });
  }

  /**
   * Khởi tạo và đọc dữ liệu bản quyền đã lưu
   */
  async init() {
    await this.client.load();
    // Thử đồng bộ online ngầm nếu có mạng
    try {
      await this.client.sync(2500);
    } catch {}
    if (this.client.status().allowed) {
      this.client.startHeartbeatLoop(15);
    }
    return this.client.status();
  }

  /**
   * Trả về trạng thái hiện tại (allowed, status, features, offline_valid_until,...)
   */
  status() {
    return this.client.status();
  }

  /**
   * Kích hoạt License Key trực tuyến
   */
  async activate(licenseKey) {
    const res = await this.client.request('activate', licenseKey);
    if (res.allowed) {
      this.client.startHeartbeatLoop(15);
    }
    return res;
  }

  /**
   * Khóa và bảo vệ tính năng (Pro Feature Protection)
   */
  async require(featureCode, amount = 1) {
    return this.client.requireFeature(featureCode, amount);
  }

  /**
   * Hủy kích hoạt trên máy này
   */
  async deactivate() {
    this.client.stopHeartbeat();
    return this.client.request('deactivate');
  }
}
