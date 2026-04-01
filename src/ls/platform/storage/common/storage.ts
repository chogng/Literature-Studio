import type {
  AppSettings,
  Article,
  DeleteLibraryDocumentPayload,
  IndexDownloadedPdfPayload,
  UpsertLibraryDocumentMetadataPayload,
  LibraryDocumentStatusPayload,
  LibraryDocumentSummary,
  LibraryDocumentsResult,
  LibraryRegistrationResult,
  ListLibraryDocumentsPayload,
  ReindexLibraryDocumentPayload,
  ReindexLibraryDocumentResult,
  StoredAppSettings,
} from 'ls/base/parts/sandbox/common/desktopTypes';

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
  upsertLibraryDocumentMetadata(
    payload: UpsertLibraryDocumentMetadataPayload,
  ): Promise<LibraryDocumentSummary>;
  deleteLibraryDocument(payload: DeleteLibraryDocumentPayload): Promise<boolean>;
  registerLibraryDocument(payload: IndexDownloadedPdfPayload): Promise<LibraryRegistrationResult>;
  getLibraryDocumentStatus(
    payload: LibraryDocumentStatusPayload,
  ): Promise<LibraryDocumentSummary | null>;
  listLibraryDocuments(payload?: ListLibraryDocumentsPayload): Promise<LibraryDocumentsResult>;
  reindexLibraryDocument(
    payload: ReindexLibraryDocumentPayload,
  ): Promise<ReindexLibraryDocumentResult>;
}
