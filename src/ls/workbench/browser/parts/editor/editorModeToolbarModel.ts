import type { EditorPartLabels } from 'ls/workbench/browser/parts/editor/editorPartView';
import { getEditorPaneMode } from 'ls/workbench/browser/parts/editor/editorInput';
import type { EditorWorkspaceTab } from 'ls/workbench/browser/parts/editor/editorModel';
import type { EditorBrowserSourcesPanel } from 'ls/workbench/browser/parts/editor/editorBrowserSourcesPanel';
import type { EditorModeToolbarContributionContext } from 'ls/workbench/browser/parts/editor/editorModeToolbarContribution';

type EditorModeToolbarSourceProps = {
  activeTab: EditorWorkspaceTab | null;
  labels: EditorPartLabels;
  viewPartProps: {
    browserUrl: string;
    electronRuntime: boolean;
  };
  onOpenAddressBarSourceMenu: () => void;
  onToolbarNavigateBack: () => void;
  onToolbarNavigateForward: () => void;
  onToolbarNavigateRefresh: () => void;
  onToolbarHardReload: () => void;
  onToolbarCopyCurrentUrl: () => void | Promise<void>;
  onToolbarClearBrowsingHistory: () => void;
  onToolbarClearCookies: () => void | Promise<void>;
  onToolbarClearCache: () => void | Promise<void>;
  onToolbarAddressChange: (value: string) => void;
  onToolbarAddressSubmit: () => void;
  onToolbarNavigateToUrl: (url: string) => void;
  browserSourcesPanel?: EditorBrowserSourcesPanel | null;
};

export type EditorModeToolbarContext = EditorModeToolbarContributionContext;

export function createEditorModeToolbarContext(
  props: EditorModeToolbarSourceProps,
): EditorModeToolbarContext {
  const mode = props.activeTab ? getEditorPaneMode(props.activeTab) : null;

  return {
    mode: mode === 'browser' || mode === 'pdf' ? mode : null,
    browserUrl: props.viewPartProps.browserUrl,
    electronRuntime: props.viewPartProps.electronRuntime,
    labels: {
      toolbarSources: props.labels.toolbarSources,
      toolbarBack: props.labels.toolbarBack,
      toolbarForward: props.labels.toolbarForward,
      toolbarRefresh: props.labels.toolbarRefresh,
      toolbarFavorite: props.labels.toolbarFavorite,
      toolbarMore: props.labels.toolbarMore,
      toolbarHardReload: props.labels.toolbarHardReload,
      toolbarCopyCurrentUrl: props.labels.toolbarCopyCurrentUrl,
      toolbarClearBrowsingHistory: props.labels.toolbarClearBrowsingHistory,
      toolbarClearCookies: props.labels.toolbarClearCookies,
      toolbarClearCache: props.labels.toolbarClearCache,
      toolbarAddressBar: props.labels.toolbarAddressBar,
      toolbarAddressPlaceholder: props.labels.toolbarAddressPlaceholder,
      toolbarSourcesRecent: props.labels.toolbarSourcesRecent,
      toolbarSourcesFavorites: props.labels.toolbarSourcesFavorites,
      toolbarSourcesEmpty: props.labels.toolbarSourcesEmpty,
      pdfTitle: props.labels.pdfTitle,
    },
    onOpenSources: props.onOpenAddressBarSourceMenu,
    onNavigateBack: props.onToolbarNavigateBack,
    onNavigateForward: props.onToolbarNavigateForward,
    onNavigateRefresh: props.onToolbarNavigateRefresh,
    onHardReload: props.onToolbarHardReload,
    onCopyCurrentUrl: props.onToolbarCopyCurrentUrl,
    onClearBrowsingHistory: props.onToolbarClearBrowsingHistory,
    onClearCookies: props.onToolbarClearCookies,
    onClearCache: props.onToolbarClearCache,
    onAddressInputChange: props.onToolbarAddressChange,
    onAddressInputSubmit: props.onToolbarAddressSubmit,
    onNavigateToUrl: props.onToolbarNavigateToUrl,
    browserSourcesPanel: props.browserSourcesPanel ?? null,
  };
}
