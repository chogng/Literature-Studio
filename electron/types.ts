export interface Article {
  title: string;
  doi: string | null;
  authors: string[];
  abstractText: string | null;
  publishedAt: string | null;
  sourceUrl: string;
  fetchedAt: string;
}

export interface DateRange {
  start: string | null;
  end: string | null;
}

export interface StoredAppSettings {
  defaultDownloadDir: string | null;
  defaultBatchHomepageUrls: string[];
  defaultBatchLimit: number;
  defaultSameDomainOnly: boolean;
  locale: 'zh' | 'en';
}

export interface AppSettings extends StoredAppSettings {
  configPath: string;
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
  homepageUrls?: string[];
  limit?: number | string;
  sameDomainOnly?: boolean;
  startDate?: string | null;
  endDate?: string | null;
}

export interface PreviewDownloadPdfPayload {
  pageUrl?: string;
  customDownloadDir?: string;
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

export interface AppCommandPayloadMap {
  fetch_article: FetchArticlePayload;
  fetch_latest_articles: FetchLatestArticlesPayload;
  load_settings: undefined;
  save_settings: SaveSettingsPayload;
  pick_download_directory: undefined;
  preview_download_pdf: PreviewDownloadPdfPayload;
}

export interface AppCommandResultMap {
  fetch_article: Article;
  fetch_latest_articles: Article[];
  load_settings: AppSettings;
  save_settings: AppSettings;
  pick_download_directory: string | null;
  preview_download_pdf: PdfDownloadResult;
}

export type AppCommand = keyof AppCommandPayloadMap;

export interface StorageService {
  saveFetchedArticles(items: Article[]): Promise<void>;
  loadSettings(): Promise<AppSettings>;
  saveSettings(settings?: Partial<StoredAppSettings>): Promise<AppSettings>;
}
