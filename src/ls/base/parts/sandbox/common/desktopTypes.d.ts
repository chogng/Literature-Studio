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

export type LlmProviderId = 'glm' | 'kimi' | 'deepseek';

export interface LlmProviderSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface LlmSettings {
  activeProvider: LlmProviderId;
  providers: Record<LlmProviderId, LlmProviderSettings>;
}

export type TranslationProviderId = 'deepl';

export interface TranslationProviderSettings {
  apiKey: string;
  baseUrl: string;
}

export interface TranslationSettings {
  activeProvider: TranslationProviderId;
  providers: Record<TranslationProviderId, TranslationProviderSettings>;
}

export interface FetchBatchSource {
  sourceId?: string;
  pageUrl?: string;
  journalTitle?: string;
  preferredExtractorId?: string | null;
}

export type DateRange = import('../../../common/date.js').DateRange;

export interface StoredAppSettings {
  defaultDownloadDir: string | null;
  defaultBatchSources: BatchSource[];
  defaultBatchLimit: number;
  defaultSameDomainOnly: boolean;
  useMica: boolean;
  locale: Locale;
  llm: LlmSettings;
  translation: TranslationSettings;
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
  | 'LLM_PROVIDER_UNSUPPORTED'
  | 'LLM_API_KEY_MISSING'
  | 'LLM_MODEL_MISSING'
  | 'LLM_BASE_URL_INVALID'
  | 'LLM_CONNECTION_FAILED'
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
  articleType: string;
  authors: string;
  abstract: string;
  description: string;
  publishedAt: string;
  source: string;
  fetchedAt: string;
  controlsAriaLabel: string;
  minimize: string;
  maximize: string;
  restore: string;
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

export interface TestLlmConnectionPayload {
  provider?: LlmProviderId;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface LlmConnectionTestResult {
  provider: LlmProviderId;
  model: string;
  baseUrl: string;
  responsePreview: string;
}

export interface TestTranslationConnectionPayload {
  provider?: TranslationProviderId;
  apiKey?: string;
  baseUrl?: string;
}

export interface TranslationConnectionTestResult {
  provider: TranslationProviderId;
  baseUrl: string;
  responsePreview: string;
}

export interface OpenPathPayload {
  path?: string;
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

export type NativeToastType = 'info' | 'success' | 'error' | 'warning';

export interface NativeToastOptions {
  message: string;
  type?: NativeToastType;
  duration?: number;
}

export interface NativeToastItem {
  id: number;
  message: string;
  type: NativeToastType;
}

export interface NativeToastState {
  items: NativeToastItem[];
}

export interface NativeToastLayout {
  width: number;
  height: number;
}

export interface NativeMenuOption {
  value: string;
  label: string;
  title?: string;
  disabled?: boolean;
}

export interface NativeMenuRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NativeMenuOpenPayload {
  requestId: string;
  triggerRect: NativeMenuRect;
  options: NativeMenuOption[];
  value?: string;
}

export interface NativeMenuState {
  requestId: string;
  triggerRect: NativeMenuRect;
  options: NativeMenuOption[];
  value: string;
  sourceWebContentsId: number;
}

export interface NativeMenuEvent {
  requestId: string;
  type: 'select' | 'close';
  value?: string;
}

export interface AppCommandPayloadMap {
  fetch_article: FetchArticlePayload;
  fetch_latest_articles: FetchLatestArticlesPayload;
  load_settings: undefined;
  save_settings: SaveSettingsPayload;
  test_llm_connection: TestLlmConnectionPayload;
  test_translation_connection: TestTranslationConnectionPayload;
  pick_download_directory: undefined;
  open_path: OpenPathPayload;
  preview_download_pdf: PreviewDownloadPdfPayload;
  export_articles_docx: ExportArticlesDocxPayload;
  open_article_details_modal: OpenArticleDetailsModalPayload;
}

export interface AppCommandResultMap {
  fetch_article: Article;
  fetch_latest_articles: Article[];
  load_settings: AppSettings;
  save_settings: AppSettings;
  test_llm_connection: LlmConnectionTestResult;
  test_translation_connection: TranslationConnectionTestResult;
  pick_download_directory: string | null;
  open_path: boolean;
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
  onStateChange: (listener: (state: NativeModalState | null) => void) => () => void;
}

export interface ElectronToastApi {
  show: (options: NativeToastOptions) => void;
  dismiss: (id: number) => void;
  getState: () => Promise<NativeToastState>;
  onStateChange: (listener: (state: NativeToastState) => void) => () => void;
  reportLayout: (layout: NativeToastLayout) => void;
  setHovering: (hovering: boolean) => void;
}

export interface ElectronMenuApi {
  open: (payload: NativeMenuOpenPayload) => void;
  close: (requestId: string) => void;
  select: (requestId: string, value: string) => void;
  getState: () => Promise<NativeMenuState | null>;
  onStateChange: (listener: (state: NativeMenuState | null) => void) => () => void;
  onEvent: (listener: (event: NativeMenuEvent) => void) => () => void;
}

export interface ElectronAPI {
  invoke: ElectronInvoke;
  windowControls?: ElectronWindowControls;
  preview?: ElectronPreviewApi;
  fetch?: ElectronFetchApi;
  modal?: ElectronModalApi;
  toast?: ElectronToastApi;
  menu?: ElectronMenuApi;
}
