const $ = id => document.getElementById(id);
let current, settingsOpen = false, toastTimer;
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 7000); }
async function call(action, payload) {
  const result = await window.waaaapp.invoke(action, payload);
  if (!result.ok) { toast(result.error); throw new Error(result.error); }
  return result.value;
}
function on(id, action) { $(id).addEventListener('click', () => Promise.resolve().then(action).catch(error => toast(error.message))); }
function photo(button, item) {
  if (item.avatar) { const image = document.createElement('img'); image.src = item.avatar; image.alt = ''; image.className = 'account-photo'; button.append(image); }
  else button.textContent = item.name.slice(0, 2).toUpperCase();
}
function render(state) {
  current = state;
  if (settingsOpen !== state.overlay) {
    settingsOpen = state.overlay; $('settings-panel').hidden = !settingsOpen;
    if (settingsOpen) { renderManagement(); $('settings-close').focus(); }
    else $('passphrase').value = '';
  }
  const active = state.accounts.find(item => item.id === state.activeId), status = state.statuses[state.activeId] || {};
  $('account-name').textContent = active?.name || 'Your workspace';
  $('account-status').textContent = !active ? 'Add an account to get started.' : !navigator.onLine || status.connection === 'offline' ? 'Offline' : status.error ? 'Connection interrupted. Reload to reconnect.' : status.loading ? 'Connecting…' : ({ connected: 'Connected', reconnecting: 'Reconnecting…', login: 'Waiting for login', checking: 'Checking connection…' }[status.connection] || 'Checking connection…');
  $('reload').hidden = !active;
  $('footer-state').textContent = `${state.accounts.length} account${state.accounts.length === 1 ? '' : 's'} · ${Object.keys(state.statuses).length} opened`;
  $('update-status').textContent = state.update.ready ? 'Update ready ↗' : `waaaapp ${state.version}`;
  $('update-detail').textContent = state.update.message;
  $('install').hidden = !state.update.ready;
  $('version').textContent = `Version ${state.version}${state.platform === 'darwin' && !state.signedMac ? ' · Unsigned releases require manual installation unless built with Apple signing.' : ''}`;
  $('accounts').replaceChildren();
  for (const [index, item] of state.accounts.entries()) {
    const button = document.createElement('button'); button.className = 'avatar-button'; button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', String(item.id === state.activeId)); button.setAttribute('aria-label', item.name); button.title = `${item.name}${index < 9 ? ` (⌘/Ctrl ${index + 1})` : ''}`;
    photo(button, item);
    const unread = state.statuses[item.id]?.unread;
    if (unread) { const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = unread > 99 ? '99+' : unread; button.append(badge); button.setAttribute('aria-label', `${item.name}, ${unread} unread`); }
    button.onclick = () => select(item.id).catch(error => toast(error.message));
    button.onkeydown = event => { if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? state.accounts.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + state.accounts.length) % state.accounts.length; $('accounts').children[next].focus(); } };
    $('accounts').append(button);
  }
  if (settingsOpen && !document.activeElement.closest('#manage-accounts')) renderManagement();
}
function renderManagement() {
  $('manage-accounts').replaceChildren();
  for (const item of current.accounts) {
    const row = document.createElement('div'); row.className = 'account-row';
    const avatar = document.createElement('button'); avatar.className = 'photo'; avatar.title = `Choose photo for ${item.name}`; avatar.setAttribute('aria-label', avatar.title); photo(avatar, item); avatar.onclick = () => call('photo', item.id).then(renderManagement).catch(() => {});
    const name = document.createElement('input'); name.value = item.name; name.maxLength = 80; name.setAttribute('aria-label', 'Account name'); name.onchange = () => call('rename', { id: item.id, name: name.value }).catch(() => { name.value = item.name; }); name.onkeydown = event => { if (event.key === 'Enter') name.blur(); };
    const remove = document.createElement('button'); remove.textContent = '×'; remove.className = 'remove'; remove.title = `Remove ${item.name}`; remove.setAttribute('aria-label', remove.title); remove.onclick = () => call('remove', item.id).then(renderManagement).catch(() => {});
    row.append(avatar, name, remove); $('manage-accounts').append(row);
  }
}
async function settings(open) {
  await call('overlay', open); settingsOpen = open; $('settings-panel').hidden = !open;
  if (open) { renderManagement(); $('settings-close').focus(); } else { $('passphrase').value = ''; $('settings').focus(); }
}
async function select(id) { if (settingsOpen) await settings(false); await call('activate', id); }
async function add() { if (settingsOpen) await settings(false); await call('add'); }
for (const id of ['add', 'welcome-add', 'settings-add']) on(id, add);
on('settings', () => settings(!settingsOpen)); on('settings-close', () => settings(false)); on('update-status', () => settings(true));
on('reload', () => call('reload')); on('quit', () => call('quit')); on('check-updates', () => call('updates')); on('install', () => call('install')); on('downloads', () => call('downloads'));
for (const action of ['export', 'import']) on(action, async () => {
  const password = $('passphrase').value;
  if (password.length < 10) return toast('Enter your backup passphrase of at least 10 characters.');
  $('export').disabled = $('import').disabled = true;
  try { const result = await call(action, password); if (result?.message) toast(result.message); }
  finally { $('passphrase').value = ''; $('export').disabled = $('import').disabled = false; }
});
document.addEventListener('keydown', event => { if (event.key === 'Escape' && settingsOpen) settings(false).catch(() => {}); });
async function setupCalls() {
  const result = await call('permissions');
  if (!result.capture) return;
  const results = [];
  for (const kind of ['audio', 'video']) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ [kind]: true });
      stream.getTracks().forEach(track => track.stop());
      results.push(`${kind === 'audio' ? 'Microphone' : 'Camera'} ready`);
    } catch (error) { results.push(`${kind === 'audio' ? 'Microphone' : 'Camera'}: ${error.name === 'NotFoundError' ? 'no device found' : 'blocked or unavailable'}`); }
  }
  const message = results.join('. ') + '. ' + (result.message || 'If blocked, check your operating system privacy settings.');
  $('media-status').textContent = message; toast(message);
}
on('permissions', setupCalls);
on('permission-settings', () => call('permission-settings'));
for (const event of ['online', 'offline']) window.addEventListener(event, () => { if (current) render(current); });
window.waaaapp.subscribe(render);
call('state').then(async state => { render(state); if (!state.permissionsPrompted) await setupCalls(); }).catch(error => toast(error.message));
