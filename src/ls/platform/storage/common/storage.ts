import type {
  AppSettings,
  Article,
  StoredAppSettings,
} from '../../../base/parts/sandbox/common/desktopTypes.js';

export interface TranslationCacheRecord {
  key: string;
  value: string;
}

export interface StorageService {
  saveFetchedArticles(items: Article[]): Promise<void>;
  loadTranslationCache(keys: string[]): Promise<Record<string, string>>;
  saveTranslationCache(entries: TranslationCacheRecord[]): Promise<void>;
  loadSettings(): Promise<AppSettings>;
  saveSettings(settings?: Partial<StoredAppSettings>): Promise<AppSettings>;
}
