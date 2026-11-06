const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');

function harness() {
  const created = [], windows = [];
  class Contents extends EventEmitter {
    constructor() {
      super(); this.loads = [];
      this.session = { setPermissionCheckHandler() {}, setPermissionRequestHandler() {} };
    }
    getUserAgent() { return 'Electron/test'; }
    setUserAgent() {}
    setWindowOpenHandler() {}
    loadURL(url) { this.loads.push(url); return Promise.resolve(); }
    send() {}
    close() { this.closed = true; }
  }
  class View {
    constructor(options) { this.options = options; this.webContents = new Contents(); created.push(this); }
    setVisible(value) { this.visible = value; }
    setBounds(value) { this.bounds = value; }
  }
  class Window extends EventEmitter {
    constructor() {
      super(); windows.push(this); this.webContents = new Contents();
      this.contentView = { addChildView() {}, removeChildView() {} };
    }
    getContentSize() { return [1320, 860]; }
    loadFile() {}
    isDestroyed() { return false; }
  }
  const context = vm.createContext({
    __dirname: require('node:path').resolve(__dirname, '..'), process,
    require: name => name === 'electron' ? {
      app: { isPackaged: true, requestSingleInstanceLock: () => false, quit() {}, getVersion: () => 'test' },
      WebContentsView: View, BrowserWindow: Window
    } : name === 'electron-updater' ? {} : name.startsWith('./') ? require(`../${name.slice(2)}`) : require(name)
  });
  vm.runInContext(fs.readFileSync(require.resolve('../main.js'), 'utf8'), context);
  const run = code => vm.runInContext(code, context);
  run("workspace = { accounts: [{id:'one'}, {id:'two'}, {id:'three'}], activeId:'two' }; store = {get: () => false, set() {}}; createWindow();");
  windows[0].webContents.emit('did-finish-load');
  return { created, run, windows };
}

test('startup connects every account, preserves selection and keeps hidden accounts unthrottled', () => {
  const { created, run, windows } = harness();
  assert.equal(created.length, 3);
  assert.deepEqual(created.map(view => view.visible), [false, true, false]);
  assert.equal(run('workspace.activeId'), 'two');
  assert.deepEqual(created.map(view => view.options.webPreferences.partition), ['persist:whatsapp_tab_one', 'persist:whatsapp_tab_two', 'persist:whatsapp_tab_three']);
  for (const view of created) {
    assert.equal(view.options.webPreferences.backgroundThrottling, false);
    assert.equal(view.options.webPreferences.sandbox, true);
    assert.deepEqual(view.webContents.loads, ['https://web.whatsapp.com']);
  }
  run("activate('three'); overlay = true; layout();");
  assert.ok(created.every(view => !view.visible && !view.webContents.closed));
  windows[0].webContents.emit('did-finish-load');
  run("overlay = false; activate('one');");
  assert.equal(created.length, 3);
  assert.ok(created.every(view => view.webContents.loads.length === 1));
  assert.deepEqual(created.map(view => view.visible), [true, false, false]);
});

test('new accounts load without recreating or reloading existing sessions', () => {
  const { created, run } = harness();
  run("workspace.accounts.push({id:'four'}, {id:'five'}); loadAccounts(); activate('four');");
  assert.equal(created.length, 5);
  assert.ok(created.every(view => view.webContents.loads.length === 1));
  assert.deepEqual(created.map(view => view.visible), [false, false, false, true, false]);
  run('destroyViews();');
  assert.ok(created.every(view => view.webContents.closed));
  assert.equal(run('views.size'), 0);
});
