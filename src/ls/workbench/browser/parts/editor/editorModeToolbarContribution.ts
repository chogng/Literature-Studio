export type EditorModeToolbarKind = 'browser' | 'pdf';

export type EditorModeToolbarContributionContext = {
  mode: EditorModeToolbarKind | null;
  browserUrl: string;
  electronRuntime: boolean;
  labels: {
    toolbarSources: string;
    toolbarBack: string;
    toolbarForward: string;
    toolbarRefresh: string;
    toolbarFavorite: string;
    toolbarMore: string;
    toolbarHardReload: string;
    toolbarCopyCurrentUrl: string;
    toolbarClearBrowsingHistory: string;
    toolbarClearCookies: string;
    toolbarClearCache: string;
    toolbarAddressBar: string;
    toolbarAddressPlaceholder: string;
    pdfTitle: string;
  };
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

export interface EditorModeToolbarContribution {
  readonly mode: EditorModeToolbarKind;
  getElement(): HTMLElement;
  setContext(context: EditorModeToolbarContributionContext): void;
  dispose(): void;
}

