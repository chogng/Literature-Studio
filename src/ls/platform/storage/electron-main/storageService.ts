import type { BatchSource } from '../../../base/parts/sandbox/common/desktopTypes.js';
import type { StorageService } from '../common/storage.js';
import { createConfigStore } from './configStore.js';
import { createHistoryStore } from './historyStore.js';
import { createTranslationCacheStore } from './translationCacheStore.js';

interface StoragePaths {
  historyFile: string;
  configFile: string;
  translationCacheFile: string;
}

interface StorageOptions {
  defaultLocale?: 'zh' | 'en';
  defaultBatchSources?: ReadonlyArray<BatchSource>;
}

export function createStorageService(paths: StoragePaths, options: StorageOptions = {}): StorageService {
  const historyStore = createHistoryStore(paths.historyFile);
  const configStore = createConfigStore(paths.configFile, {
    defaultLocale: options.defaultLocale,
    defaultBatchSources: options.defaultBatchSources,
  });
  const translationCacheStore = createTranslationCacheStore(paths.translationCacheFile);

  return {
    async saveFetchedArticles(items) {
      await historyStore.saveFetchedArticles(items);
    },

    async loadTranslationCache(keys) {
      return translationCacheStore.loadTranslationCache(keys);
    },

    async saveTranslationCache(entries) {
      await translationCacheStore.saveTranslationCache(entries);
    },

    async loadSettings() {
      return configStore.loadSettings();
    },

    async saveSettings(settings = {}) {
      return configStore.saveSettings(settings);
    },
  };
}
