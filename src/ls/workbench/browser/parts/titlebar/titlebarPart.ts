import type { LocaleMessages } from '../../../../../language/locales';
import type {
  FetchStatus,
  PreviewState,
} from '../../../../base/parts/sandbox/common/desktopTypes.js';
import type { QuickAccessSourceOption } from '../../../services/quickAccess/quickAccessService';
import type { TitlebarAction, TitlebarProps } from './titlebarView';
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
  previewState: Pick<PreviewState, 'canGoBack' | 'canGoForward'>;
  canExportDocx: boolean;
  addressBarSourceOptions: QuickAccessSourceOption[];
  selectedAddressBarSourceId: string;
  fetchStatus: FetchStatus | null;
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
  handleAddressBarSourceMenuOpenChange: (isOpen: boolean) => void;
  handleAddressBarSourceMenuDispose: () => void;
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
    handleAddressBarSourceMenuOpenChange,
    handleAddressBarSourceMenuDispose,
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
    onAddressBarSourceMenuOpenChange: handleAddressBarSourceMenuOpenChange,
    onAddressBarSourceMenuDispose: handleAddressBarSourceMenuDispose,
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
