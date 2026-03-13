import path from 'node:path';
import { promises as fs } from 'node:fs';
import { app, BrowserWindow } from 'electron';

import { registerDevShortcuts } from './dev-shortcuts.js';
import { registerAppIpc } from './ipc.js';
import { createStorageService } from './services/storage.js';
import { createMainWindow, getMainWindow } from './window.js';

const previousUserDataDir = app.getPath('userData');
const readerRootDir = path.join(app.getPath('home'), '.reader');
const readerConfigDir = path.join(readerRootDir, 'config');
const readerDataDir = path.join(readerRootDir, 'data');
const readerCacheDir = path.join(readerRootDir, 'cache');
const readerSessionDir = path.join(readerCacheDir, 'session');
const readerTempDir = path.join(readerCacheDir, 'temp');
const readerLogsDir = path.join(readerRootDir, 'logs');
const readerConfigFile = path.join(readerConfigDir, 'config.json');
const readerHistoryFile = path.join(readerDataDir, 'history.json');

function isDevMode() {
  return !app.isPackaged || Boolean(process.env.ELECTRON_RENDERER_URL);
}

function resolveDefaultLocale(): 'zh' | 'en' {
  const locale = app.getLocale().toLowerCase();
  return locale.startsWith('zh') ? 'zh' : 'en';
}

function configureAppPaths() {
  app.setPath('userData', readerRootDir);
  app.setPath('cache', readerCacheDir);
  app.setPath('sessionData', readerSessionDir);
  app.setPath('temp', readerTempDir);
  app.setAppLogsPath(readerLogsDir);
}

async function removeFileIfExists(filePath: string) {
  try {
    await fs.rm(filePath, { force: true });
  } catch {
    // ignore cleanup failures to avoid blocking startup
  }
}

async function cleanupLegacyStorageFiles() {
  const uniqueStaleFiles = [
    path.join(previousUserDataDir, 'settings.json'),
    path.join(readerRootDir, 'settings.json'),
    path.join(previousUserDataDir, 'history.json'),
    path.join(readerRootDir, 'history.json'),
  ];
  if (uniqueStaleFiles.length === 0) return;

  await Promise.all(uniqueStaleFiles.map((filePath) => removeFileIfExists(filePath)));
}

configureAppPaths();

app.whenReady().then(async () => {
  await Promise.all([
    fs.mkdir(readerRootDir, { recursive: true }),
    fs.mkdir(readerConfigDir, { recursive: true }),
    fs.mkdir(readerDataDir, { recursive: true }),
    fs.mkdir(readerCacheDir, { recursive: true }),
    fs.mkdir(readerSessionDir, { recursive: true }),
    fs.mkdir(readerTempDir, { recursive: true }),
    fs.mkdir(readerLogsDir, { recursive: true }),
  ]);
  await cleanupLegacyStorageFiles();

  const storage = createStorageService(
    {
      historyFile: readerHistoryFile,
      configFile: readerConfigFile,
    },
    { defaultLocale: resolveDefaultLocale() },
  );

  if (isDevMode()) {
    registerDevShortcuts({ getMainWindow });
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
