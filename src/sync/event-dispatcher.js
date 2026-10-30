/**
 * Action Synchronizer - Event Dispatcher
 * Dispatches captured mouse, wheel, keyboard, and navigation events to Slave CDP sessions
 */

class EventDispatcher {
  /**
   * Dispatch a single captured event to a specific target session on a slave
   */
  static async dispatchEvent(client, session, eventObj, options = {}) {
    if (!client || !client.ws || client.ws.readyState !== 1 || !session || !session.sessionId) {
      return false;
    }

    const { type, data } = eventObj;
    const sessionId = session.sessionId;

    try {
      if (type === 'mouse') {
        const ratioX = (data.x || 0) / (data.w || session.width || 1920);
        const ratioY = (data.y || 0) / (data.h || session.height || 1080);
        const targetX = Math.round(ratioX * (session.width || 1920));
        const targetY = Math.round(ratioY * (session.height || 1080));

        // Di chuyển chuột trước khi bấm để kích hoạt focus & hover
        await client.send('Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          x: targetX,
          y: targetY,
          modifiers: data.modifiers || 0,
        }, sessionId, 1500).catch(() => {});

        // Dispatch sự kiện chuột chính (mousePressed / mouseReleased)
        await client.send('Input.dispatchMouseEvent', {
          type: data.eventType,
          x: targetX,
          y: targetY,
          button: data.button || 'left',
          buttons: data.eventType === 'mousePressed' ? (data.buttons || 1) : 0,
          clickCount: data.clickCount || 1,
          modifiers: data.modifiers || 0,
        }, sessionId, 1500).catch(() => {});
        return true;
      }

      if (type === 'wheel') {
        const ratioX = (data.x || 0) / (data.w || session.width || 1920);
        const ratioY = (data.y || 0) / (data.h || session.height || 1080);
        const targetX = Math.round(ratioX * (session.width || 1920));
        const targetY = Math.round(ratioY * (session.height || 1080));

        await client.send('Input.dispatchMouseEvent', {
          type: 'mouseWheel',
          x: targetX,
          y: targetY,
          deltaX: data.deltaX || 0,
          deltaY: data.deltaY || 0,
        }, sessionId, 1500).catch(() => {});
        return true;
      }

      if (type === 'key') {
        await client.send('Input.dispatchKeyEvent', {
          type: data.eventType,
          key: data.key,
          code: data.code,
          windowsVirtualKeyCode: data.windowsVirtualKeyCode,
          nativeVirtualKeyCode: data.nativeVirtualKeyCode,
          text: data.text,
          unmodifiedText: data.unmodifiedText,
          modifiers: data.modifiers || 0,
        }, sessionId, 1500).catch(() => {});

        // Kích hoạt char event khi gõ ký tự thông thường hoặc Enter
        if (data.eventType === 'rawKeyDown' && data.text) {
          await client.send('Input.dispatchKeyEvent', {
            type: 'char',
            text: data.text,
            unmodifiedText: data.unmodifiedText,
            key: data.key,
            code: data.code,
          }, sessionId, 1500).catch(() => {});
        }
        return true;
      }

      if (type === 'nav' && data.url) {
        await client.send('Page.navigate', { url: data.url }, sessionId, 3000).catch(() => {});
        return true;
      }
    } catch (err) {
      // Bỏ qua lỗi gửi frame riêng lẻ để không ngắt luồng
      return false;
    }

    return false;
  }
}

module.exports = EventDispatcher;
