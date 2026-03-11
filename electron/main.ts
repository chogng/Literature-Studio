import path from 'node:path';
import { promises as fs } from 'node:fs';
import { app, BrowserWindow } from 'electron';

import { registerAppIpc } from './ipc.js';
import { createStorageService } from './services/storage.js';
import { createMainWindow } from './window.js';

function isDevMode() {
  return !app.isPackaged || Boolean(process.env.ELECTRON_RENDERER_URL);
}

app.whenReady().then(async () => {
  const userDataDir = app.getPath('userData');
  await fs.mkdir(userDataDir, { recursive: true });

  const storage = createStorageService({
    historyFile: path.join(userDataDir, 'history.json'),
    settingsFile: path.join(userDataDir, 'settings.json'),
  });

  registerAppIpc(storage);
  createMainWindow();

  if (process.platform === 'darwin') {
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

if (isDevMode()) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
}
