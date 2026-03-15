/// <reference types="vite/client" />

type DesktopArticle = {
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
};

type DesktopBatchSource = {
  id: string;
  url: string;
  journalTitle: string;
};

type DesktopFetchBatchSource = {
  sourceId: string;
  pageUrl: string;
  journalTitle: string;
};

type DesktopFetchStrategy =
  | 'network-first'
  | 'preview-first'
  | 'compare';

type DesktopPdfDownloadResult = {
  filePath: string;
  sourceUrl: string;
};

type DesktopDocxExportResult = {
  filePath: string;
  articleCount: number;
};

type DesktopArticleDetailsModalLabels = {
  untitled: string;
  unknown: string;
  articleType?: string;
  authors: string;
  abstract: string;
  publishedAt: string;
  source: string;
  fetchedAt: string;
  close: string;
};

type DesktopArticleDetailsModalState = {
  kind: 'article-details';
  article: DesktopArticle;
  labels: DesktopArticleDetailsModalLabels;
  locale: 'zh' | 'en';
};

type DesktopNativeModalState = DesktopArticleDetailsModalState;

type DesktopStoredAppSettings = {
  defaultDownloadDir: string | null;
  defaultBatchSources: DesktopBatchSource[];
  defaultBatchLimit: number;
  defaultSameDomainOnly: boolean;
  locale: 'zh' | 'en';
};

type DesktopAppSettings = DesktopStoredAppSettings & {
  configPath: string;
};

type AppCommandPayloadMap = {
  fetch_article: { url?: string };
  fetch_latest_articles: {
    sources?: DesktopFetchBatchSource[];
    sameDomainOnly?: boolean;
    startDate?: string | null;
    endDate?: string | null;
    fetchStrategy?: DesktopFetchStrategy;
  };
  load_settings: undefined;
  save_settings: { settings?: Partial<DesktopStoredAppSettings> };
  pick_download_directory: undefined;
  preview_download_pdf: {
    pageUrl?: string;
    customDownloadDir?: string | null;
  };
  export_articles_docx: {
    articles?: DesktopArticle[];
    preferredDirectory?: string | null;
    locale?: 'zh' | 'en';
  };
  open_article_details_modal: {
    article?: DesktopArticle;
    labels?: DesktopArticleDetailsModalLabels;
    locale?: 'zh' | 'en';
  };
};

type AppCommandResultMap = {
  fetch_article: DesktopArticle;
  fetch_latest_articles: DesktopArticle[];
  load_settings: DesktopAppSettings;
  save_settings: DesktopAppSettings;
  pick_download_directory: string | null;
  preview_download_pdf: DesktopPdfDownloadResult;
  export_articles_docx: DesktopDocxExportResult | null;
  open_article_details_modal: boolean;
};

type AppCommand = keyof AppCommandPayloadMap;

type WindowControlAction =
  | 'minimize'
  | 'maximize'
  | 'unmaximize'
  | 'toggle-maximize'
  | 'close';

type WindowState = {
  isMaximized: boolean;
};

type WindowStateListener = (state: WindowState) => void;

type DesktopPreviewBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DesktopPreviewState = {
  url: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  visible: boolean;
};

type DesktopFetchChannel = 'network' | 'preview';
type DesktopPreviewReuseMode = 'snapshot' | 'live-extract';

type DesktopFetchStatus = {
  sourceId: string;
  pageUrl: string;
  pageNumber: number;
  fetchChannel: DesktopFetchChannel;
  fetchDetail?: string | null;
  previewReuseMode?: DesktopPreviewReuseMode | null;
  extractorId: string | null;
  paginationStopped?: boolean;
  paginationStopReason?: string | null;
};

type ElectronInvoke = {
  <TCommand extends AppCommand>(
    command: TCommand,
    args?: AppCommandPayloadMap[TCommand],
  ): Promise<AppCommandResultMap[TCommand]>;
  <T = unknown>(command: string, args?: Record<string, unknown>): Promise<T>;
};

interface Window {
  electronAPI?: {
    invoke: ElectronInvoke;
    windowControls?: {
      perform: (action: WindowControlAction) => void;
      getState: () => Promise<WindowState>;
      onStateChange: (listener: WindowStateListener) => () => void;
    };
    preview?: {
      navigate: (url: string) => Promise<DesktopPreviewState>;
      getState: () => Promise<DesktopPreviewState>;
      setBounds: (bounds: DesktopPreviewBounds | null) => void;
      setVisible: (visible: boolean) => void;
      reload: () => void;
      goBack: () => void;
      goForward: () => void;
      onStateChange: (listener: (state: DesktopPreviewState) => void) => () => void;
    };
    fetch?: {
      onFetchStatus: (listener: (status: DesktopFetchStatus) => void) => () => void;
    };
    modal?: {
      getState: () => Promise<DesktopNativeModalState | null>;
    };
  };
}
