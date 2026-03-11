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

type DesktopAppSettings = {
  defaultDownloadDir: string | null;
  defaultHomepageUrl: string;
  defaultBatchLimit: number;
  defaultSameDomainOnly: boolean;
};

type AppCommandPayloadMap = {
  fetch_article: { url?: string };
  fetch_latest_articles: {
    homepageUrl?: string;
    limit?: number | string;
    sameDomainOnly?: boolean;
    startDate?: string | null;
    endDate?: string | null;
  };
  load_settings: undefined;
  save_settings: { settings?: Partial<DesktopAppSettings> };
  pick_download_directory: undefined;
  preview_download_pdf: {
    pageUrl?: string;
    customDownloadDir?: string | null;
  };
};

type AppCommandResultMap = {
  fetch_article: DesktopArticle;
  fetch_latest_articles: DesktopArticle[];
  load_settings: DesktopAppSettings;
  save_settings: DesktopAppSettings;
  pick_download_directory: string | null;
  preview_download_pdf: DesktopPdfDownloadResult;
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

type DesktopWebviewTag = HTMLElement & {
  reload: () => void;
  canGoBack: () => boolean;
  goBack: () => void;
  canGoForward: () => boolean;
  goForward: () => void;
  setZoomFactor: (factor: number) => void;
  addEventListener: (
    type: 'did-navigate' | 'did-navigate-in-page',
    listener: (event: Event & { url?: string }) => void,
  ) => void;
  removeEventListener: (
    type: 'did-navigate' | 'did-navigate-in-page',
    listener: (event: Event & { url?: string }) => void,
  ) => void;
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
  };
}

// Allow <webview> JSX element in Electron renderer
declare namespace React {
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          httpreferrer?: string;
          useragent?: string;
          disablewebsecurity?: string;
          partition?: string;
          allowpopups?: string;
          webpreferences?: string;
          style?: React.CSSProperties;
          className?: string;
          ref?: React.Ref<DesktopWebviewTag>;
        },
        HTMLElement
      >;
    }
  }
}
