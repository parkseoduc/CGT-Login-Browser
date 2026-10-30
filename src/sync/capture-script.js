/**
 * Action Synchronizer - Client-side DOM Event Capture Script
 * Injected into Master profile via Page.addScriptToEvaluateOnNewDocument & Runtime.evaluate
 */

function getCaptureScript() {
  return `
    (() => {
      if (window.__omniSyncInstalled) return;
      window.__omniSyncInstalled = true;

      function sendSync(type, data) {
        try {
          if (typeof window.__omniSyncEvent === 'function') {
            window.__omniSyncEvent(JSON.stringify({ type, data, ts: Date.now() }));
          }
        } catch (e) {}
      }

      // 1. Mouse Click & Mouse Up
      window.addEventListener('mousedown', (e) => {
        sendSync('mouse', {
          eventType: 'mousePressed',
          x: e.clientX,
          y: e.clientY,
          button: e.button === 0 ? 'left' : (e.button === 1 ? 'middle' : 'right'),
          buttons: e.buttons,
          clickCount: e.detail || 1,
          modifiers: (e.altKey ? 1 : 0) | (e.ctrlKey ? 2 : 0) | (e.metaKey ? 4 : 0) | (e.shiftKey ? 8 : 0),
          w: window.innerWidth,
          h: window.innerHeight,
        });
      }, true);

      window.addEventListener('mouseup', (e) => {
        sendSync('mouse', {
          eventType: 'mouseReleased',
          x: e.clientX,
          y: e.clientY,
          button: e.button === 0 ? 'left' : (e.button === 1 ? 'middle' : 'right'),
          buttons: e.buttons,
          clickCount: e.detail || 1,
          modifiers: (e.altKey ? 1 : 0) | (e.ctrlKey ? 2 : 0) | (e.metaKey ? 4 : 0) | (e.shiftKey ? 8 : 0),
          w: window.innerWidth,
          h: window.innerHeight,
        });
      }, true);

      // 2. Scroll Wheel
      window.addEventListener('wheel', (e) => {
        sendSync('wheel', {
          eventType: 'mouseWheel',
          x: e.clientX,
          y: e.clientY,
          deltaX: e.deltaX,
          deltaY: e.deltaY,
          w: window.innerWidth,
          h: window.innerHeight,
        });
      }, { passive: true, capture: true });

      // 3. Keyboard Keydown / Keyup
      window.addEventListener('keydown', (e) => {
        let text = undefined;
        if (e.key === 'Enter') {
          text = '\\r';
        } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          text = e.key;
        }
        sendSync('key', {
          eventType: 'rawKeyDown',
          key: e.key,
          code: e.code,
          windowsVirtualKeyCode: e.keyCode,
          nativeVirtualKeyCode: e.keyCode,
          text: text,
          unmodifiedText: text,
          modifiers: (e.altKey ? 1 : 0) | (e.ctrlKey ? 2 : 0) | (e.metaKey ? 4 : 0) | (e.shiftKey ? 8 : 0),
        });
      }, true);

      window.addEventListener('keyup', (e) => {
        sendSync('key', {
          eventType: 'keyUp',
          key: e.key,
          code: e.code,
          windowsVirtualKeyCode: e.keyCode,
          nativeVirtualKeyCode: e.keyCode,
          modifiers: (e.altKey ? 1 : 0) | (e.ctrlKey ? 2 : 0) | (e.metaKey ? 4 : 0) | (e.shiftKey ? 8 : 0),
        });
      }, true);

      // 4. URL / Hash change detection for SPAs
      let curHref = window.location.href;
      setInterval(() => {
        if (window.location.href !== curHref) {
          curHref = window.location.href;
          sendSync('nav', { url: curHref });
        }
      }, 500);
    })();
  `;
}

module.exports = {
  getCaptureScript,
};
