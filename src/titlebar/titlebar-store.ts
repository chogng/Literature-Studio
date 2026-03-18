import type {
  TitlebarAction,
  TitlebarAddressBarSourceOption,
  TitlebarFetchChannel,
  TitlebarLabels,
  TitlebarPreviewReuseMode,
  TitlebarProps,
} from './titlebar';

type TitlebarSourceCycleDirection = 'prev' | 'next';

export type TitlebarViewState = {
  appName: string;
  labels: TitlebarLabels;
  isWindowMaximized: boolean;
  isSidebarOpen: boolean;
  sidebarToggleLabel?: string;
  browserUrl: string;
  canGoBack: boolean;
  canGoForward: boolean;
  canExportDocx: boolean;
  webUrl: string;
  articleUrlPlaceholder: string;
  addressBarSourceOptions: TitlebarAddressBarSourceOption[];
  selectedAddressBarSourceId: string;
  addressBarSourcePlaceholder: string;
  addressBarSourceAriaLabel: string;
  fetchChannel: TitlebarFetchChannel | null;
  previewReuseMode: TitlebarPreviewReuseMode | null;
  fetchSourceText: string;
  fetchSourceTitle: string;
  fetchStopText: string;
  fetchStopTitle: string;
};

export type TitlebarActionHandlers = {
  onWindowControl: (action: TitlebarAction) => void;
  onToggleSidebar?: () => void;
  onToggleSettings?: () => void;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  onRefresh?: () => void;
  onExportDocx?: () => void;
  onWebUrlChange?: (url: string) => void;
  onNavigateWeb?: () => void;
  onSelectAddressBarSource?: (sourceId: string) => void;
  onCycleAddressBarSource?: (direction: TitlebarSourceCycleDirection) => void;
};

export type TitlebarStoreSnapshot = {
  state: TitlebarViewState;
  actions: TitlebarActionHandlers;
};

type TitlebarStoreListener = () => void;

const defaultLabels: TitlebarLabels = {
  controlsAriaLabel: '',
  settingsLabel: '',
  minimizeLabel: '',
  maximizeLabel: '',
  restoreLabel: '',
  closeLabel: '',
  backLabel: '',
  forwardLabel: '',
  refreshLabel: '',
  exportDocxLabel: '',
  noExportableArticlesLabel: '',
};

const defaultState: TitlebarViewState = {
  appName: 'Journal Reader',
  labels: defaultLabels,
  isWindowMaximized: false,
  isSidebarOpen: true,
  sidebarToggleLabel: '',
  browserUrl: '',
  canGoBack: false,
  canGoForward: false,
  canExportDocx: false,
  webUrl: '',
  articleUrlPlaceholder: '',
  addressBarSourceOptions: [],
  selectedAddressBarSourceId: '',
  addressBarSourcePlaceholder: '',
  addressBarSourceAriaLabel: '',
  fetchChannel: null,
  previewReuseMode: null,
  fetchSourceText: '',
  fetchSourceTitle: '',
  fetchStopText: '',
  fetchStopTitle: '',
};

const defaultActions: TitlebarActionHandlers = {
  onWindowControl: () => undefined,
};

let currentSnapshot: TitlebarStoreSnapshot = {
  state: defaultState,
  actions: defaultActions,
};

const listeners = new Set<TitlebarStoreListener>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeTitlebarStore(listener: TitlebarStoreListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getTitlebarSnapshot() {
  return currentSnapshot;
}

export function setTitlebarState(state: TitlebarViewState) {
  currentSnapshot = {
    ...currentSnapshot,
    state,
  };
  emitChange();
}

export function setTitlebarActions(actions: TitlebarActionHandlers) {
  currentSnapshot = {
    ...currentSnapshot,
    actions,
  };
  emitChange();
}

export function resetTitlebarStore() {
  currentSnapshot = {
    state: defaultState,
    actions: defaultActions,
  };
  emitChange();
}

export function toTitlebarProps(snapshot: TitlebarStoreSnapshot): TitlebarProps {
  const { state, actions } = snapshot;

  return {
    appName: state.appName,
    labels: state.labels,
    isWindowMaximized: state.isWindowMaximized,
    onWindowControl: actions.onWindowControl,
    isSidebarOpen: state.isSidebarOpen,
    sidebarToggleLabel: state.sidebarToggleLabel,
    onToggleSidebar: actions.onToggleSidebar,
    onToggleSettings: actions.onToggleSettings,
    browserUrl: state.browserUrl,
    canGoBack: state.canGoBack,
    canGoForward: state.canGoForward,
    canExportDocx: state.canExportDocx,
    onNavigateBack: actions.onNavigateBack,
    onNavigateForward: actions.onNavigateForward,
    onRefresh: actions.onRefresh,
    onExportDocx: actions.onExportDocx,
    webUrl: state.webUrl,
    onWebUrlChange: actions.onWebUrlChange,
    onNavigateWeb: actions.onNavigateWeb,
    articleUrlPlaceholder: state.articleUrlPlaceholder,
    addressBarSourceOptions: state.addressBarSourceOptions,
    selectedAddressBarSourceId: state.selectedAddressBarSourceId,
    onSelectAddressBarSource: actions.onSelectAddressBarSource,
    onCycleAddressBarSource: actions.onCycleAddressBarSource,
    addressBarSourcePlaceholder: state.addressBarSourcePlaceholder,
    addressBarSourceAriaLabel: state.addressBarSourceAriaLabel,
    fetchChannel: state.fetchChannel,
    previewReuseMode: state.previewReuseMode,
    fetchSourceText: state.fetchSourceText,
    fetchSourceTitle: state.fetchSourceTitle,
    fetchStopText: state.fetchStopText,
    fetchStopTitle: state.fetchStopTitle,
  };
}
