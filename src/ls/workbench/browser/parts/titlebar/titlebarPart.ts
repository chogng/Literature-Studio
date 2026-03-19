import type { LocaleMessages } from '../../../../../language/locales';
import type {
  TitlebarAction,
  TitlebarAddressBarSourceOption,
  TitlebarProps,
} from './titlebarModel';
import type { WorkbenchPage } from '../../workbench';
import {
  createTitlebarQuickAccessProps,
  type QuickAccessCycleDirection,
} from './quickAccess';

export type TitlebarPartState = {
  activePage: WorkbenchPage;
  ui: LocaleMessages;
  webUrl: string;
  isWindowMaximized: boolean;
  isSidebarVisible: boolean;
  browserUrl: string;
  previewState: Pick<DesktopPreviewState, 'canGoBack' | 'canGoForward'>;
  canExportDocx: boolean;
  addressBarSourceOptions: TitlebarAddressBarSourceOption[];
  selectedAddressBarSourceId: string;
  fetchStatus: DesktopFetchStatus | null;
  titlebarFetchSourceText: string;
  titlebarFetchSourceTitle: string;
  titlebarFetchStopText: string;
  titlebarFetchStopTitle: string;
};

export type TitlebarPartActions = {
  handleWindowControl: (action: TitlebarAction) => void;
  handleToggleSidebar: () => void;
  handleToggleSettings: () => void;
  handlePreviewBack: () => void;
  handlePreviewForward: () => void;
  handleBrowserRefresh: () => void;
  handleExportDocx: () => void;
  handleWebUrlChange: (url: string) => void;
  handleNavigateWeb: () => void;
  handleSelectAddressBarSource: (sourceId: string) => void;
  handleCycleAddressBarSource: (direction: QuickAccessCycleDirection) => void;
};

export type CreateTitlebarPartPropsParams = {
  state: TitlebarPartState;
  actions: TitlebarPartActions;
};

// Keep this mapper in the workbench part layer so the React view stays dumb.
export function createTitlebarPartProps({
  state: {
    activePage,
    ui,
    webUrl,
    isWindowMaximized,
    isSidebarVisible,
    browserUrl,
    previewState,
    canExportDocx,
    addressBarSourceOptions,
    selectedAddressBarSourceId,
    fetchStatus,
    titlebarFetchSourceText,
    titlebarFetchSourceTitle,
    titlebarFetchStopText,
    titlebarFetchStopTitle,
  },
  actions: {
    handleWindowControl,
    handleToggleSidebar,
    handleToggleSettings,
    handlePreviewBack,
    handlePreviewForward,
    handleBrowserRefresh,
    handleExportDocx,
    handleWebUrlChange,
    handleNavigateWeb,
    handleSelectAddressBarSource,
    handleCycleAddressBarSource,
  },
}: CreateTitlebarPartPropsParams): TitlebarProps {
  return {
    appName: ui.appName,
    labels: {
      controlsAriaLabel: ui.titlebarControls,
      settingsLabel: ui.titlebarSettings,
      minimizeLabel: ui.titlebarMinimize,
      maximizeLabel: ui.titlebarMaximize,
      restoreLabel: ui.titlebarRestore,
      closeLabel: ui.titlebarClose,
      backLabel: ui.titlebarBack,
      forwardLabel: ui.titlebarForward,
      refreshLabel: ui.titlebarRefresh,
      exportDocxLabel: ui.titlebarExportDocx,
      noExportableArticlesLabel: ui.titlebarNoExportableArticles,
    },
    isWindowMaximized,
    onWindowControl: handleWindowControl,
    isSidebarOpen: isSidebarVisible,
    sidebarToggleLabel: isSidebarVisible ? ui.sidebarCollapse : ui.sidebarExpand,
    onToggleSidebar: activePage === 'reader' ? handleToggleSidebar : undefined,
    onToggleSettings: handleToggleSettings,
    browserUrl,
    canGoBack: previewState.canGoBack,
    canGoForward: previewState.canGoForward,
    canExportDocx,
    onNavigateBack: handlePreviewBack,
    onNavigateForward: handlePreviewForward,
    onRefresh: handleBrowserRefresh,
    onExportDocx: handleExportDocx,
    ...createTitlebarQuickAccessProps({
      state: {
        ui,
        webUrl,
        addressBarSourceOptions,
        selectedAddressBarSourceId,
      },
      actions: {
        handleWebUrlChange,
        handleNavigateWeb,
        handleSelectAddressBarSource,
        handleCycleAddressBarSource,
      },
    }),
    fetchChannel: fetchStatus?.fetchChannel ?? null,
    previewReuseMode: fetchStatus?.previewReuseMode ?? null,
    fetchSourceText: titlebarFetchSourceText,
    fetchSourceTitle: titlebarFetchSourceTitle,
    fetchStopText: titlebarFetchStopText,
    fetchStopTitle: titlebarFetchStopTitle,
  };
}
