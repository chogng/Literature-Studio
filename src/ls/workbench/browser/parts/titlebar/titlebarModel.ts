export type TitlebarAction = 'minimize' | 'toggle-maximize' | 'close';
export type TitlebarFetchChannel = 'network' | 'preview';
export type TitlebarPreviewReuseMode = 'snapshot' | 'live-extract';

export type TitlebarAddressBarSourceOption = {
  id: string;
  label: string;
  url: string;
  journalTitle: string;
};

export type TitlebarLabels = {
  controlsAriaLabel: string;
  settingsLabel: string;
  minimizeLabel: string;
  maximizeLabel: string;
  restoreLabel: string;
  closeLabel: string;
  backLabel: string;
  forwardLabel: string;
  refreshLabel: string;
  exportDocxLabel: string;
  noExportableArticlesLabel: string;
};

export type TitlebarProps = {
  appName?: string;
  labels: TitlebarLabels;
  isWindowMaximized: boolean;
  onWindowControl: (action: TitlebarAction) => void;
  isSidebarOpen?: boolean;
  sidebarToggleLabel?: string;
  onToggleSidebar?: () => void;
  onToggleSettings?: () => void;
  browserUrl?: string;
  canGoBack?: boolean;
  canGoForward?: boolean;
  canExportDocx?: boolean;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  onRefresh?: () => void;
  onExportDocx?: () => void;
  webUrl?: string;
  onWebUrlChange?: (url: string) => void;
  onNavigateWeb?: () => void;
  articleUrlPlaceholder?: string;
  addressBarSourceOptions?: TitlebarAddressBarSourceOption[];
  selectedAddressBarSourceId?: string;
  onSelectAddressBarSource?: (sourceId: string) => void;
  onCycleAddressBarSource?: (direction: 'prev' | 'next') => void;
  addressBarSourcePlaceholder?: string;
  addressBarSourceAriaLabel?: string;
  fetchChannel?: TitlebarFetchChannel | null;
  previewReuseMode?: TitlebarPreviewReuseMode | null;
  fetchSourceText?: string;
  fetchSourceTitle?: string;
  fetchStopText?: string;
  fetchStopTitle?: string;
};

export type TitlebarInputProps = Partial<TitlebarProps>;
