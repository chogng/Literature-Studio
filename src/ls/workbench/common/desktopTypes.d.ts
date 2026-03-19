export type Locale = 'zh' | 'en';

export interface Article {
  title: string;
  articleType: string | null;
  doi: string | null;
  authors: string[];
  abstractText: string | null;
  descriptionText: string | null;
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
  preferredExtractorId?: string | null;
}

export interface FetchBatchSource {
  sourceId?: string;
  pageUrl?: string;
  journalTitle?: string;
  preferredExtractorId?: string | null;
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
  locale: Locale;
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
  | 'BATCH_PAGE_URLS_EMPTY'
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

export type FetchStrategy = 'network-first' | 'preview-first' | 'compare';
export type FetchChannel = 'network' | 'preview';
export type PreviewReuseMode = 'snapshot' | 'live-extract';

export interface FetchStatus {
  sourceId: string;
  pageUrl: string;
  pageNumber: number;
  fetchChannel: FetchChannel;
  fetchDetail?: string | null;
  previewReuseMode?: PreviewReuseMode | null;
  extractorId: string | null;
  paginationStopped?: boolean;
  paginationStopReason?: string | null;
}

export interface FetchLatestArticlesPayload {
  sources?: FetchBatchSource[];
  sameDomainOnly?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  fetchStrategy?: FetchStrategy;
}

export interface PreviewDownloadPdfPayload {
  pageUrl?: string;
  downloadUrl?: string;
  doi?: string;
  articleTitle?: string;
  journalTitle?: string;
  customDownloadDir?: string | null;
}

export interface ExportArticlesDocxPayload {
  articles?: Article[];
  preferredDirectory?: string | null;
  locale?: Locale;
}

export interface ArticleDetailsModalLabels {
  untitled: string;
  unknown: string;
  articleType?: string;
  authors: string;
  abstract: string;
  description?: string;
  publishedAt: string;
  source: string;
  fetchedAt: string;
  close: string;
}

export interface OpenArticleDetailsModalPayload {
  article?: Article;
  labels?: ArticleDetailsModalLabels;
  locale?: Locale;
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
  locale: Locale;
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

export type ElectronInvoke = {
  <TCommand extends AppCommand>(
    command: TCommand,
    args?: AppCommandPayloadMap[TCommand],
  ): Promise<AppCommandResultMap[TCommand]>;
  <T = unknown>(command: string, args?: Record<string, unknown>): Promise<T>;
};

export type WindowStateListener = (state: WindowState) => void;

export interface ElectronWindowControls {
  perform: (action: WindowControlAction) => void;
  getState: () => Promise<WindowState>;
  onStateChange: (listener: WindowStateListener) => () => void;
}

export interface ElectronPreviewApi {
  navigate: (url: string) => Promise<PreviewState>;
  getState: () => Promise<PreviewState>;
  setBounds: (bounds: PreviewBounds | null) => void;
  setVisible: (visible: boolean) => void;
  reload: () => void;
  goBack: () => void;
  goForward: () => void;
  onStateChange: (listener: (state: PreviewState) => void) => () => void;
}

export interface ElectronFetchApi {
  onFetchStatus: (listener: (status: FetchStatus) => void) => () => void;
}

export interface ElectronModalApi {
  getState: () => Promise<NativeModalState | null>;
}

export interface ElectronAPI {
  invoke: ElectronInvoke;
  windowControls?: ElectronWindowControls;
  preview?: ElectronPreviewApi;
  fetch?: ElectronFetchApi;
  modal?: ElectronModalApi;
}
