const { ipcRenderer } = require('electron');
// Observe only explicitly identified self-profile controls, never chat/contact avatars.
window.addEventListener('DOMContentLoaded', () => {
  let last = '', scheduled = false;
  async function inspect() {
    scheduled = false;
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
