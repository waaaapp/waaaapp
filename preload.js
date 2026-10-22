const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('waaaapp', {
  invoke: (action, payload) => ipcRenderer.invoke('workspace', action, payload),
  subscribe: callback => { const listener = (_event, state) => callback(state); ipcRenderer.on('state', listener); return () => ipcRenderer.removeListener('state', listener); }
});
