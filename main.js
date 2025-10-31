const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const { execSync } = require('child_process');

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

    const ZIP_COMMAND = process.platform === 'win32'
        ? 'Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory("$inputPath", "$outputPath", "Optimal", $false)'
        : 'zip -r $outputPath $inputPath';
    const UNZIP_COMMAND = process.platform === 'win32'
        ? 'Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory("$inputPath", "$outputPath", $true)'
        : 'unzip -o $inputPath -d $outputPath';

    ipcMain.handle('export-profile', async () => {
        const { filePath } = await dialog.showSaveDialog({
            title: 'Export Profile',
            defaultPath: `waaaapp-profile-${Date.now()}.waaaapp`,
            filters: [{ name: 'waaaapp Profile', extensions: ['waaaapp'] }]
        });

        if (filePath) {
            try {
                const userDataPath = app.getPath('userData');
                const storePath = path.dirname(store.path);

                const tempDir = path.join(userDataPath, 'temp_export');
                if (fs.existsSync(tempDir)) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                }
                fs.mkdirSync(tempDir);

                fs.copyFileSync(store.path, path.join(tempDir, path.basename(store.path)));
                
                const persistDirs = fs.readdirSync(userDataPath).filter(name => name.startsWith('persist_whatsapp_tab_'));
                persistDirs.forEach(dir => {
                    const src = path.join(userDataPath, dir);
                    const dest = path.join(tempDir, dir);
                    fs.cpSync(src, dest, { recursive: true });
                });

                const inputPath = tempDir;
                const outputPath = filePath;
                
                const command = ZIP_COMMAND
                    .replace('$inputPath', inputPath)
                    .replace('$outputPath', outputPath);
                execSync(command, { stdio: 'pipe' });

                fs.rmSync(tempDir, { recursive: true, force: true });

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
                
                const inputPath = importFilePath;
                const outputPath = tempDir;

                const command = UNZIP_COMMAND
                    .replace('$inputPath', inputPath)
                    .replace('$outputPath', outputPath);
                execSync(command, { stdio: 'pipe' });

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
