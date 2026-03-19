import path from 'node:path';
import { promises as fs } from 'node:fs';
import { app } from 'electron';

export type ReaderEnvironmentPaths = {
  previousUserDataDir: string;
  rootDir: string;
  configDir: string;
  dataDir: string;
  cacheDir: string;
  sessionDir: string;
  tempDir: string;
  logsDir: string;
  configFile: string;
  historyFile: string;
};

export function resolveEnvironmentMainPaths(): ReaderEnvironmentPaths {
  const previousUserDataDir = app.getPath('userData');
  const rootDir = path.join(app.getPath('home'), '.reader');
  const configDir = path.join(rootDir, 'config');
  const dataDir = path.join(rootDir, 'data');
  const cacheDir = path.join(rootDir, 'cache');
  const sessionDir = path.join(cacheDir, 'session');
  const tempDir = path.join(cacheDir, 'temp');
  const logsDir = path.join(rootDir, 'logs');

  return {
    previousUserDataDir,
    rootDir,
    configDir,
    dataDir,
    cacheDir,
    sessionDir,
    tempDir,
    logsDir,
    configFile: path.join(configDir, 'config.json'),
    historyFile: path.join(dataDir, 'history.json'),
  };
}

export function resolveEnvironmentMainLocale(): 'zh' | 'en' {
  const locale = app.getLocale().toLowerCase();
  return locale.startsWith('zh') ? 'zh' : 'en';
}

export function isDevelopmentEnvironmentMain() {
  return !app.isPackaged || Boolean(process.env.ELECTRON_RENDERER_URL);
}

export function configureDevelopmentEnvironmentMain() {
  if (isDevelopmentEnvironmentMain()) {
    process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
  }
}

export function configureEnvironmentMainPaths(paths: ReaderEnvironmentPaths) {
  app.setPath('userData', paths.rootDir);
  app.setPath('cache', paths.cacheDir);
  app.setPath('sessionData', paths.sessionDir);
  app.setPath('temp', paths.tempDir);
  app.setAppLogsPath(paths.logsDir);
}

async function removeFileIfExists(filePath: string) {
  try {
    await fs.rm(filePath, { force: true });
  } catch {
    // Ignore cleanup failures to avoid blocking startup.
  }
}

async function cleanupLegacyStorageFiles(paths: ReaderEnvironmentPaths) {
  const staleFiles = [
    path.join(paths.previousUserDataDir, 'settings.json'),
    path.join(paths.rootDir, 'settings.json'),
    path.join(paths.previousUserDataDir, 'history.json'),
    path.join(paths.rootDir, 'history.json'),
  ];

  await Promise.all(staleFiles.map((filePath) => removeFileIfExists(filePath)));
}

export async function prepareEnvironmentMain(paths: ReaderEnvironmentPaths) {
  await Promise.all([
    fs.mkdir(paths.rootDir, { recursive: true }),
    fs.mkdir(paths.configDir, { recursive: true }),
    fs.mkdir(paths.dataDir, { recursive: true }),
    fs.mkdir(paths.cacheDir, { recursive: true }),
    fs.mkdir(paths.sessionDir, { recursive: true }),
    fs.mkdir(paths.tempDir, { recursive: true }),
    fs.mkdir(paths.logsDir, { recursive: true }),
  ]);

  await cleanupLegacyStorageFiles(paths);
}
