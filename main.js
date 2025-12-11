const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

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

    ipcMain.handle('export-profile', async () => {
        const { filePath } = await dialog.showSaveDialog({
            title: 'Export Profile',
            defaultPath: `waaaapp-profile-${Date.now()}.waaaapp`,
            filters: [{ name: 'waaaapp Profile', extensions: ['waaaapp'] }]
        });

        if (filePath) {
            try {
                const userDataPath = app.getPath('userData');
                const zip = new AdmZip();

                // Include the config/store file at the archive root
                zip.addLocalFile(store.path, '', path.basename(store.path));

                // Include all persisted tab partitions
                const persistDirs = fs.readdirSync(userDataPath).filter(name => name.startsWith('persist_whatsapp_tab_'));
                persistDirs.forEach(dir => {
                    const src = path.join(userDataPath, dir);
                    zip.addLocalFolder(src, dir);
                });

                zip.writeZip(filePath);

                return { success: true, message: 'Profile exported successfully.' };
            } catch (error) {
                console.error('Failed to export profile:', error);
                return { success: false, message: `Failed to export profile: ${error.message}` };
            }
        }
        return { success: false, message: 'Export cancelled.' };
    });

    ipcMain.handle('import-profile', async () => {
        const { filePaths } = await dialog.showOpenDialog({
            title: 'Import Profile',
            properties: ['openFile'],
            filters: [{ name: 'waaaapp Profile', extensions: ['waaaapp'] }]
        });

        if (filePaths && filePaths.length > 0) {
            try {
                const importFilePath = filePaths[0];
                const userDataPath = app.getPath('userData');
                const tempDir = path.join(userDataPath, 'temp_import');

                if (fs.existsSync(tempDir)) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                }
                fs.mkdirSync(tempDir);

                const zip = new AdmZip(importFilePath);
                zip.extractAllTo(tempDir, true);

                const extractedConfigPath = path.join(tempDir, path.basename(store.path));
                if (fs.existsSync(extractedConfigPath)) {
                    fs.copyFileSync(extractedConfigPath, store.path);
                } else {
                    throw new Error('config.json not found in the imported profile.');
                }

                const persistDirs = fs.readdirSync(tempDir).filter(name => name.startsWith('persist_whatsapp_tab_'));
                persistDirs.forEach(dir => {
                    const src = path.join(tempDir, dir);
                    const dest = path.join(userDataPath, dir);
                    if (fs.existsSync(dest)) {
                        fs.rmSync(dest, { recursive: true, force: true });
                    }
                    fs.cpSync(src, dest, { recursive: true, force: true });
                });

                fs.rmSync(tempDir, { recursive: true, force: true });

                app.relaunch();
                app.quit();
                return { success: true, message: 'Profile imported successfully. Restarting application...' };
            } catch (error) {
                console.error('Failed to import profile:', error);
                return { success: false, message: `Failed to import profile: ${error.message}` };
            }
        }
        return { success: false, message: 'Import cancelled.' };
    });

    function createWindow () {
      const win = new BrowserWindow({
        width: 1200,
        height: 800,
        autoHideMenuBar: true,
        frame: true,
        // Use platform-specific icon formats; Windows ignores SVG, macOS prefers ICNS
        icon: path.join(
          __dirname,
          process.platform === 'win32'
            ? 'icon.ico'
            : process.platform === 'darwin'
              ? 'icon.icns'
              : 'icon.png'
        ),
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
