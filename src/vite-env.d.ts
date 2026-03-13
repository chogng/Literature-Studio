/// <reference types="vite/client" />

type DesktopArticle = {
  title: string;
  doi: string | null;
  authors: string[];
  abstractText: string | null;
  publishedAt: string | null;
  sourceUrl: string;
  fetchedAt: string;
};

type DesktopPdfDownloadResult = {
  filePath: string;
  sourceUrl: string;
};

type DesktopDocxExportResult = {
  filePath: string;
  articleCount: number;
};

type DesktopStoredAppSettings = {
  defaultDownloadDir: string | null;
  defaultBatchHomepageUrls: string[];
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
    homepageUrls?: string[];
    limit?: number | string;
    sameDomainOnly?: boolean;
    startDate?: string | null;
    endDate?: string | null;
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
};

type AppCommandResultMap = {
  fetch_article: DesktopArticle;
  fetch_latest_articles: DesktopArticle[];
  load_settings: DesktopAppSettings;
  save_settings: DesktopAppSettings;
  pick_download_directory: string | null;
  preview_download_pdf: DesktopPdfDownloadResult;
  export_articles_docx: DesktopDocxExportResult | null;
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
  };
}
