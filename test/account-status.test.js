const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('account status follows visible login, connection and network signals without reading chats', () => {
  const events = {}, sent = [];
  let visible = '', poll;
  const navigator = { onLine: true };
  vm.runInNewContext(fs.readFileSync(require.resolve('../account-preload.js'), 'utf8'), {
    require: () => ({ ipcRenderer: { send: (...message) => sent.push(message) } }),
    window: { addEventListener: (name, callback) => { events[name] = callback; } },
    navigator,
    document: {
      documentElement: {}, querySelector: () => null,
      querySelectorAll: selector => visible && selector.includes(visible) ? [{ getClientRects: () => [1] }] : []
    },
    MutationObserver: class { observe() {} },
    setTimeout: () => {}, setInterval: callback => { poll = callback; }
  });
  events.DOMContentLoaded();
  assert.equal(sent.at(-1)[1], 'checking');
  visible = '[data-ref] canvas'; poll();
  assert.equal(sent.at(-1)[1], 'login');
  visible = '#pane-side'; poll();
  assert.equal(sent.at(-1)[1], 'connected');
  const count = sent.length; poll(); assert.equal(sent.length, count);
  navigator.onLine = false; events.offline();
  assert.equal(sent.at(-1)[1], 'offline');
  navigator.onLine = true; events.online();
  assert.equal(sent.at(-1)[1], 'connected');
  visible = '[data-icon="alert-computer"]'; poll();
  assert.equal(sent.at(-1)[1], 'reconnecting');
  visible = ''; poll(); assert.equal(sent.at(-1)[1], 'checking');
  assert.ok(sent.every(([channel]) => channel === 'account-status'));
});
