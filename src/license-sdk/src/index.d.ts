export interface LicenseFeature {
  code: string;
  kind: 'boolean' | 'limit';
  value: boolean | number;
}

export interface LicenseStatus {
  allowed: boolean;
  mode: 'online' | 'offline' | 'locked';
  status?: string;
  expires_at?: string | null;
  offline_valid_until?: string;
  features?: LicenseFeature[];
  device_id?: string;
  notice?: string;
  message?: string;
}

export interface LicenseClientOptions {
  productCode: string;
  productId?: string | null;
  serverUrl?: string;
  publicKey?: string | null;
  keyId?: string | null;
  appVersion?: string;
  storageDir?: string | null;
  deviceId?: string | null;
  transport?: typeof fetch;
  clock?: () => number;
}

export interface LicenseOptions {
  product: string;
  serverUrl?: string;
  publicKey?: string | null;
  keyId?: string | null;
  appVersion?: string;
  storageDir?: string | null;
}

export declare class LicenseSecurityError extends Error {
  code: string;
  constructor(code: string, message: string);
}

export declare function getHardwareId(): string;
export declare function keyDigest(key: string): string;
export declare function encryptCache(data: any, hwid: string): Buffer;
export declare function decryptCache(buffer: Buffer, hwid: string): any | null;
export declare function verifyEnvelope(envelope: any, options: any): any;

export declare class SecureLicenseStorage {
  constructor(productCode: string, customDir?: string | null);
  save(options: { envelope: any; keyHash: string; lastWall: number; generation?: number; licenseKey?: string }): void;
  load(): any | null;
  checkpoint(wallTime: number): void;
  clear(): void;
}

export declare class LicenseClient {
  constructor(options: LicenseClientOptions);
  load(): Promise<LicenseStatus>;
  check(): any;
  status(): LicenseStatus;
  checkpoint(): Promise<LicenseStatus>;
  request(action: 'activate' | 'validate' | 'heartbeat' | 'deactivate', key?: string, timeoutMs?: number): Promise<LicenseStatus>;
  sync(timeoutMs?: number): Promise<LicenseStatus>;
  requireFeature(code: string, amount?: number): Promise<boolean | number>;
  startHeartbeatLoop(intervalSeconds?: number): void;
  stopHeartbeat(): void;
}

export declare class License {
  constructor(options: LicenseOptions);
  init(): Promise<LicenseStatus>;
  status(): LicenseStatus;
  activate(licenseKey: string): Promise<LicenseStatus>;
  require(featureCode: string, amount?: number): Promise<boolean | number>;
  deactivate(): Promise<LicenseStatus>;
}
