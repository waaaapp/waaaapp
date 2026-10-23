const { app, BrowserWindow, WebContentsView, ipcMain, dialog, shell, nativeImage, Menu, systemPreferences } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const { autoUpdater } = require('electron-updater');
const { account, validateWorkspace, encryptWorkspace, decryptWorkspace, isWhatsApp, externalURL, MAX_ACCOUNTS } = require('./workspace');
if (!app.isPackaged && process.env.WAAAAPP_DATA_DIR) app.setPath('userData', process.env.WAAAAPP_DATA_DIR);
let store, win, workspace, closing = false, confirming = false, overlay = false, busy = false;
let update = { message: 'Updates are checked automatically.', ready: false };
const views = new Map(), statuses = new Map(), callWindows = new Map();
const entryURL = pathToFileURL(path.join(__dirname, 'index.html')).href;
const releasesURL = 'https://github.com/waaaapp/waaaapp/releases/latest';
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
  app.whenReady().then(start).catch(error => { dialog.showErrorBox('Unable to start waaaapp', error.message); app.quit(); });
}
function state() { return { ...workspace, overlay, statuses: Object.fromEntries(statuses), update, version: app.getVersion(), platform: process.platform, permissionsPrompted: store.get('permissionsPrompted', false), signedMac: require('./package.json').signedMac }; }
function emit() { if (win && !win.isDestroyed()) win.webContents.send('state', state()); }
function save() { store.set('workspace', workspace); emit(); }
function layout() {
  if (!win) return;
  const [width, height] = win.getContentSize();
  for (const [id, view] of views) {
    view.setVisible(!overlay && id === workspace.activeId);
    view.setBounds({ x: 0, y: 64, width: Math.max(0, width - 88), height: Math.max(0, height - 96) });
  }
}
function destroyViews() { for (const view of views.values()) { win.contentView.removeChildView(view); view.webContents.close(); } views.clear(); statuses.clear(); }
function openExternal(url) { if (externalURL(url)) shell.openExternal(url).catch(error => { update.message = error.message; emit(); }); }
function activate(id) {
  if (!workspace.accounts.some(item => item.id === id)) throw new Error('Unknown account.');
  overlay = false;
  workspace.activeId = id;
  if (!views.has(id)) {
    const view = new WebContentsView({ webPreferences: { partition: `persist:whatsapp_tab_${id}`, preload: path.join(__dirname, 'account-preload.js'), sandbox: true, nodeIntegration: false, contextIsolation: true } });
    views.set(id, view); win.contentView.addChildView(view);
    const contents = view.webContents;
    callWindows.set(id, new Set());
    contents.setUserAgent(contents.getUserAgent().replace(/\swaaaapp\/\S+/gi, '').replace(/\sElectron\/\S+/g, ''));
    contents.setWindowOpenHandler(({ url }) => {
      if (isWhatsApp(url)) return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true, webPreferences: { sandbox: true, nodeIntegration: false, contextIsolation: true, partition: `persist:whatsapp_tab_${id}` } } };
      openExternal(url); return { action: 'deny' };
    });
    contents.on('did-create-window', child => {
      callWindows.get(id).add(child);
      child.on('closed', () => callWindows.get(id)?.delete(child));
      child.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      for (const event of ['will-navigate', 'will-redirect']) child.webContents.on(event, (e, url) => { if (!isWhatsApp(url)) { e.preventDefault(); openExternal(url); } });
    });
    for (const event of ['will-navigate', 'will-redirect']) contents.on(event, (e, url) => { if (!isWhatsApp(url)) { e.preventDefault(); openExternal(url); } });
    contents.session.setPermissionCheckHandler((wc, permission, origin) => Boolean(wc && isWhatsApp(wc.getURL()) && isWhatsApp(origin) && ['notifications', 'media', 'fullscreen', 'clipboard-sanitized-write'].includes(permission)));
    contents.session.setPermissionRequestHandler(async (wc, permission, callback, details) => {
      if (!wc || !isWhatsApp(wc.getURL()) || !isWhatsApp(details.requestingUrl) || !['notifications', 'media', 'fullscreen', 'clipboard-sanitized-write'].includes(permission)) return callback(false);
      if (permission !== 'media') return callback(true);
      if (store.get('mediaAllowed', false)) return callback(true);
      const result = await dialog.showMessageBox(win, { type: 'question', message: 'Allow microphone or camera access?', detail: 'WhatsApp is requesting media access for this account.', buttons: ['Cancel', 'Allow'], defaultId: 0, cancelId: 0 });
      if (result.response === 1) store.set('mediaAllowed', true);
      callback(result.response === 1);
    });
    contents.on('did-start-loading', () => { statuses.set(id, { ...statuses.get(id), loading: true, error: '', connection: 'checking' }); emit(); });
    contents.on('did-stop-loading', () => { statuses.set(id, { ...statuses.get(id), loading: false }); emit(); });
    contents.on('page-title-updated', (_e, title) => { const match = title.match(/^\((\d+)\)/); statuses.set(id, { ...statuses.get(id), unread: match ? Number(match[1]) : 0 }); emit(); });
    contents.on('did-fail-load', (_e, code, description, _url, isMainFrame) => { if (isMainFrame && code !== -3) { statuses.set(id, { ...statuses.get(id), loading: false, error: description }); emit(); } });
    contents.on('render-process-gone', () => { statuses.set(id, { error: 'This account stopped responding. Reload to reconnect.' }); emit(); });
    contents.loadURL('https://web.whatsapp.com').catch(error => { statuses.set(id, { error: error.message }); emit(); });
  }
  layout(); save();
}
async function confirmClose(event) {
  if (closing) return;
  event.preventDefault();
  if (confirming || busy) return;
  confirming = true;
  const { response } = await dialog.showMessageBox(win, { type: 'question', message: 'Close waaaapp?', detail: 'Your accounts stay linked on this computer. Notifications stop until you reopen the app.', buttons: ['Keep open', 'Close waaaapp'], defaultId: 0, cancelId: 0 });
  confirming = false;
  if (response === 1) { closing = true; app.quit(); }
}
function createWindow() {
  win = new BrowserWindow({ width: 1320, height: 860, minWidth: 800, minHeight: 580, backgroundColor: '#f5f6f2', autoHideMenuBar: true, icon: path.join(__dirname, 'icon.png'), webPreferences: { preload: path.join(__dirname, 'preload.js'), sandbox: true, contextIsolation: true, nodeIntegration: false } });
  win.webContents.session.setPermissionCheckHandler((wc, permission) => wc === win.webContents && permission === 'media' && store.get('mediaAllowed', false));
  win.webContents.session.setPermissionRequestHandler((wc, permission, callback) => callback(wc === win.webContents && permission === 'media' && store.get('mediaAllowed', false)));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => { if (url !== entryURL) event.preventDefault(); });
  win.on('resize', layout);
  win.on('close', confirmClose);
  win.on('closed', () => { win = null; });
  win.webContents.on('did-finish-load', () => { if (workspace.activeId) activate(workspace.activeId); emit(); });
  win.loadFile(path.join(__dirname, 'index.html'));
}
async function backup(action, password) {
  if (busy) throw new Error('Another backup operation is running.');
  busy = true;
  try {
    if (action === 'export') {
      const data = encryptWorkspace(workspace, password);
      const { filePath } = await dialog.showSaveDialog(win, { title: 'Save encrypted workspace', defaultPath: `waaaapp-${new Date().toISOString().slice(0, 10)}.waaaapp`, filters: [{ name: 'waaaapp workspace', extensions: ['waaaapp'] }] });
      if (!filePath) return { cancelled: true };
      await fs.writeFile(filePath, data, { mode: 0o600 });
      return { message: 'Workspace saved. On another computer, import it and link each account with your phone.' };
    }
    const { canceled, filePaths } = await dialog.showOpenDialog(win, { title: 'Restore encrypted workspace', properties: ['openFile'], filters: [{ name: 'waaaapp workspace', extensions: ['waaaapp'] }] });
    if (canceled) return { cancelled: true };
    if ((await fs.stat(filePaths[0])).size > 15000000) throw new Error('Backup exceeds 15 MB.');
    const imported = decryptWorkspace(await fs.readFile(filePaths[0], 'utf8'), password);
    if (workspace.accounts.length + imported.accounts.length > MAX_ACCOUNTS) throw new Error(`Import would exceed ${MAX_ACCOUNTS} accounts. Remove unused accounts first.`);
    const { response } = await dialog.showMessageBox(win, { type: 'question', message: `Import ${imported.accounts.length} accounts?`, detail: 'Your existing accounts are kept. Imported accounts get new, separate sessions and need QR linking.', buttons: ['Cancel', 'Import accounts'], defaultId: 0, cancelId: 0 });
    if (response !== 1) return { cancelled: true };
    const accounts = imported.accounts.map(item => ({ ...item, id: account().id }));
    workspace.accounts.push(...accounts);
    if (accounts.length) activate(accounts[0].id); else save();
    return { message: 'Workspace imported. Link the restored accounts using WhatsApp on your phone.' };
  } finally { busy = false; }
}
async function handle(action, payload) {
  switch (action) {
    case 'state': return state();
    case 'permissions': {
      const { response } = await dialog.showMessageBox(win, { type: 'question', message: 'Set up WhatsApp calls?', detail: 'Allow microphone and camera access so you can answer voice and video calls. Devices are tested briefly, then released. You can change this later in workspace settings.', buttons: ['Not now', 'Set up calls'], defaultId: 1, cancelId: 0 });
      store.set('permissionsPrompted', true);
      if (response !== 1) { emit(); return { capture: false }; }
      store.set('mediaAllowed', true);
      if (process.platform === 'darwin') {
        const microphone = await systemPreferences.askForMediaAccess('microphone');
        const camera = await systemPreferences.askForMediaAccess('camera');
        emit();
        return { capture: true, message: `Microphone: ${microphone ? 'allowed' : 'blocked'}. Camera: ${camera ? 'allowed' : 'blocked'}. If blocked, allow waaaapp in System Settings > Privacy & Security, then restart.` };
      }
      emit(); return { capture: true };
    }
    case 'permission-settings': {
      if (process.platform === 'darwin') await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone');
      else if (process.platform === 'win32') await shell.openExternal('ms-settings:privacy-microphone');
      return;
    }
    case 'overlay': overlay = Boolean(payload); layout(); emit(); return;
    case 'add': { if (workspace.accounts.length >= MAX_ACCOUNTS) throw new Error('You can have up to 50 accounts.'); const item = account(`Account ${workspace.accounts.length + 1}`); workspace.accounts.push(item); activate(item.id); return; }
    case 'activate': activate(payload); return;
    case 'rename': { const item = workspace.accounts.find(item => item.id === payload.id); if (!item || typeof payload.name !== 'string' || !payload.name.trim() || payload.name.length > 80) throw new Error('Enter a name of 1 to 80 characters.'); item.name = payload.name.trim(); save(); return; }
    case 'photo': {
      const item = workspace.accounts.find(item => item.id === payload); if (!item) throw new Error('Unknown account.');
      const { canceled, filePaths } = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Photo', extensions: ['png', 'jpg', 'jpeg', 'webp'] }] });
      if (canceled) return;
      if ((await fs.stat(filePaths[0])).size > 10000000) throw new Error('Choose a photo smaller than 10 MB.');
      const image = nativeImage.createFromPath(filePaths[0]); if (image.isEmpty()) throw new Error('Unable to read this photo.');
      item.avatar = image.resize({ width: 96, height: 96 }).toDataURL(); save(); return;
    }
    case 'remove': {
      const item = workspace.accounts.find(item => item.id === payload); if (!item) throw new Error('Unknown account.');
      const { response } = await dialog.showMessageBox(win, { type: 'warning', message: `Remove ${item.name}?`, detail: 'This removes its local session. Messages remain in WhatsApp. You can also unlink this device from your phone.', buttons: ['Cancel', 'Remove account'], defaultId: 0, cancelId: 0 });
      if (response !== 1) return;
      for (const child of callWindows.get(item.id) || []) child.destroy();
      callWindows.delete(item.id);
      const view = views.get(item.id);
      const ses = view ? view.webContents.session : require('electron').session.fromPartition(`persist:whatsapp_tab_${item.id}`);
      if (view) { win.contentView.removeChildView(view); view.webContents.close(); views.delete(item.id); }
      await ses.clearStorageData(); await ses.clearCache();
      workspace.accounts = workspace.accounts.filter(value => value.id !== item.id); statuses.delete(item.id);
      if (workspace.activeId === item.id) workspace.activeId = workspace.accounts[0]?.id || null;
      if (workspace.activeId) activate(workspace.activeId); else { layout(); save(); } return;
    }
    case 'reload': views.get(workspace.activeId)?.webContents.reload(); return;
    case 'export': case 'import': return backup(action, payload);
    case 'updates': return checkUpdates();
    case 'install': {
      if (!update.ready) return;
      const { response } = await dialog.showMessageBox(win, { message: 'Restart to install the update?', buttons: ['Later', 'Restart now'], defaultId: 0, cancelId: 0 });
      if (response === 1) { closing = true; autoUpdater.quitAndInstall(); } return;
    }
    case 'downloads': openExternal(releasesURL); return;
    case 'quit': win.close(); return;
    default: throw new Error('Unsupported action.');
  }
}
let checking = false;
async function checkUpdates() {
  if (!app.isPackaged) { update.message = 'Automatic updates are available in installed release builds.'; emit(); return; }
  if (checking) return;
  checking = true;
  try {
    if (process.platform === 'darwin' && !require('./package.json').signedMac) {
      const response = await fetch('https://api.github.com/repos/waaaapp/waaaapp/releases/latest', { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('Cannot reach the release service. Try again later.');
      const release = await response.json();
      update.message = release.tag_name === `v${app.getVersion()}` ? 'You have the latest version.' : `Release ${release.tag_name} is available. Open Downloads to install it.`;
      emit(); return;
    }
    if (process.platform === 'linux' && !process.env.APPIMAGE) { update.message = 'Use the AppImage release for automatic updates.'; emit(); return; }
    await autoUpdater.checkForUpdates();
  } catch (error) { update.message = `Update check failed: ${error.message}`; emit(); }
  finally { checking = false; }
}
async function start() {
  const { default: Store } = await import('electron-store'); store = new Store();
  const saved = store.get('workspace');
  if (saved) workspace = validateWorkspace(saved);
  else {
    const old = store.get('tabs', []).filter(item => !item.isHelp).map(item => ({ id: item.id, name: item.name, avatar: '' }));
    workspace = validateWorkspace({ format: 'waaaapp-workspace', version: 1, accounts: old.length ? old : [account('Personal')], activeId: store.get('activeTabId') });
  }
  ipcMain.handle('workspace', async (event, action, payload) => {
    if (!win || event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame || event.senderFrame.url !== entryURL) throw new Error('Untrusted request.');
    try { return { ok: true, value: await handle(action, payload) }; }
    catch (error) { return { ok: false, error: error.message }; }
  });
  ipcMain.on('account-status', (event, connection) => {
    const match = [...views].find(([, view]) => view.webContents === event.sender);
    if (!match || event.senderFrame !== event.sender.mainFrame || !isWhatsApp(event.senderFrame.url)) return;
    if (!['checking', 'offline', 'reconnecting', 'login', 'connected'].includes(connection)) return;
    statuses.set(match[0], { ...statuses.get(match[0]), connection });
    emit();
  });
  ipcMain.on('account-photo', (event, avatar) => {
    const match = [...views].find(([, view]) => view.webContents === event.sender);
    if (!match || event.senderFrame !== event.sender.mainFrame || !isWhatsApp(event.senderFrame.url)) return;
    const item = workspace.accounts.find(item => item.id === match[0]);
    try { validateWorkspace({ ...workspace, accounts: [{ ...item, avatar }] }); } catch { return; }
    if (item.avatar !== avatar) { item.avatar = avatar; save(); }
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ label: 'waaaapp', submenu: [{ role: 'about' }, { label: 'Check for updates', click: checkUpdates }, { type: 'separator' }, { label: 'Quit waaaapp', accelerator: 'Cmd+Q', click: () => win.close() }] }] : []),
    { label: 'Accounts', submenu: [
      { label: 'Add account', accelerator: 'CmdOrCtrl+T', click: () => handle('add').catch(error => dialog.showErrorBox('Cannot add account', error.message)) },
      { label: 'Workspace settings', accelerator: 'CmdOrCtrl+,', click: () => handle('overlay', !overlay) },
      { type: 'separator' },
      ...Array.from({ length: 9 }, (_, index) => ({ label: `Account ${index + 1}`, accelerator: `CmdOrCtrl+${index + 1}`, click: () => { if (workspace.accounts[index]) activate(workspace.accounts[index].id); } }))
    ] },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'togglefullscreen' }, { label: 'Reload account', accelerator: 'CmdOrCtrl+R', click: () => views.get(workspace.activeId)?.webContents.reload() }] }
  ]));
  autoUpdater.autoDownload = true; autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => { update.message = 'Checking for updates…'; emit(); });
  autoUpdater.on('update-not-available', () => { update.message = 'You have the latest version.'; emit(); });
  autoUpdater.on('update-available', () => { update.message = 'Downloading an update in the background…'; emit(); });
  autoUpdater.on('update-downloaded', () => { update = { message: 'Update ready. Restart when you are ready.', ready: true }; emit(); });
  autoUpdater.on('error', error => { update.message = `Update unavailable: ${error.message}`; emit(); });
  createWindow();
  setTimeout(checkUpdates, 15000).unref(); setInterval(checkUpdates, 4 * 60 * 60 * 1000).unref();
  app.on('before-quit', event => { if (!closing && win) { event.preventDefault(); win.close(); } else if (win) destroyViews(); });
  app.on('window-all-closed', () => app.quit());
}
