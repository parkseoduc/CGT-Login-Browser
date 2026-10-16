const crypto = require('node:crypto');

// Thư viện các cấu hình phần cứng thực tế (Real-world Fingerprint Hardware Presets)
const OS_PRESETS = {
  windows: {
    platform: 'Win32',
    oscpu: 'Windows NT 10.0; Win64; x64',
    appVersion: '5.0 (Windows NT 10.0; Win64; x64)',
    userAgentTemplate: (v) => `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v} Safari/537.36`,
    clientHintsPlatform: 'Windows',
    clientHintsPlatformVersion: '15.0.0',
  },
  mac: {
    platform: 'MacIntel',
    oscpu: 'Intel Mac OS X 10_15_7',
    appVersion: '5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    userAgentTemplate: (v) => `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v} Safari/537.36`,
    clientHintsPlatform: 'macOS',
    clientHintsPlatformVersion: '14.5.0',
  },
  linux: {
    platform: 'Linux x86_64',
    oscpu: 'Linux x86_64',
    appVersion: '5.0 (X11; Linux x86_64)',
    userAgentTemplate: (v) => `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v} Safari/537.36`,
    clientHintsPlatform: 'Linux',
    clientHintsPlatformVersion: '6.5.0',
  }
};

const WEBGL_RENDERERS = [
  {
    vendor: 'Google Inc. (NVIDIA)',
    renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 (0x00002786) Direct3D11 vs_5_0 ps_5_0, D3D11)',
    unmaskedVendor: 'Google Inc. (NVIDIA)',
    unmaskedRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)'
  },
  {
    vendor: 'Google Inc. (NVIDIA)',
    renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)',
    unmaskedVendor: 'Google Inc. (NVIDIA)',
    unmaskedRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)'
  },
  {
    vendor: 'Google Inc. (NVIDIA)',
    renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 (0x00002206) Direct3D11 vs_5_0 ps_5_0, D3D11)',
    unmaskedVendor: 'Google Inc. (NVIDIA)',
    unmaskedRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)'
  },
  {
    vendor: 'Google Inc. (AMD)',
    renderer: 'ANGLE (AMD, AMD Radeon RX 6700 XT (0x000073DF) Direct3D11 vs_5_0 ps_5_0, D3D11)',
    unmaskedVendor: 'Google Inc. (AMD)',
    unmaskedRenderer: 'ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)'
  },
  {
    vendor: 'Google Inc. (Intel)',
    renderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11)',
    unmaskedVendor: 'Google Inc. (Intel)',
    unmaskedRenderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)'
  },
  {
    vendor: 'Apple',
    renderer: 'Apple M2 Pro',
    unmaskedVendor: 'Apple Inc.',
    unmaskedRenderer: 'Apple M2 Pro'
  }
];

const RESOLUTIONS = [
  { width: 1920, height: 1080, name: '1920 x 1080 (FHD)' },
  { width: 1536, height: 864, name: '1536 x 864 (Laptop standard)' },
  { width: 1440, height: 900, name: '1440 x 900 (MacBook standard)' },
  { width: 1366, height: 768, name: '1366 x 768 (Compact laptop)' },
  { width: 2560, height: 1440, name: '2560 x 1440 (2K QHD)' },
];

const CPU_CORES = [4, 6, 8, 12, 16, 24];
const RAM_SIZES = [4, 8, 16, 32];

/**
 * Sinh bộ Fingerprint hoàn chỉnh và logic cho một Profile
 */
function generateFingerprint(options = {}) {
  const osKey = options.os || 'windows';
  const osPreset = OS_PRESETS[osKey] || OS_PRESETS.windows;

  // Phiên bản Chromium chuẩn
  const chromeVersion = options.chromeVersion || '130.0.6723.117';

  // Chọn ngẫu nhiên hoặc theo options
  const resolution = options.resolution || RESOLUTIONS[Math.floor(Math.random() * RESOLUTIONS.length)];
  const cpu = options.cpu || CPU_CORES[Math.floor(Math.random() * CPU_CORES.length)];
  const memory = options.memory || RAM_SIZES[Math.floor(Math.random() * RAM_SIZES.length)];

  // Chọn WebGL Renderer tương ứng OS
  let webgl = options.webgl;
  if (!webgl) {
    if (osKey === 'mac') {
      webgl = WEBGL_RENDERERS.find(r => r.vendor === 'Apple') || WEBGL_RENDERERS[0];
    } else {
      const pcRenderers = WEBGL_RENDERERS.filter(r => r.vendor !== 'Apple');
      webgl = pcRenderers[Math.floor(Math.random() * pcRenderers.length)];
    }
  }

  // Seed ngẫu nhiên tạo nhiễu Canvas và Audio (duy nhất cho mỗi profile)
  const canvasNoiseSeed = options.canvasNoiseSeed || (Math.random() * 0.00005 + 0.00001);
  const audioNoiseSeed = options.audioNoiseSeed || (Math.random() * 0.0000001 + 0.00000001);

  const userAgent = options.userAgent || osPreset.userAgentTemplate(chromeVersion);

  return {
    os: osKey,
    platform: osPreset.platform,
    oscpu: osPreset.oscpu,
    appVersion: osPreset.appVersion,
    userAgent,
    chromeVersion,
    clientHints: {
      platform: osPreset.clientHintsPlatform,
      platformVersion: osPreset.clientHintsPlatformVersion,
      mobile: false,
      model: '',
    },
    screen: {
      width: resolution.width,
      height: resolution.height,
      colorDepth: 24,
      pixelDepth: 24,
      devicePixelRatio: 1,
    },
    hardwareConcurrency: cpu,
    deviceMemory: memory,
    webgl: {
      vendor: webgl.unmaskedVendor,
      renderer: webgl.unmaskedRenderer,
    },
    canvas: {
      mode: options.canvasMode || 'noise', // 'noise' hoặc 'real'
      noiseSeed: canvasNoiseSeed,
    },
    audio: {
      mode: options.audioMode || 'noise', // 'noise' hoặc 'real'
      noiseSeed: audioNoiseSeed,
    },
    webrtc: {
      mode: options.webrtcMode || 'proxy_match', // 'proxy_match', 'disabled', 'real'
      policy: 'disable_non_proxied_udp',
    },
    languages: options.languages || ['vi-VN', 'vi', 'en-US', 'en'],
    timezone: options.timezone || 'Asia/Ho_Chi_Minh',
    mediaDevices: {
      audioInputs: 1,
      audioOutputs: 1,
      videoInputs: 1,
    },
    doNotTrack: options.doNotTrack || null,
  };
}

/**
 * Tạo mã Javascript tiêm trực tiếp vào mọi Frame/Document qua CDP
 * (Page.addScriptToEvaluateOnNewDocument) trước khi bất kỳ script website nào chạy
 */
function getInjectionScript(fp) {
  const jsonFp = JSON.stringify(fp);

  return `(function() {
    'use strict';
    const FP = ${jsonFp};

    // 1. Che giấu hoàn toàn cờ Automation / navigator.webdriver
    try {
      Object.defineProperty(Navigator.prototype, 'webdriver', {
        get: () => undefined,
        configurable: true,
        enumerable: true
      });
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true,
        enumerable: true
      });
      delete navigator.webdriver;
    } catch (e) {}

    // 2. Navigator Hardware & Platform Spoofing
    try {
      Object.defineProperty(Navigator.prototype, 'platform', { get: () => FP.platform, configurable: true });
      Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', { get: () => FP.hardwareConcurrency, configurable: true });
      Object.defineProperty(Navigator.prototype, 'deviceMemory', { get: () => FP.deviceMemory, configurable: true });
      Object.defineProperty(Navigator.prototype, 'languages', { get: () => Object.freeze([...FP.languages]), configurable: true });
      Object.defineProperty(Navigator.prototype, 'language', { get: () => FP.languages[0] || 'vi-VN', configurable: true });
      
      Object.defineProperty(navigator, 'platform', { get: () => FP.platform, configurable: true });
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => FP.hardwareConcurrency, configurable: true });
      Object.defineProperty(navigator, 'deviceMemory', { get: () => FP.deviceMemory, configurable: true });
      Object.defineProperty(navigator, 'languages', { get: () => Object.freeze([...FP.languages]), configurable: true });
      Object.defineProperty(navigator, 'language', { get: () => FP.languages[0] || 'vi-VN', configurable: true });
      if (FP.appVersion) {
        Object.defineProperty(Navigator.prototype, 'appVersion', { get: () => FP.appVersion, configurable: true });
        Object.defineProperty(navigator, 'appVersion', { get: () => FP.appVersion, configurable: true });
      }
    } catch (e) {}

    // 3. User-Agent Data & Client Hints Spoofing
    try {
      if (navigator.userAgentData) {
        const brands = [
          { brand: 'Chromium', version: FP.chromeVersion.split('.')[0] },
          { brand: 'Not=A?Brand', version: '24' },
          { brand: 'Google Chrome', version: FP.chromeVersion.split('.')[0] }
        ];

        Object.defineProperty(navigator.userAgentData, 'brands', { get: () => Object.freeze(brands), configurable: true });
        Object.defineProperty(navigator.userAgentData, 'platform', { get: () => FP.clientHints.platform, configurable: true });
        Object.defineProperty(navigator.userAgentData, 'mobile', { get: () => false, configurable: true });

        const originalGetHighEntropyValues = navigator.userAgentData.getHighEntropyValues;
        navigator.userAgentData.getHighEntropyValues = function(hints) {
          return originalGetHighEntropyValues.call(this, hints).then(values => {
            const result = { ...values };
            if (hints.includes('platform')) result.platform = FP.clientHints.platform;
            if (hints.includes('platformVersion')) result.platformVersion = FP.clientHints.platformVersion;
            if (hints.includes('architecture')) result.architecture = 'x86';
            if (hints.includes('bitness')) result.bitness = '64';
            if (hints.includes('model')) result.model = '';
            return result;
          });
        };
      }
    } catch (e) {}

    // 4. WebGL Unmasked Vendor & Renderer Spoofing
    try {
      const getParameterHandler = function(target, thisArg, args) {
        const param = args[0];
        // 0x9245: UNMASKED_VENDOR_WEBGL
        if (param === 0x9245) return FP.webgl.vendor;
        // 0x9246: UNMASKED_RENDERER_WEBGL
        if (param === 0x9246) return FP.webgl.renderer;
        // 0x1F00: VENDOR
        if (param === 0x1F00) return 'WebKit';
        // 0x1F01: RENDERER
        if (param === 0x1F01) return 'WebKit WebGL';
        return Reflect.apply(target, thisArg, args);
      };

      if (window.WebGLRenderingContext) {
        WebGLRenderingContext.prototype.getParameter = new Proxy(
          WebGLRenderingContext.prototype.getParameter,
          { apply: getParameterHandler }
        );
      }
      if (window.WebGL2RenderingContext) {
        WebGL2RenderingContext.prototype.getParameter = new Proxy(
          WebGL2RenderingContext.prototype.getParameter,
          { apply: getParameterHandler }
        );
      }
    } catch (e) {}

    // 5. Canvas Micro-Noise Fingerprint Protection
    if (FP.canvas && FP.canvas.mode === 'noise' && FP.canvas.noiseSeed) {
      try {
        const seed = FP.canvas.noiseSeed;

        // Perturb toDataURL
        const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function(...args) {
          const ctx = this.getContext('2d');
          if (ctx && this.width > 0 && this.height > 0) {
            try {
              const imgData = ctx.getImageData(0, 0, Math.min(10, this.width), Math.min(10, this.height));
              for (let i = 0; i < imgData.data.length; i += 4) {
                imgData.data[i] = (imgData.data[i] + Math.floor(seed * 1000000) % 2) & 0xFF;
              }
              ctx.putImageData(imgData, 0, 0);
            } catch (err) {}
          }
          return Reflect.apply(origToDataURL, this, args);
        };

        // Perturb toBlob
        const origToBlob = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
          const ctx = this.getContext('2d');
          if (ctx && this.width > 0 && this.height > 0) {
            try {
              const imgData = ctx.getImageData(0, 0, Math.min(10, this.width), Math.min(10, this.height));
              for (let i = 0; i < imgData.data.length; i += 4) {
                imgData.data[i] = (imgData.data[i] + Math.floor(seed * 1000000) % 2) & 0xFF;
              }
              ctx.putImageData(imgData, 0, 0);
            } catch (err) {}
          }
          return Reflect.apply(origToBlob, this, [callback, ...args]);
        };

        // Perturb getImageData
        const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        CanvasRenderingContext2D.prototype.getImageData = function(...args) {
          const imgData = Reflect.apply(origGetImageData, this, args);
          const shift = Math.floor(seed * 1000000) % 3;
          if (shift > 0) {
            for (let i = 0; i < imgData.data.length; i += 16) {
              imgData.data[i] = (imgData.data[i] ^ shift) & 0xFF;
            }
          }
          return imgData;
        };
      } catch (e) {}
    }

    // 6. AudioContext Fingerprint Micro-Noise
    if (FP.audio && FP.audio.mode === 'noise' && FP.audio.noiseSeed) {
      try {
        const audioSeed = FP.audio.noiseSeed;
        const origGetChannelData = AudioBuffer.prototype.getChannelData;
        AudioBuffer.prototype.getChannelData = function(channel) {
          const data = Reflect.apply(origGetChannelData, this, [channel]);
          for (let i = 0; i < data.length; i += 100) {
            data[i] += (audioSeed * 0.00001);
          }
          return data;
        };
      } catch (e) {}
    }

    // 7. Screen & Window Resolution Consistency
    try {
      Object.defineProperty(screen, 'width', { get: () => FP.screen.width, configurable: true });
      Object.defineProperty(screen, 'height', { get: () => FP.screen.height, configurable: true });
      Object.defineProperty(screen, 'availWidth', { get: () => FP.screen.width, configurable: true });
      Object.defineProperty(screen, 'availHeight', { get: () => FP.screen.height - 40, configurable: true });
      Object.defineProperty(screen, 'colorDepth', { get: () => FP.screen.colorDepth, configurable: true });
      Object.defineProperty(screen, 'pixelDepth', { get: () => FP.screen.pixelDepth, configurable: true });
    } catch (e) {}

    // 8. Chrome Runtime & Plugin Array Mocking (Prevent automation detection)
    try {
      if (!window.chrome) {
        window.chrome = {};
      }
      if (!window.chrome.runtime) {
        window.chrome.runtime = {
          PlatformOs: { MAC: 'mac', WIN: 'win', ANDROID: 'android', CROS: 'cros', LINUX: 'linux', OPENBSD: 'openbsd' },
          PlatformArch: { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64' },
          connect: function() {},
          sendMessage: function() {}
        };
      }
    } catch (e) {}
  })();`;
}

module.exports = {
  OS_PRESETS,
  WEBGL_RENDERERS,
  RESOLUTIONS,
  CPU_CORES,
  RAM_SIZES,
  generateFingerprint,
  getInjectionScript,
};
