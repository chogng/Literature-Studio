import { app, BrowserWindow, dialog, ipcMain } from 'electron';

import type {
  AppCommand,
  AppCommandPayloadMap,
  AppCommandResultMap,
  FetchArticlePayload,
  FetchLatestArticlesPayload,
  ListHistoryPayload,
  PreviewDownloadPdfPayload,
  SaveSettingsPayload,
  StorageService,
  WindowControlAction,
  WindowState,
} from './types.js';
import { fetchArticle, fetchLatestArticles } from './services/article-fetcher.js';
import { previewDownloadPdf } from './services/pdf.js';
import { getMainWindow } from './window.js';

async function pickDownloadDirectory() {
  const mainWindow = getMainWindow();
  if (!mainWindow) {
    throw new Error('主窗口不可用');
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: '选择默认下载目录',
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  return result.filePaths[0];
}

async function invokeCommand<TCommand extends AppCommand>(
  command: TCommand,
  payload: AppCommandPayloadMap[TCommand],
  storage: StorageService,
): Promise<AppCommandResultMap[TCommand]> {
  switch (command) {
    case 'fetch_article':
      return fetchArticle((payload as FetchArticlePayload)?.url, storage) as Promise<AppCommandResultMap[TCommand]>;
    case 'fetch_latest_articles':
      return fetchLatestArticles(payload as FetchLatestArticlesPayload, storage) as Promise<AppCommandResultMap[TCommand]>;
    case 'list_history':
      return storage.listHistory(Number((payload as ListHistoryPayload)?.limit)) as Promise<AppCommandResultMap[TCommand]>;
    case 'clear_history':
      return storage.clearHistory() as Promise<AppCommandResultMap[TCommand]>;
    case 'load_settings':
      return storage.loadSettings() as Promise<AppCommandResultMap[TCommand]>;
    case 'save_settings':
      return storage.saveSettings((payload as SaveSettingsPayload)?.settings ?? {}) as Promise<AppCommandResultMap[TCommand]>;
    case 'pick_download_directory':
      return pickDownloadDirectory() as Promise<AppCommandResultMap[TCommand]>;
    case 'preview_download_pdf':
      return previewDownloadPdf(payload as PreviewDownloadPdfPayload, app.getPath('downloads')) as Promise<AppCommandResultMap[TCommand]>;
    default:
      throw new Error(`未知命令：${command}`);
  }
}

export function registerAppIpc(storage: StorageService) {
  ipcMain.handle('app:invoke', async (_event, command: AppCommand, payload: AppCommandPayloadMap[AppCommand]) => {
    try {
      return await invokeCommand(command, payload, storage);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(message);
    }
  });

  ipcMain.on('app:window-action', (event, action: WindowControlAction) => {
    const target = BrowserWindow.fromWebContents(event.sender) ?? getMainWindow();
    if (!target || target.isDestroyed()) return;

    switch (action) {
      case 'minimize':
        target.minimize();
        break;
      case 'maximize':
        target.maximize();
        break;
      case 'unmaximize':
        target.unmaximize();
        break;
      case 'toggle-maximize':
        if (target.isMaximized()) {
          target.unmaximize();
        } else {
          target.maximize();
        }
        break;
      case 'close':
        target.close();
        break;
      default:
        break;
    }
  });

  ipcMain.handle('app:get-window-state', (event) => {
    const target = BrowserWindow.fromWebContents(event.sender) ?? getMainWindow();
    const state: WindowState = {
      isMaximized: Boolean(target && !target.isDestroyed() && target.isMaximized()),
    };
    return state;
  });
}
