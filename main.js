const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let store;

async function initializeApp() {
    const { default: Store } = await import('electron-store');
    store = new Store();

    ipcMain.handle('get-store-value', (event, key) => {
        return store.get(key);
    });

    ipcMain.handle('set-store-value', (event, key, value) => {
        store.set(key, value);
    });

    ipcMain.on('exit-app', () => {
        app.quit();
    });

    function createWindow () {
      const win = new BrowserWindow({
        width: 1200,
        height: 800,
        autoHideMenuBar: true,
        frame: true,
        icon: path.join(__dirname, 'icon.svg'),
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          webviewTag: true,
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      win.loadFile('index.html');
    }

    app.whenReady().then(() => {
      createWindow();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
}

initializeApp();
