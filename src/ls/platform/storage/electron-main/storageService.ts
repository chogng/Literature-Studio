import type { BatchSource } from '../../../base/parts/sandbox/common/desktopTypes.js';
import type { StorageService } from '../common/storage.js';
import { appError } from '../../../base/common/errors.js';
import { createConfigStore } from './configStore.js';
import { createHistoryStore } from './historyStore.js';
import { createLibraryStore } from './libraryStore.js';
import { createTranslationCacheStore } from './translationCacheStore.js';

interface StoragePaths {
  historyFile: string;
  configFile: string;
  translationCacheFile: string;
  libraryDbFile: string;
  libraryFilesDir: string;
  ragCacheDir: string;
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
  const libraryStore = createLibraryStore({
    libraryDbFile: paths.libraryDbFile,
    libraryFilesDir: paths.libraryFilesDir,
    ragCacheDir: paths.ragCacheDir,
  });

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

    async upsertLibraryDocumentMetadata(payload) {
      const settings = await configStore.loadSettings();
      if (!settings.knowledgeBase.enabled) {
        throw appError('UNKNOWN_ERROR', {
          message: 'Knowledge base mode is disabled.',
        });
      }
      return libraryStore.upsertLibraryDocumentMetadata(payload);
    },

    async deleteLibraryDocument(payload) {
      const settings = await configStore.loadSettings();
      if (!settings.knowledgeBase.enabled) {
        throw appError('UNKNOWN_ERROR', {
          message: 'Knowledge base mode is disabled.',
        });
      }
      return libraryStore.deleteLibraryDocument(payload);
    },

    async registerLibraryDocument(payload) {
      const settings = await configStore.loadSettings();
      if (!settings.knowledgeBase.enabled) {
        throw appError('UNKNOWN_ERROR', {
          message: 'Knowledge base mode is disabled.',
        });
      }
      return libraryStore.registerLibraryDocument({
        ...payload,
        storageMode: settings.knowledgeBase.libraryStorageMode,
        libraryDirectory: settings.knowledgeBase.libraryDirectory,
      } as typeof payload);
    },

    async getLibraryDocumentStatus(payload) {
      return libraryStore.getLibraryDocumentStatus(payload);
    },

    async listLibraryDocuments(payload) {
      return libraryStore.listLibraryDocuments(payload);
    },

    async reindexLibraryDocument(payload) {
      return libraryStore.reindexLibraryDocument(payload);
    },
  };
}
