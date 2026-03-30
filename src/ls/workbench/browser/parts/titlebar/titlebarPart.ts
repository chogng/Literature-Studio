import type { LocaleMessages } from '../../../../../language/locales';
import type { QuickAccessSourceOption } from '../../../services/quickAccess/quickAccessService';
import type { WebContentState } from '../../../services/webContent/webContentNavigationService';
import type { TitlebarAction, TitlebarProps } from './titlebarView';
import type { WorkbenchPage } from '../../workbench';
import {
  createTitlebarQuickAccessProps,
  type QuickAccessAction,
} from './quickAccess';

export type TitlebarPartState = {
  activePage: WorkbenchPage;
  ui: LocaleMessages;
  webUrl: string;
  isWindowMaximized: boolean;
  isSidebarVisible: boolean;
  isKnowledgeBaseModeEnabled: boolean;
  isAuxiliarySidebarVisible: boolean;
  browserUrl: string;
  webContentState: Pick<WebContentState, 'canGoBack' | 'canGoForward'>;
  canExportDocx: boolean;
  addressBarSourceOptions: QuickAccessSourceOption[];
  selectedAddressBarSourceId: string;
};

export type TitlebarPartActions = {
  handleWindowControl: (action: TitlebarAction) => void;
  handleToggleSidebar: () => void;
  handleToggleAuxiliarySidebar: () => void;
  handlePreviewBack: () => void;
  handlePreviewForward: () => void;
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
    isSidebarVisible,
    isKnowledgeBaseModeEnabled,
    isAuxiliarySidebarVisible,
    browserUrl,
    webContentState,
    canExportDocx,
    addressBarSourceOptions,
    selectedAddressBarSourceId,
  },
  actions: {
    handleWindowControl,
    handleToggleSidebar,
    handleToggleAuxiliarySidebar,
    handlePreviewBack,
    handlePreviewForward,
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
      showAssistantLabel: ui.titlebarShowAssistant,
      hideAssistantLabel: ui.titlebarHideAssistant,
      exportDocxLabel: ui.titlebarExportDocx,
      noExportableArticlesLabel: ui.titlebarNoExportableArticles,
    },
    isWindowMaximized,
    onWindowControl: handleWindowControl,
    isSidebarOpen: isSidebarVisible,
    sidebarToggleLabel: isSidebarVisible ? ui.sidebarCollapse : ui.sidebarExpand,
    onToggleSidebar: activePage === 'reader' ? handleToggleSidebar : undefined,
    isAuxiliarySidebarOpen: isAuxiliarySidebarVisible,
    auxiliarySidebarToggleLabel: isAuxiliarySidebarVisible
      ? ui.titlebarHideAssistant
      : ui.titlebarShowAssistant,
    onToggleAuxiliarySidebar:
      activePage === 'reader' && isKnowledgeBaseModeEnabled
        ? handleToggleAuxiliarySidebar
        : undefined,
    browserUrl,
    canGoBack: webContentState.canGoBack,
    canGoForward: webContentState.canGoForward,
    canExportDocx,
    onNavigateBack: handlePreviewBack,
    onNavigateForward: handlePreviewForward,
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
