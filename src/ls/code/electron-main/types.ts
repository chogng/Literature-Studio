import type {
  AppCommand as SharedAppCommand,
  AppCommandPayloadMap as SharedAppCommandPayloadMap,
  AppCommandResultMap as SharedAppCommandResultMap,
  AppErrorCode as SharedAppErrorCode,
  AppErrorPayload as SharedAppErrorPayload,
  AppSettings as SharedAppSettings,
  Article as SharedArticle,
  ArticleDetailsModalLabels as SharedArticleDetailsModalLabels,
  ArticleDetailsModalState as SharedArticleDetailsModalState,
  BatchSource as SharedBatchSource,
  DateRange as SharedDateRange,
  DocxExportResult as SharedDocxExportResult,
  ExportArticlesDocxPayload as SharedExportArticlesDocxPayload,
  FetchArticlePayload as SharedFetchArticlePayload,
  FetchChannel as SharedFetchChannel,
  FetchLatestArticlesPayload as SharedFetchLatestArticlesPayload,
  FetchStatus as SharedFetchStatus,
  NativeModalState as SharedNativeModalState,
  OpenArticleDetailsModalPayload as SharedOpenArticleDetailsModalPayload,
  PdfDownloadResult as SharedPdfDownloadResult,
  PreviewBounds as SharedPreviewBounds,
  PreviewDownloadPdfPayload as SharedPreviewDownloadPdfPayload,
  PreviewReuseMode as SharedPreviewReuseMode,
  PreviewState as SharedPreviewState,
  SaveSettingsPayload as SharedSaveSettingsPayload,
  StoredAppSettings as SharedStoredAppSettings,
  WindowControlAction as SharedWindowControlAction,
  WindowState as SharedWindowState,
} from '../../workbench/common/desktopTypes.js';

export type Article = SharedArticle;
export type BatchSource = SharedBatchSource;
export type DateRange = SharedDateRange;
export type StoredAppSettings = SharedStoredAppSettings;
export type AppSettings = SharedAppSettings;
export type AppErrorCode = SharedAppErrorCode;
export type AppErrorPayload = SharedAppErrorPayload;
export type WindowControlAction = SharedWindowControlAction;
export type WindowState = SharedWindowState;
export type PreviewBounds = SharedPreviewBounds;
export type PreviewState = SharedPreviewState;
export type FetchChannel = SharedFetchChannel;
export type PreviewReuseMode = SharedPreviewReuseMode;
export type FetchStatus = SharedFetchStatus;
export type FetchLatestArticlesPayload = SharedFetchLatestArticlesPayload;
export type PreviewDownloadPdfPayload = SharedPreviewDownloadPdfPayload;
export type ExportArticlesDocxPayload = SharedExportArticlesDocxPayload;
export type ArticleDetailsModalLabels = SharedArticleDetailsModalLabels;
export type OpenArticleDetailsModalPayload = SharedOpenArticleDetailsModalPayload;
export type FetchArticlePayload = SharedFetchArticlePayload;
export type SaveSettingsPayload = SharedSaveSettingsPayload;
export type PdfDownloadResult = SharedPdfDownloadResult;
export type DocxExportResult = SharedDocxExportResult;
export type ArticleDetailsModalState = SharedArticleDetailsModalState;
export type NativeModalState = SharedNativeModalState;
export type AppCommandPayloadMap = SharedAppCommandPayloadMap;
export type AppCommandResultMap = SharedAppCommandResultMap;
export type AppCommand = SharedAppCommand;

export interface StorageService {
  saveFetchedArticles(items: Article[]): Promise<void>;
  loadSettings(): Promise<AppSettings>;
  saveSettings(settings?: Partial<StoredAppSettings>): Promise<AppSettings>;
}
