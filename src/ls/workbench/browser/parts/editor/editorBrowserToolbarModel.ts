import type { EditorPartLabels } from 'ls/workbench/browser/parts/editor/editorPartView';
import { getEditorPaneMode } from 'ls/workbench/browser/parts/editor/editorInput';
import type { EditorWorkspaceTab } from 'ls/workbench/browser/parts/editor/editorModel';

type EditorBrowserToolbarSourceProps = {
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
};

export type EditorBrowserToolbarProps = {
  mode: 'browser' | 'pdf' | null;
  browserUrl: string;
  electronRuntime: boolean;
  labels: Pick<
    EditorPartLabels,
    | 'toolbarSources'
    | 'toolbarBack'
    | 'toolbarForward'
    | 'toolbarRefresh'
    | 'toolbarFavorite'
    | 'toolbarMore'
    | 'toolbarHardReload'
    | 'toolbarCopyCurrentUrl'
    | 'toolbarClearBrowsingHistory'
    | 'toolbarClearCookies'
    | 'toolbarClearCache'
    | 'toolbarAddressBar'
    | 'toolbarAddressPlaceholder'
    | 'pdfTitle'
  >;
  onOpenSources: () => void;
  onNavigateBack: () => void;
  onNavigateForward: () => void;
  onNavigateRefresh: () => void;
  onHardReload: () => void;
  onCopyCurrentUrl: () => void | Promise<void>;
  onClearBrowsingHistory: () => void;
  onClearCookies: () => void | Promise<void>;
  onClearCache: () => void | Promise<void>;
  onAddressInputChange: (value: string) => void;
  onAddressInputSubmit: () => void;
};

export function createEditorBrowserToolbarProps(
  props: EditorBrowserToolbarSourceProps,
): EditorBrowserToolbarProps {
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
  };
}
