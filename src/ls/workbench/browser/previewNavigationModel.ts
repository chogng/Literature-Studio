import { toast } from '../../base/browser/ui/toast/toast';
import type { PreviewState } from '../../base/parts/sandbox/common/desktopTypes.js';
import type { LocaleMessages } from '../../../language/locales';
import type { BatchSource } from '../services/config/configSchema';
import { formatLocalized } from '../services/desktop/desktopError';
import {
  EMPTY_PREVIEW_STATE,
  resolvePreviewNavigation,
  resolvePreviewRefreshMode,
  resolvePreviewStateUrlUpdate,
} from '../services/preview/previewNavigationService';
import {
  type QuickAccessCycleDirection,
  type QuickAccessSourceOption,
} from '../services/quickAccess/quickAccessService';

type StringSetter = (value: string) => void;
type StringStateSetter = (value: string | ((current: string) => string)) => void;

export type PreviewNavigationSnapshot = {
  browserUrl: string;
  previewState: PreviewState;
};

type PreviewStateSyncContext = {
  previewRuntime: boolean;
  setWebUrl: StringSetter;
  setFetchSeedUrl: StringStateSetter;
};

type NavigateToAddressBarUrlParams = {
  nextUrl: string;
  showToast?: boolean;
  electronRuntime: boolean;
  previewRuntime: boolean;
  ui: LocaleMessages;
  setWebUrl: StringSetter;
  setFetchSeedUrl: StringSetter;
};

type BrowserRefreshParams = {
  electronRuntime: boolean;
  previewRuntime: boolean;
  ui: LocaleMessages;
};

type PreviewNavigationButtonParams = {
  previewRuntime: boolean;
  ui: LocaleMessages;
};

type PreviewNavigationQuickAccessProvider = {
  applyUrlInput: (
    nextUrl: string,
    setWebUrl: StringSetter,
    setFetchSeedUrl: StringSetter,
  ) => void;
  createSourceOptions: (
    batchSources: ReadonlyArray<BatchSource>,
  ) => QuickAccessSourceOption[];
  findSourceOption: (
    options: ReadonlyArray<QuickAccessSourceOption>,
    sourceId: string,
  ) => QuickAccessSourceOption | undefined;
  resolveNextSourceOption: (
    options: ReadonlyArray<QuickAccessSourceOption>,
    selectedSourceId: string,
    direction: QuickAccessCycleDirection,
  ) => QuickAccessSourceOption | null;
  resolveSourceId: (
    fetchSeedUrl: string,
    webUrl: string,
    batchSources: ReadonlyArray<BatchSource>,
  ) => string;
};

const DEFAULT_PREVIEW_NAVIGATION_SNAPSHOT: PreviewNavigationSnapshot = {
  browserUrl: '',
  previewState: EMPTY_PREVIEW_STATE,
};

let previewNavigationQuickAccessProvider: PreviewNavigationQuickAccessProvider | null = null;

export function registerPreviewNavigationQuickAccess(
  provider: PreviewNavigationQuickAccessProvider,
) {
  previewNavigationQuickAccessProvider = provider;
}

function getPreviewNavigationQuickAccessProvider(): PreviewNavigationQuickAccessProvider {
  if (!previewNavigationQuickAccessProvider) {
    throw new Error('Preview navigation quick access provider is not registered.');
  }

  return previewNavigationQuickAccessProvider;
}

export class PreviewNavigationModel {
  private snapshot: PreviewNavigationSnapshot = DEFAULT_PREVIEW_NAVIGATION_SNAPSHOT;
  private readonly listeners = new Set<() => void>();
  private activeTargetId: string | null = null;

  private emitChange() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private setSnapshot(nextSnapshot: PreviewNavigationSnapshot) {
    if (Object.is(this.snapshot, nextSnapshot)) {
      return;
    }

    this.snapshot = nextSnapshot;
    this.emitChange();
  }

  private updateSnapshot(
    updater: (snapshot: PreviewNavigationSnapshot) => PreviewNavigationSnapshot,
  ) {
    this.setSnapshot(updater(this.snapshot));
  }

  private setBrowserUrl(browserUrl: string) {
    if (this.snapshot.browserUrl === browserUrl) {
      return;
    }

    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      browserUrl,
    }));
  }

  private setPreviewState(previewState: PreviewState) {
    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      previewState,
    }));
  }

  private applyPreviewState(
    state: PreviewState,
    context: Pick<PreviewStateSyncContext, 'setWebUrl' | 'setFetchSeedUrl'>,
  ) {
    this.setPreviewState(state);

    const previewStateUrlUpdate = resolvePreviewStateUrlUpdate(state);
    if (!previewStateUrlUpdate) {
      return;
    }

    this.setBrowserUrl(previewStateUrlUpdate.browserUrl);
    context.setWebUrl(previewStateUrlUpdate.webUrl);
    context.setFetchSeedUrl((current) => current || previewStateUrlUpdate.fetchSeedUrl);
  }

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = () => this.snapshot;

  async activateTarget(
    targetId: string | null,
    context?: Pick<PreviewStateSyncContext, 'setWebUrl' | 'setFetchSeedUrl'>,
  ) {
    this.activeTargetId = targetId;

    if (!window.electronAPI?.preview) {
      return null;
    }

    window.electronAPI.preview.activate(targetId);

    if (!context) {
      return null;
    }

    try {
      const state = await window.electronAPI.preview.getState(targetId);
      this.applyPreviewState(state, context);
      return state;
    } catch {
      // Ignore activation sync failures; the active preview state stream will catch up.
      return null;
    }
  }

  releaseTarget(targetId: string | null) {
    if (!window.electronAPI?.preview) {
      return;
    }

    window.electronAPI.preview.release(targetId);
  }

  connectPreviewState({
    previewRuntime,
    setWebUrl,
    setFetchSeedUrl,
  }: PreviewStateSyncContext): () => void {
    if (!previewRuntime || !window.electronAPI?.preview) {
      this.setPreviewState(EMPTY_PREVIEW_STATE);
      return () => {};
    }

    let mounted = true;
    const preview = window.electronAPI.preview;

    void preview
      .getState(this.activeTargetId)
      .then((state) => {
        if (!mounted) {
          return;
        }

        this.applyPreviewState(state, {
          setWebUrl,
          setFetchSeedUrl,
        });
      })
      .catch(() => {});

    const unsubscribe = preview.onStateChange((state) => {
      this.applyPreviewState(state, {
        setWebUrl,
        setFetchSeedUrl,
      });
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }

  navigateToAddressBarUrl({
    nextUrl,
    showToast = true,
    electronRuntime,
    previewRuntime,
    ui,
    setWebUrl,
    setFetchSeedUrl,
  }: NavigateToAddressBarUrlParams): boolean {
    const previewNavigation = resolvePreviewNavigation(
      nextUrl,
      electronRuntime,
      previewRuntime,
    );

    if (previewNavigation.kind === 'invalid-url') {
      toast.error(ui.toastEnterArticleUrl);
      return false;
    }

    setWebUrl(previewNavigation.normalizedUrl);
    this.setBrowserUrl(previewNavigation.normalizedUrl);
    setFetchSeedUrl(previewNavigation.normalizedUrl);

    if (previewNavigation.kind === 'preview-runtime-unavailable') {
      toast.error(ui.toastPreviewRuntimeUnavailable);
      return false;
    }

    if (previewNavigation.kind === 'webcontents-preview' && window.electronAPI?.preview) {
      void window.electronAPI.preview
        .navigate(previewNavigation.normalizedUrl, this.activeTargetId)
        .catch(() => {
          window.electronAPI?.preview?.setVisible(false);
        });
    }

    if (showToast) {
      toast.success(formatLocalized(ui.toastNavigatingTo, { url: previewNavigation.normalizedUrl }));
    }

    return true;
  }

  handleBrowserRefresh({
    electronRuntime,
    previewRuntime,
    ui,
  }: BrowserRefreshParams): void {
    const previewRefreshMode = resolvePreviewRefreshMode(
      electronRuntime,
      previewRuntime,
    );

    if (previewRefreshMode === 'preview-runtime-unavailable') {
      toast.error(ui.toastPreviewRuntimeUnavailable);
      return;
    }

    if (previewRefreshMode === 'webcontents-preview' && window.electronAPI?.preview) {
      window.electronAPI.preview.reload(this.activeTargetId);
    }
  }

  handlePreviewBack({ previewRuntime, ui }: PreviewNavigationButtonParams): void {
    if (!previewRuntime || !window.electronAPI?.preview) {
      toast.info(ui.toastPreviewBackUnsupported);
      return;
    }

    window.electronAPI.preview.goBack(this.activeTargetId);
  }

  handlePreviewForward({ previewRuntime, ui }: PreviewNavigationButtonParams): void {
    if (!previewRuntime || !window.electronAPI?.preview) {
      toast.info(ui.toastPreviewForwardUnsupported);
      return;
    }

    window.electronAPI.preview.goForward(this.activeTargetId);
  }

  createAddressBarSourceOptions(
    batchSources: BatchSource[],
  ): QuickAccessSourceOption[] {
    return getPreviewNavigationQuickAccessProvider().createSourceOptions(batchSources);
  }

  resolveSelectedAddressBarSourceId(
    fetchSeedUrl: string,
    webUrl: string,
    batchSources: BatchSource[],
  ): string {
    return getPreviewNavigationQuickAccessProvider().resolveSourceId(
      fetchSeedUrl,
      webUrl,
      batchSources,
    );
  }

  handleWebUrlChange(
    nextUrl: string,
    setWebUrl: StringSetter,
    setFetchSeedUrl: StringSetter,
  ): void {
    getPreviewNavigationQuickAccessProvider().applyUrlInput(
      nextUrl,
      setWebUrl,
      setFetchSeedUrl,
    );
  }
}
