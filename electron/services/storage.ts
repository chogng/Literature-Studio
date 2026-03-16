import type { StorageService } from '../types.js';
import { createConfigStore } from './config.js';
import { createHistoryStore } from './history.js';

interface StoragePaths {
  historyFile: string;
  configFile: string;
}

interface StorageOptions {
  defaultLocale?: 'zh' | 'en';
}

export function createStorageService(paths: StoragePaths, options: StorageOptions = {}): StorageService {
  const historyStore = createHistoryStore(paths.historyFile);
  const configStore = createConfigStore(paths.configFile, {
    defaultLocale: options.defaultLocale,
  });

  return {
    async saveFetchedArticles(items) {
      await historyStore.saveFetchedArticles(items);
    },

    async loadSettings() {
      return configStore.loadSettings();
    },

    async saveSettings(settings = {}) {
      return configStore.saveSettings(settings);
    },
  };
}
