import type { LocaleMessages } from 'language/locales';
import type { QuickAccessSourceOption } from 'ls/workbench/services/quickAccess/quickAccessService';
import type { WebContentState } from 'ls/workbench/services/webContent/webContentNavigationService';
import type { TitlebarAction, TitlebarProps } from 'ls/workbench/browser/parts/titlebar/titlebarView';
import type { WorkbenchPage } from 'ls/workbench/browser/workbench';
import { createTitlebarQuickAccessProps } from 'ls/workbench/browser/parts/titlebar/quickAccess';
import type { QuickAccessAction } from 'ls/workbench/browser/parts/titlebar/quickAccess';

export type TitlebarPartState = {
  activePage: WorkbenchPage;
  ui: LocaleMessages;
  webUrl: string;
  isWindowMaximized: boolean;
  isPrimarySidebarVisible: boolean;
  isAgentSidebarVisible: boolean;
  browserUrl: string;
  webContentState: Pick<WebContentState, 'canGoBack' | 'canGoForward'>;
  canExportDocx: boolean;
  addressBarSourceOptions: QuickAccessSourceOption[];
  selectedAddressBarSourceId: string;
};

export type TitlebarPartActions = {
  handleWindowControl: (action: TitlebarAction) => void;
  handleTogglePrimarySidebar: () => void;
  handleToggleAgentSidebar: () => void;
  handleWebContentBack: () => void;
  handleWebContentForward: () => void;
  handleWebContentRefresh: () => void;
  dispatchQuickAccessAction: (action: QuickAccessAction) => void;
};

export type CreateTitlebarPartPropsParams = {
  state: TitlebarPartState;
  actions: TitlebarPartActions;
};

// Keep this mapper in the workbench part layer so the titlebar view stays dumb.
export function createTitlebarPartProps({
  state: {
    activePage,
    ui,
    webUrl,
    isWindowMaximized,
    isPrimarySidebarVisible,
    isAgentSidebarVisible,
    browserUrl,
    webContentState,
    canExportDocx,
    addressBarSourceOptions,
    selectedAddressBarSourceId,
  },
  actions: {
    handleWindowControl,
    handleTogglePrimarySidebar,
    handleToggleAgentSidebar,
    handleWebContentBack,
    handleWebContentForward,
    handleWebContentRefresh,
    dispatchQuickAccessAction,
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
      showPrimarySidebarLabel: ui.titlebarShowPrimarySidebar,
      hidePrimarySidebarLabel: ui.titlebarHidePrimarySidebar,
      showAssistantLabel: ui.titlebarShowAssistant,
      hideAssistantLabel: ui.titlebarHideAssistant,
      exportDocxLabel: ui.titlebarExportDocx,
      noExportableArticlesLabel: ui.titlebarNoExportableArticles,
    },
    isWindowMaximized,
    onWindowControl: handleWindowControl,
    isPrimarySidebarOpen: isPrimarySidebarVisible,
    primarySidebarToggleLabel: isPrimarySidebarVisible
      ? ui.titlebarHidePrimarySidebar
      : ui.titlebarShowPrimarySidebar,
    onTogglePrimarySidebar:
      activePage === 'content' ? handleTogglePrimarySidebar : undefined,
    isAgentSidebarOpen: isAgentSidebarVisible,
    agentSidebarToggleLabel: isAgentSidebarVisible
      ? ui.titlebarHideAssistant
      : ui.titlebarShowAssistant,
    onToggleAgentSidebar:
      activePage === 'content' ? handleToggleAgentSidebar : undefined,
    browserUrl,
    canGoBack: webContentState.canGoBack,
    canGoForward: webContentState.canGoForward,
    canExportDocx,
    onNavigateBack: handleWebContentBack,
    onNavigateForward: handleWebContentForward,
    onNavigateRefresh: handleWebContentRefresh,
    ...createTitlebarQuickAccessProps({
      state: {
        ui,
        webUrl,
        addressBarSourceOptions,
        selectedAddressBarSourceId,
      },
      actions: {
        dispatchQuickAccessAction,
      },
    }),
  };
}
