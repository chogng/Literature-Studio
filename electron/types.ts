export interface Article {
  title: string;
  articleType: string | null;
  doi: string | null;
  authors: string[];
  abstractText: string | null;
  publishedAt: string | null;
  sourceUrl: string;
  fetchedAt: string;
  sourceId?: string | null;
  journalTitle?: string | null;
}

export interface BatchSource {
  id: string;
  url: string;
  journalTitle: string;
}

export interface DateRange {
  start: string | null;
  end: string | null;
}

export interface StoredAppSettings {
  defaultDownloadDir: string | null;
  defaultBatchSources: BatchSource[];
  defaultBatchLimit: number;
  defaultSameDomainOnly: boolean;
  locale: 'zh' | 'en';
}

export interface AppSettings extends StoredAppSettings {
  configPath: string;
}

export type AppErrorCode =
  | 'MAIN_WINDOW_UNAVAILABLE'
  | 'UNKNOWN_COMMAND'
  | 'URL_EMPTY'
  | 'URL_PROTOCOL_UNSUPPORTED'
  | 'DATE_START_INVALID'
  | 'DATE_END_INVALID'
  | 'DATE_RANGE_INVALID'
  | 'HTTP_REQUEST_FAILED'
  | 'BATCH_HOMEPAGE_URLS_EMPTY'
  | 'BATCH_SOURCE_FETCH_FAILED'
  | 'BATCH_NO_MATCH_IN_DATE_RANGE'
  | 'BATCH_NO_VALID_ARTICLES'
  | 'PDF_LINK_NOT_FOUND'
  | 'PDF_DOWNLOAD_FAILED'
  | 'DOCX_EXPORT_NO_ARTICLES'
  | 'DOCX_EXPORT_FAILED'
  | 'PREVIEW_NOT_READY'
  | 'UNKNOWN_ERROR';

export interface AppErrorPayload {
  code: AppErrorCode;
  details?: Record<string, unknown>;
}

export type WindowControlAction =
  | 'minimize'
  | 'maximize'
  | 'unmaximize'
  | 'toggle-maximize'
  | 'close';

export interface WindowState {
  isMaximized: boolean;
}

export interface PreviewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PreviewState {
  url: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  visible: boolean;
}

export interface FetchLatestArticlesPayload {
  sources?: Array<{
    sourceId?: string;
    homepageUrl?: string;
    journalTitle?: string;
  }>;
  sameDomainOnly?: boolean;
  startDate?: string | null;
  endDate?: string | null;
}

export interface PreviewDownloadPdfPayload {
  pageUrl?: string;
  customDownloadDir?: string;
}

export interface ExportArticlesDocxPayload {
  articles?: Article[];
  preferredDirectory?: string | null;
  locale?: 'zh' | 'en';
}

export interface ArticleDetailsModalLabels {
  untitled: string;
  unknown: string;
  articleType?: string;
  authors: string;
  abstract: string;
  publishedAt: string;
  source: string;
  fetchedAt: string;
  close: string;
}

export interface OpenArticleDetailsModalPayload {
  article?: Article;
  labels?: ArticleDetailsModalLabels;
  locale?: 'zh' | 'en';
}

export interface FetchArticlePayload {
  url?: string;
}

export interface SaveSettingsPayload {
  settings?: Partial<StoredAppSettings>;
}

export interface PdfDownloadResult {
  filePath: string;
  sourceUrl: string;
}

export interface DocxExportResult {
  filePath: string;
  articleCount: number;
}

export interface ArticleDetailsModalState {
  kind: 'article-details';
  article: Article;
  labels: ArticleDetailsModalLabels;
  locale: 'zh' | 'en';
}

export type NativeModalState = ArticleDetailsModalState;

export interface AppCommandPayloadMap {
  fetch_article: FetchArticlePayload;
  fetch_latest_articles: FetchLatestArticlesPayload;
  load_settings: undefined;
  save_settings: SaveSettingsPayload;
  pick_download_directory: undefined;
  preview_download_pdf: PreviewDownloadPdfPayload;
  export_articles_docx: ExportArticlesDocxPayload;
  open_article_details_modal: OpenArticleDetailsModalPayload;
}

export interface AppCommandResultMap {
  fetch_article: Article;
  fetch_latest_articles: Article[];
  load_settings: AppSettings;
  save_settings: AppSettings;
  pick_download_directory: string | null;
  preview_download_pdf: PdfDownloadResult;
  export_articles_docx: DocxExportResult | null;
  open_article_details_modal: boolean;
}

export type AppCommand = keyof AppCommandPayloadMap;

export interface StorageService {
  saveFetchedArticles(items: Article[]): Promise<void>;
  loadSettings(): Promise<AppSettings>;
  saveSettings(settings?: Partial<StoredAppSettings>): Promise<AppSettings>;
}
