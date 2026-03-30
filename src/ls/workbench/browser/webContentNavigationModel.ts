import { toast } from '../../base/browser/ui/toast/toast';
import type { LocaleMessages } from '../../../language/locales';
import type { BatchSource } from '../services/config/configSchema';
import { formatLocalized } from '../services/desktop/desktopError';
import {
  EMPTY_WEB_CONTENT_STATE,
  type WebContentState,
  resolveWebContentNavigation,
  resolveWebContentRefreshMode,
  resolveWebContentStateUrlUpdate,
} from '../services/webContent/webContentNavigationService';
import {
  type QuickAccessCycleDirection,
  type QuickAccessSourceOption,
} from '../services/quickAccess/quickAccessService';

type StringSetter = (value: string) => void;
type StringStateSetter = (value: string | ((current: string) => string)) => void;

export type WebContentNavigationSnapshot = {
  browserUrl: string;
  webContentState: WebContentState;
};

type WebContentStateSyncContext = {
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

type WebContentNavigationButtonParams = {
  previewRuntime: boolean;
  ui: LocaleMessages;
};

type WebContentNavigationQuickAccessProvider = {
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

const DEFAULT_WEB_CONTENT_NAVIGATION_SNAPSHOT: WebContentNavigationSnapshot = {
  browserUrl: '',
  webContentState: EMPTY_WEB_CONTENT_STATE,
};

function areWebContentStatesEqual(previous: WebContentState, next: WebContentState) {
  return (
    previous.url === next.url &&
    previous.canGoBack === next.canGoBack &&
    previous.canGoForward === next.canGoForward &&
    previous.isLoading === next.isLoading &&
    previous.visible === next.visible
  );
}

function areWebContentNavigationSnapshotsEqual(
  previous: WebContentNavigationSnapshot,
  next: WebContentNavigationSnapshot,
) {
  return (
    previous.browserUrl === next.browserUrl &&
    areWebContentStatesEqual(previous.webContentState, next.webContentState)
  );
}

let webContentNavigationQuickAccessProvider: WebContentNavigationQuickAccessProvider | null = null;

export function registerWebContentNavigationQuickAccess(
  provider: WebContentNavigationQuickAccessProvider,
) {
  webContentNavigationQuickAccessProvider = provider;
}

function getWebContentNavigationQuickAccessProvider(): WebContentNavigationQuickAccessProvider {
  if (!webContentNavigationQuickAccessProvider) {
    throw new Error('Web content navigation quick access provider is not registered.');
  }

  return webContentNavigationQuickAccessProvider;
}

export class WebContentNavigationModel {
  private snapshot: WebContentNavigationSnapshot = DEFAULT_WEB_CONTENT_NAVIGATION_SNAPSHOT;
  private readonly listeners = new Set<() => void>();
  private activeTargetId: string | null = null;

  private emitChange() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private setSnapshot(nextSnapshot: WebContentNavigationSnapshot) {
    if (areWebContentNavigationSnapshotsEqual(this.snapshot, nextSnapshot)) {
      return;
    }

    this.snapshot = nextSnapshot;
    this.emitChange();
  }

  private updateSnapshot(
    updater: (snapshot: WebContentNavigationSnapshot) => WebContentNavigationSnapshot,
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

  private setWebContentState(webContentState: WebContentState) {
    this.updateSnapshot((snapshot) => ({
      ...snapshot,
      webContentState,
    }));
  }

  private applyWebContentState(
    state: WebContentState,
    context: Pick<WebContentStateSyncContext, 'setWebUrl' | 'setFetchSeedUrl'>,
  ) {
    this.setWebContentState(state);

    const webContentStateUrlUpdate = resolveWebContentStateUrlUpdate(state);
    if (!webContentStateUrlUpdate) {
      return;
    }

    this.setBrowserUrl(webContentStateUrlUpdate.browserUrl);
    context.setWebUrl(webContentStateUrlUpdate.webUrl);
    context.setFetchSeedUrl((current) => current || webContentStateUrlUpdate.fetchSeedUrl);
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
    context?: Pick<WebContentStateSyncContext, 'setWebUrl' | 'setFetchSeedUrl'>,
  ) {
    this.activeTargetId = targetId;

    // TODO(migration): `window.electronAPI.preview` is still the preload/main-process contract.
    // Rename the Electron bridge only after the desktop side is migrated together.
    if (!window.electronAPI?.preview) {
      return null;
    }

    window.electronAPI.preview.activate(targetId);

    if (!context) {
      return null;
    }

    try {
      const state = await window.electronAPI.preview.getState(targetId);
      this.applyWebContentState(state, context);
      return state;
    } catch {
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
  }: WebContentStateSyncContext): () => void {
    if (!previewRuntime || !window.electronAPI?.preview) {
      this.setWebContentState(EMPTY_WEB_CONTENT_STATE);
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

        this.applyWebContentState(state, {
          setWebUrl,
          setFetchSeedUrl,
        });
      })
      .catch(() => {});

    const unsubscribe = preview.onStateChange((state) => {
      this.applyWebContentState(state, {
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
    showToast,
    electronRuntime,
    previewRuntime,
    ui,
    setWebUrl,
    setFetchSeedUrl,
  }: NavigateToAddressBarUrlParams): boolean {
    const previewNavigation = resolveWebContentNavigation(
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

    if (previewNavigation.kind === 'content-runtime-unavailable') {
      toast.error(ui.toastPreviewRuntimeUnavailable);
      return false;
    }

    if (previewNavigation.kind === 'webcontents-content' && window.electronAPI?.preview) {
      void window.electronAPI.preview
        .navigate(previewNavigation.normalizedUrl, this.activeTargetId, 'browser')
        .catch(() => {
          toast.error(ui.toastPreviewRuntimeUnavailable);
        });

      if (showToast) {
        toast.success(formatLocalized(ui.toastNavigatingTo, { url: previewNavigation.normalizedUrl }));
      }
    }

    return true;
  }

  handleWebUrlChange(
    nextUrl: string,
    setWebUrl: StringSetter,
    setFetchSeedUrl: StringSetter,
  ): void {
    const provider = getWebContentNavigationQuickAccessProvider();
    provider.applyUrlInput(nextUrl, setWebUrl, setFetchSeedUrl);
  }

  handleBrowserRefresh({
    electronRuntime,
    previewRuntime,
    ui,
  }: BrowserRefreshParams): void {
    const previewRefreshMode = resolveWebContentRefreshMode(
      electronRuntime,
      previewRuntime,
    );

    if (previewRefreshMode === 'content-runtime-unavailable') {
      toast.error(ui.toastPreviewRuntimeUnavailable);
      return;
    }

    if (previewRefreshMode === 'webcontents-content' && window.electronAPI?.preview) {
      window.electronAPI.preview.reload(this.activeTargetId);
    }
  }

  handlePreviewBack({ previewRuntime, ui }: WebContentNavigationButtonParams): void {
    if (!previewRuntime || !window.electronAPI?.preview) {
      toast.info(ui.toastPreviewBackUnsupported);
      return;
    }

    window.electronAPI.preview.goBack(this.activeTargetId);
  }

  handlePreviewForward({ previewRuntime, ui }: WebContentNavigationButtonParams): void {
    if (!previewRuntime || !window.electronAPI?.preview) {
      toast.info(ui.toastPreviewForwardUnsupported);
      return;
    }

    window.electronAPI.preview.goForward(this.activeTargetId);
  }

  createAddressBarSourceOptions(batchSources: ReadonlyArray<BatchSource>) {
    const provider = getWebContentNavigationQuickAccessProvider();
    return provider.createSourceOptions(batchSources);
  }

  resolveSelectedAddressBarSourceId(
    fetchSeedUrl: string,
    webUrl: string,
    batchSources: ReadonlyArray<BatchSource>,
  ) {
    const provider = getWebContentNavigationQuickAccessProvider();
    return provider.resolveSourceId(fetchSeedUrl, webUrl, batchSources);
  }

  cycleSelectedAddressBarSource(
    options: ReadonlyArray<QuickAccessSourceOption>,
    selectedSourceId: string,
    direction: QuickAccessCycleDirection,
  ) {
    const provider = getWebContentNavigationQuickAccessProvider();
    return provider.resolveNextSourceOption(options, selectedSourceId, direction);
  }

  applyAddressBarSource(
    nextUrl: string,
    setWebUrl: StringSetter,
    setFetchSeedUrl: StringSetter,
  ) {
    const provider = getWebContentNavigationQuickAccessProvider();
    provider.applyUrlInput(nextUrl, setWebUrl, setFetchSeedUrl);
  }
}

export const registerPreviewNavigationQuickAccess =
  registerWebContentNavigationQuickAccess;
// TODO(migration): remove this compatibility export after quick access and any lazy imports
// stop requesting the old symbol name.
export const PreviewNavigationModel = WebContentNavigationModel;
