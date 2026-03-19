import type {
  AppSettings,
  Article,
  StoredAppSettings,
} from '../../../base/parts/sandbox/common/desktopTypes.js';

export interface StorageService {
  saveFetchedArticles(items: Article[]): Promise<void>;
  loadSettings(): Promise<AppSettings>;
  saveSettings(settings?: Partial<StoredAppSettings>): Promise<AppSettings>;
}