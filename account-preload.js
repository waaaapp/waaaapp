const { ipcRenderer } = require('electron');
// Observe only explicitly identified self-profile controls, never chat/contact avatars.
window.addEventListener('DOMContentLoaded', () => {
  let last = '', scheduled = false, lastConnection = '';
  function connectionStatus() {
    const visible = selector => [...document.querySelectorAll(selector)].some(element => element.getClientRects().length);
    let connection = 'checking';
    if (!navigator.onLine) connection = 'offline';
    else if (visible('[data-icon="alert-computer"], [data-icon="alert-phone"], [data-testid="alert-computer"], [data-testid="alert-phone"]')) connection = 'reconnecting';
    else if (visible('[data-ref] canvas, [data-testid="qrcode"], [data-testid="link-device-phone-number-code-screen"]')) connection = 'login';
    else if (visible('#pane-side, [data-testid="chat-list"]')) connection = 'connected';
    if (connection !== lastConnection) { ipcRenderer.send('account-status', connection); lastConnection = connection; }
  }
  window.addEventListener('online', connectionStatus);
  window.addEventListener('offline', connectionStatus);
  setInterval(connectionStatus, 5000);
  async function inspect() {
    scheduled = false;
    connectionStatus();
    const photo = document.querySelector('[data-testid="my-avatar"] img, button[aria-label="Profile"] img, [role="button"][aria-label="Profile"] img');
    if (!photo || !photo.complete || !photo.naturalWidth || photo.src === last) return;
    try {
      const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 96;
      canvas.getContext('2d').drawImage(photo, 0, 0, 96, 96);
      const avatar = canvas.toDataURL('image/png');
      if (avatar.length < 200000) { ipcRenderer.send('account-photo', avatar); last = photo.src; }
    } catch { /* Cross-origin photos are unavailable; the account keeps its fallback. */ }
  }
  new MutationObserver(() => { if (!scheduled) { scheduled = true; setTimeout(inspect, 1500); } }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });
  inspect();
});
