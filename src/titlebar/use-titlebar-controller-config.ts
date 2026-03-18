import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import type { LocaleMessages } from '../language/locales';
import type { TitlebarAction, TitlebarAddressBarSourceOption } from './titlebar';
import type { UseTitlebarControllerParams } from './use-titlebar-controller';

type ActivePage = 'reader' | 'settings';

type UseTitlebarControllerConfigParams = {
  activePage: ActivePage;
  setActivePage: Dispatch<SetStateAction<ActivePage>>;
  ui: LocaleMessages;
  webUrl: string;
  isWindowMaximized: boolean;
  handleWindowControl: (action: TitlebarAction) => void;
  isSidebarOpen: boolean;
  handleToggleSidebar: () => void;
  browserUrl: string;
  previewState: Pick<DesktopPreviewState, 'canGoBack' | 'canGoForward'>;
  canExportDocx: boolean;
  handlePreviewBack: () => void;
  handlePreviewForward: () => void;
  handleBrowserRefresh: () => void;
  handleExportArticlesDocx: () => Promise<void>;
  addressBarSourceOptions: TitlebarAddressBarSourceOption[];
  selectedAddressBarSourceId: string;
  handleWebUrlChange: (url: string) => void;
  handleNavigateWeb: () => void;
  handleSelectAddressBarSource: (sourceId: string) => void;
  handleCycleAddressBarSource: (direction: 'prev' | 'next') => void;
  fetchStatus: DesktopFetchStatus | null;
  titlebarFetchSourceText: string;
  titlebarFetchSourceTitle: string;
  titlebarFetchStopText: string;
  titlebarFetchStopTitle: string;
};

export function useTitlebarControllerConfig({
  activePage,
  setActivePage,
  ui,
  webUrl,
  isWindowMaximized,
  handleWindowControl,
  isSidebarOpen,
  handleToggleSidebar,
  browserUrl,
  previewState,
  canExportDocx,
  handlePreviewBack,
  handlePreviewForward,
  handleBrowserRefresh,
  handleExportArticlesDocx,
  addressBarSourceOptions,
  selectedAddressBarSourceId,
  handleWebUrlChange,
  handleNavigateWeb,
  handleSelectAddressBarSource,
  handleCycleAddressBarSource,
  fetchStatus,
  titlebarFetchSourceText,
  titlebarFetchSourceTitle,
  titlebarFetchStopText,
  titlebarFetchStopTitle,
}: UseTitlebarControllerConfigParams) {
  const handleToggleSettings = useCallback(() => {
    setActivePage((previous) => (previous === 'settings' ? 'reader' : 'settings'));
  }, [setActivePage]);

  const handleTitlebarExportDocx = useCallback(() => {
    void handleExportArticlesDocx();
  }, [handleExportArticlesDocx]);

  const titlebarLabels = useMemo(
    () => ({
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
    }),
    [ui],
  );

  return useMemo<UseTitlebarControllerParams>(
    () => ({
      state: {
        appName: ui.appName,
        labels: titlebarLabels,
        isWindowMaximized,
        isSidebarOpen,
        sidebarToggleLabel: isSidebarOpen ? ui.sidebarCollapse : ui.sidebarExpand,
        browserUrl,
        canGoBack: previewState.canGoBack,
        canGoForward: previewState.canGoForward,
        canExportDocx,
        webUrl,
        articleUrlPlaceholder: ui.pageUrlPlaceholder,
        addressBarSourceOptions,
        selectedAddressBarSourceId,
        addressBarSourcePlaceholder: ui.addressBarSourcePlaceholder,
        addressBarSourceAriaLabel: ui.addressBarSourceAriaLabel,
        fetchChannel: fetchStatus?.fetchChannel ?? null,
        previewReuseMode: fetchStatus?.previewReuseMode ?? null,
        fetchSourceText: titlebarFetchSourceText,
        fetchSourceTitle: titlebarFetchSourceTitle,
        fetchStopText: titlebarFetchStopText,
        fetchStopTitle: titlebarFetchStopTitle,
      },
      actions: {
        onWindowControl: handleWindowControl,
        onToggleSidebar: activePage === 'reader' ? handleToggleSidebar : undefined,
        onToggleSettings: handleToggleSettings,
        onNavigateBack: handlePreviewBack,
        onNavigateForward: handlePreviewForward,
        onRefresh: handleBrowserRefresh,
        onExportDocx: handleTitlebarExportDocx,
        onWebUrlChange: handleWebUrlChange,
        onNavigateWeb: handleNavigateWeb,
        onSelectAddressBarSource: handleSelectAddressBarSource,
        onCycleAddressBarSource: handleCycleAddressBarSource,
      },
    }),
    [
      activePage,
      addressBarSourceOptions,
      browserUrl,
      canExportDocx,
      fetchStatus,
      handleBrowserRefresh,
      handleCycleAddressBarSource,
      handleNavigateWeb,
      handlePreviewBack,
      handlePreviewForward,
      handleSelectAddressBarSource,
      handleTitlebarExportDocx,
      handleToggleSettings,
      handleToggleSidebar,
      handleWebUrlChange,
      handleWindowControl,
      isSidebarOpen,
      isWindowMaximized,
      previewState,
      selectedAddressBarSourceId,
      titlebarFetchSourceText,
      titlebarFetchSourceTitle,
      titlebarFetchStopText,
      titlebarFetchStopTitle,
      titlebarLabels,
      ui,
      webUrl,
    ],
  );
}
