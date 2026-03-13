import type { StorageService } from '../types.js';
import { createHistoryStore } from './history.js';
import { createSourceStore } from './source.js';

interface StoragePaths {
  historyFile: string;
  configFile: string;
}

interface StorageOptions {
  defaultLocale?: 'zh' | 'en';
}

export function createStorageService(paths: StoragePaths, options: StorageOptions = {}): StorageService {
  const historyStore = createHistoryStore(paths.historyFile);
  const sourceStore = createSourceStore(paths.configFile, {
    defaultLocale: options.defaultLocale,
  });

  return {
    async saveFetchedArticles(items) {
      await historyStore.saveFetchedArticles(items);
    },

    async loadSettings() {
      return sourceStore.loadSettings();
    },

    async saveSettings(settings = {}) {
      return sourceStore.saveSettings(settings);
    },
  };
}
