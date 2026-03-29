import type {
  AppSettings,
  Article,
  IndexDownloadedPdfPayload,
  LibraryDocumentStatusPayload,
  LibraryDocumentSummary,
  LibraryDocumentsResult,
  LibraryRegistrationResult,
  ListLibraryDocumentsPayload,
  ReindexLibraryDocumentPayload,
  ReindexLibraryDocumentResult,
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
  registerLibraryDocument(payload: IndexDownloadedPdfPayload): Promise<LibraryRegistrationResult>;
  getLibraryDocumentStatus(
    payload: LibraryDocumentStatusPayload,
  ): Promise<LibraryDocumentSummary | null>;
  listLibraryDocuments(payload?: ListLibraryDocumentsPayload): Promise<LibraryDocumentsResult>;
  reindexLibraryDocument(
    payload: ReindexLibraryDocumentPayload,
  ): Promise<ReindexLibraryDocumentResult>;
}
