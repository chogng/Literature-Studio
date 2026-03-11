import path from 'node:path';
import { promises as fs } from 'node:fs';
import { app, BrowserWindow } from 'electron';

import { registerAppIpc } from './ipc.js';
import { createStorageService } from './services/storage.js';
import { createMainWindow, getMainWindow } from './window.js';

function isDevMode() {
  return !app.isPackaged || Boolean(process.env.ELECTRON_RENDERER_URL);
}

function isDevToolsShortcut(input: Electron.Input) {
  if (input.type !== 'keyDown') {
    return false;
  }

  const key = input.key.toLowerCase();
  const isF12 = key === 'f12';
  const isCtrlShiftI = (input.control || input.meta) && input.shift && key === 'i';

  return isF12 || isCtrlShiftI;
}

function toggleDevTools(targetContents?: Electron.WebContents) {
  const fallbackWindow = BrowserWindow.getFocusedWindow() ?? getMainWindow();
  const contents = targetContents ?? fallbackWindow?.webContents;

  if (!contents || contents.isDestroyed()) {
    return;
  }

  if (contents.isDevToolsOpened()) {
    contents.closeDevTools();
  } else {
    contents.openDevTools({ mode: 'detach' });
  }
}

function registerDevToolsInputHandlers() {
  app.on('web-contents-created', (_event, contents) => {
    contents.on('before-input-event', (event, input) => {
      if (!isDevToolsShortcut(input)) {
        return;
      }

      event.preventDefault();
      toggleDevTools(contents);
    });
  });
}

app.whenReady().then(async () => {
  const userDataDir = app.getPath('userData');
  await fs.mkdir(userDataDir, { recursive: true });

  const storage = createStorageService({
    historyFile: path.join(userDataDir, 'history.json'),
    settingsFile: path.join(userDataDir, 'settings.json'),
  });

  if (isDevMode()) {
    registerDevToolsInputHandlers();
  }
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
