/**
 * CRM Template - Mock Data Provider & LocalStorage State
 * Cung cấp dữ liệu mẫu và cơ sở dữ liệu giả lập (LocalStorage)
 * Giúp giao diện CRM hoạt động độc lập 100% không phụ thuộc backend.
 */

window.CRM_CONFIG = {
  // Đặt true để luôn chạy dữ liệu mẫu (offline/demo), hoặc false để kết nối REST API thực tế
  USE_MOCK_DATA: true,
  API_BASE: 'http://127.0.0.1:51888/api',
};

const DEFAULT_MOCK_GROUPS = [
  { id: 'grp-vip', name: 'Khách Hàng VIP', color: '#10B981', created_at: new Date().toISOString() },
  { id: 'grp-mkt', name: 'Marketing & Ads', color: '#3B82F6', created_at: new Date().toISOString() },
  { id: 'grp-ecom', name: 'E-Commerce Store', color: '#F59E0B', created_at: new Date().toISOString() },
  { id: 'grp-support', name: 'Hỗ Trợ & CSKH', color: '#8B5CF6', created_at: new Date().toISOString() },
];

const DEFAULT_MOCK_PROXIES = [
  { id: 'prx-1', name: 'VN FPT Dedicated IP', type: 'http', host: '103.152.112.45', port: 8080, ip: '103.152.112.45', country: 'VN', status: 'alive' },
  { id: 'prx-2', name: 'US Residential Static', type: 'socks5', host: '172.67.182.10', port: 1080, ip: '172.67.182.10', country: 'US', status: 'alive' },
  { id: 'prx-3', name: 'SG Cloudflare Fast', type: 'http', host: '45.76.12.98', port: 3128, ip: '45.76.12.98', country: 'SG', status: 'alive' },
];

const DEFAULT_MOCK_PROFILES = [
  {
    id: 'crm-001',
    name: 'Hồ Sơ Doanh Nghiệp - VIP 01',
    group_id: 'grp-vip',
    proxy_id: 'prx-1',
    proxy_host: '103.152.112.45',
    proxy_port: 8080,
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    cpu_cores: 8,
    ram_gb: 8,
    screen_width: 1920,
    screen_height: 1080,
    isRunning: true,
    created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    last_run_at: new Date().toISOString(),
  },
  {
    id: 'crm-002',
    name: 'Chiến Dịch Facebook Ads #02',
    group_id: 'grp-mkt',
    proxy_id: 'prx-2',
    proxy_host: '172.67.182.10',
    proxy_port: 1080,
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    cpu_cores: 8,
    ram_gb: 16,
    screen_width: 1920,
    screen_height: 1080,
    isRunning: true,
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    last_run_at: new Date().toISOString(),
  },
  {
    id: 'crm-003',
    name: 'Gian Hàng Shopee Mall Official',
    group_id: 'grp-ecom',
    proxy_id: null,
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    cpu_cores: 8,
    ram_gb: 8,
    screen_width: 1440,
    screen_height: 900,
    isRunning: false,
    created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
    last_run_at: null,
  },
  {
    id: 'crm-004',
    name: 'Tài Khoản TikTok Shop Creator',
    group_id: 'grp-ecom',
    proxy_id: 'prx-3',
    proxy_host: '45.76.12.98',
    proxy_port: 3128,
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    cpu_cores: 6,
    ram_gb: 8,
    screen_width: 1920,
    screen_height: 1080,
    isRunning: false,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    last_run_at: null,
  },
  {
    id: 'crm-005',
    name: 'Đội Ngũ CSKH Miền Bắc',
    group_id: 'grp-support',
    proxy_id: null,
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    cpu_cores: 4,
    ram_gb: 8,
    screen_width: 1366,
    screen_height: 768,
    isRunning: false,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    last_run_at: null,
  },
];

class MockDatabase {
  constructor() {
    this.initStorage();
  }

  initStorage() {
    if (!localStorage.getItem('crm_mock_profiles')) {
      localStorage.setItem('crm_mock_profiles', JSON.stringify(DEFAULT_MOCK_PROFILES));
    }
    if (!localStorage.getItem('crm_mock_groups')) {
      localStorage.setItem('crm_mock_groups', JSON.stringify(DEFAULT_MOCK_GROUPS));
    }
    if (!localStorage.getItem('crm_mock_proxies')) {
      localStorage.setItem('crm_mock_proxies', JSON.stringify(DEFAULT_MOCK_PROXIES));
    }
  }

  getProfiles() {
    try {
      return JSON.parse(localStorage.getItem('crm_mock_profiles')) || [];
    } catch {
      return DEFAULT_MOCK_PROFILES;
    }
  }

  saveProfiles(profiles) {
    localStorage.setItem('crm_mock_profiles', JSON.stringify(profiles));
  }

  getProfile(id) {
    return this.getProfiles().find(p => p.id === id) || null;
  }

  createProfile(data) {
    const profiles = this.getProfiles();
    const newProfile = {
      id: 'crm-' + Math.random().toString(36).substring(2, 9),
      name: data.name || 'Hồ sơ mới',
      group_id: data.group_id || null,
      proxy_id: data.proxy_id || null,
      proxy_host: data.proxy_host || '',
      proxy_port: data.proxy_port || '',
      user_agent: data.user_agent || navigator.userAgent,
      cpu_cores: data.cpu_cores || 8,
      ram_gb: data.ram_gb || 8,
      screen_width: data.screen_width || 1920,
      screen_height: data.screen_height || 1080,
      isRunning: false,
      created_at: new Date().toISOString(),
      last_run_at: null,
    };
    profiles.unshift(newProfile);
    this.saveProfiles(profiles);
    return newProfile;
  }

  updateProfile(id, updates) {
    const profiles = this.getProfiles();
    const idx = profiles.findIndex(p => p.id === id);
    if (idx !== -1) {
      profiles[idx] = { ...profiles[idx], ...updates };
      this.saveProfiles(profiles);
      return profiles[idx];
    }
    return null;
  }

  deleteProfile(id) {
    let profiles = this.getProfiles();
    profiles = profiles.filter(p => p.id !== id);
    this.saveProfiles(profiles);
  }

  toggleRunning(id) {
    const profile = this.getProfile(id);
    if (profile) {
      const nextRunning = !profile.isRunning;
      this.updateProfile(id, { 
        isRunning: nextRunning,
        last_run_at: nextRunning ? new Date().toISOString() : profile.last_run_at
      });
      return nextRunning;
    }
    return false;
  }

  getGroups() {
    try {
      return JSON.parse(localStorage.getItem('crm_mock_groups')) || DEFAULT_MOCK_GROUPS;
    } catch {
      return DEFAULT_MOCK_GROUPS;
    }
  }

  saveGroups(groups) {
    localStorage.setItem('crm_mock_groups', JSON.stringify(groups));
  }

  createGroup(name, color = '#10B981') {
    const groups = this.getGroups();
    const newGroup = {
      id: 'grp-' + Math.random().toString(36).substring(2, 7),
      name,
      color,
      created_at: new Date().toISOString(),
    };
    groups.push(newGroup);
    this.saveGroups(groups);
    return newGroup;
  }

  getProxies() {
    try {
      return JSON.parse(localStorage.getItem('crm_mock_proxies')) || DEFAULT_MOCK_PROXIES;
    } catch {
      return DEFAULT_MOCK_PROXIES;
    }
  }
}

window.MockDb = new MockDatabase();
