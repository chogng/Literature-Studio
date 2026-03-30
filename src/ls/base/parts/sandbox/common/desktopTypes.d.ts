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

export type LibraryStorageMode = 'linked-original' | 'managed-copy';

export type RagProviderId = 'moark';

export interface RagProviderSettings {
  apiKey: string;
  baseUrl: string;
  embeddingModel: string;
  rerankerModel: string;
  embeddingPath: string;
  rerankPath: string;
}

export interface RagSettings {
  enabled: boolean;
  knowledgeBaseModeEnabled?: boolean;
  autoIndexDownloadedPdf: boolean;
  libraryStorageMode: LibraryStorageMode;
  libraryDirectory: string | null;
  maxConcurrentIndexJobs: number;
  activeProvider: RagProviderId;
  providers: Record<RagProviderId, RagProviderSettings>;
  retrievalCandidateCount: number;
  retrievalTopK: number;
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
  pdfFileNameUseSelectionOrder: boolean;
  defaultBatchSources: BatchSource[];
  defaultBatchLimit: number;
  defaultSameDomainOnly: boolean;
  useMica: boolean;
  locale: Locale;
  llm: LlmSettings;
  translation: TranslationSettings;
  rag: RagSettings;
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
  | 'RAG_PROVIDER_UNSUPPORTED'
  | 'RAG_API_KEY_MISSING'
  | 'RAG_BASE_URL_INVALID'
  | 'RAG_EMBEDDING_MODEL_MISSING'
  | 'RAG_RERANKER_MODEL_MISSING'
  | 'RAG_CONNECTION_FAILED'
  | 'RAG_QUERY_EMPTY'
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

export interface PreviewTargetPayload {
  targetId?: string | null;
}

export interface PreviewNavigatePayload extends PreviewTargetPayload {
  url: string;
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
  authors?: string[];
  publishedAt?: string | null;
  sourceId?: string | null;
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

export interface TestRagConnectionPayload {
  provider?: RagProviderId;
  apiKey?: string;
  baseUrl?: string;
  embeddingModel?: string;
  rerankerModel?: string;
  embeddingPath?: string;
  rerankPath?: string;
}

export interface RagConnectionTestResult {
  provider: RagProviderId;
  baseUrl: string;
  embeddingModel: string;
  rerankerModel: string;
  embeddingDimensions: number;
  rerankCount: number;
}

export interface OpenPathPayload {
  path?: string;
}

export interface PdfDownloadResult {
  filePath: string;
  sourceUrl: string;
  libraryRegistration?: LibraryRegistrationResult | null;
}

export interface DocxExportResult {
  filePath: string;
  articleCount: number;
}

export type LibraryIngestStatus = 'registered' | 'queued' | 'indexing' | 'ready' | 'failed';

export type LibraryJobType = 'register' | 'extract' | 'chunk' | 'embed' | 'reindex';

export type LibraryJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export type LibraryDedupeReason =
  | 'new'
  | 'file_path'
  | 'doi'
  | 'file_sha256'
  | 'title_author_year';

export interface IndexDownloadedPdfPayload {
  filePath?: string;
  sourceUrl?: string;
  sourceId?: string | null;
  doi?: string | null;
  articleTitle?: string | null;
  authors?: string[];
  journalTitle?: string | null;
  publishedAt?: string | null;
}

export interface LibraryRegistrationResult {
  documentId: string;
  fileId: string;
  jobId: string;
  dedupeReason: LibraryDedupeReason;
  storageMode: LibraryStorageMode;
  ingestStatus: LibraryIngestStatus;
  filePath: string;
}

export interface LibraryDocumentStatusPayload {
  documentId?: string;
  sourceUrl?: string;
  doi?: string;
  filePath?: string;
}

export interface LibraryDocumentSummary {
  documentId: string;
  title: string | null;
  doi: string | null;
  authors: string[];
  journalTitle: string | null;
  publishedAt: string | null;
  sourceUrl: string | null;
  sourceId: string | null;
  ingestStatus: LibraryIngestStatus;
  fileCount: number;
  latestFilePath: string | null;
  latestDownloadedAt: string | null;
  latestJobType: LibraryJobType | null;
  latestJobStatus: LibraryJobStatus | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListLibraryDocumentsPayload {
  limit?: number;
}

export interface LibraryDocumentsResult {
  items: LibraryDocumentSummary[];
  totalCount: number;
  fileCount: number;
  queuedJobCount: number;
  libraryDbFile: string;
  defaultManagedDirectory: string;
  ragCacheDir: string;
}

export interface ReindexLibraryDocumentPayload {
  documentId?: string;
}

export interface ReindexLibraryDocumentResult {
  jobId: string;
  documentId: string;
  status: LibraryJobStatus;
  jobType: LibraryJobType;
}

export interface RagEvidenceItem {
  rank: number;
  title: string;
  journalTitle: string | null;
  publishedAt: string | null;
  sourceUrl: string;
  score: number | null;
  excerpt: string;
}

export interface RagAnswerArticlesPayload {
  question?: string;
  writingContext?: string | null;
  articles?: Article[];
  llm?: LlmSettings;
  rag?: RagSettings;
}

export interface RagAnswerResult {
  answer: string;
  evidence: RagEvidenceItem[];
  provider: RagProviderId;
  llmProvider: LlmProviderId;
  llmModel: string;
  embeddingModel: string;
  rerankerModel: string;
  rerankApplied: boolean;
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

export type NativeMenuAlign = 'start' | 'center';

export interface NativeMenuOpenPayload {
  requestId: string;
  triggerRect: NativeMenuRect;
  options: NativeMenuOption[];
  value?: string;
  align?: NativeMenuAlign;
}

export interface NativeMenuState {
  requestId: string;
  triggerRect: NativeMenuRect;
  options: NativeMenuOption[];
  value: string;
  align: NativeMenuAlign;
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
  test_rag_connection: TestRagConnectionPayload;
  pick_download_directory: undefined;
  open_path: OpenPathPayload;
  preview_download_pdf: PreviewDownloadPdfPayload;
  index_downloaded_pdf: IndexDownloadedPdfPayload;
  get_library_document_status: LibraryDocumentStatusPayload;
  list_library_documents: ListLibraryDocumentsPayload;
  reindex_library_document: ReindexLibraryDocumentPayload;
  rag_answer_articles: RagAnswerArticlesPayload;
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
  test_rag_connection: RagConnectionTestResult;
  pick_download_directory: string | null;
  open_path: boolean;
  preview_download_pdf: PdfDownloadResult;
  index_downloaded_pdf: LibraryRegistrationResult;
  get_library_document_status: LibraryDocumentSummary | null;
  list_library_documents: LibraryDocumentsResult;
  reindex_library_document: ReindexLibraryDocumentResult;
  rag_answer_articles: RagAnswerResult;
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
  activate: (targetId?: string | null) => void;
  release: (targetId?: string | null) => void;
  navigate: (url: string, targetId?: string | null) => Promise<PreviewState>;
  getState: (targetId?: string | null) => Promise<PreviewState>;
  setBounds: (bounds: PreviewBounds | null) => void;
  setVisible: (visible: boolean) => void;
  reload: (targetId?: string | null) => void;
  goBack: (targetId?: string | null) => void;
  goForward: (targetId?: string | null) => void;
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
