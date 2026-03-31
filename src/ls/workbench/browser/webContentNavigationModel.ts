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
  webContentRuntime: boolean;
  setWebUrl: StringSetter;
  setFetchSeedUrl: StringStateSetter;
};

type NavigateToAddressBarUrlParams = {
  nextUrl: string;
  showToast?: boolean;
  electronRuntime: boolean;
  webContentRuntime: boolean;
  ui: LocaleMessages;
  setWebUrl: StringSetter;
  setFetchSeedUrl: StringSetter;
};

type BrowserRefreshParams = {
  electronRuntime: boolean;
  webContentRuntime: boolean;
  ui: LocaleMessages;
};

type WebContentNavigationButtonParams = {
  webContentRuntime: boolean;
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

    if (!window.electronAPI?.webContent) {
      return null;
    }

    window.electronAPI.webContent.activate(targetId);

    if (!context) {
      return null;
    }

    try {
      const state = await window.electronAPI.webContent.getState(targetId);
      this.applyWebContentState(state, context);
      return state;
    } catch {
      return null;
    }
  }

  releaseTarget(targetId: string | null) {
    if (!window.electronAPI?.webContent) {
      return;
    }

    window.electronAPI.webContent.release(targetId);
  }

  connectWebContentState({
    webContentRuntime,
    setWebUrl,
    setFetchSeedUrl,
  }: WebContentStateSyncContext): () => void {
    if (!webContentRuntime || !window.electronAPI?.webContent) {
      this.setWebContentState(EMPTY_WEB_CONTENT_STATE);
      return () => {};
    }

    let mounted = true;
    const webContent = window.electronAPI.webContent;

    void webContent
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

    const unsubscribe = webContent.onStateChange((state) => {
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
    webContentRuntime,
    ui,
    setWebUrl,
    setFetchSeedUrl,
  }: NavigateToAddressBarUrlParams): boolean {
    const webContentNavigation = resolveWebContentNavigation(
      nextUrl,
      electronRuntime,
      webContentRuntime,
    );

    if (webContentNavigation.kind === 'invalid-url') {
      toast.error(ui.toastEnterArticleUrl);
      return false;
    }

    setWebUrl(webContentNavigation.normalizedUrl);
    this.setBrowserUrl(webContentNavigation.normalizedUrl);
    setFetchSeedUrl(webContentNavigation.normalizedUrl);

    if (webContentNavigation.kind === 'content-runtime-unavailable') {
      toast.error(ui.toastWebContentRuntimeUnavailable);
      return false;
    }

    if (webContentNavigation.kind === 'webcontents-content' && window.electronAPI?.webContent) {
      void window.electronAPI.webContent
        .navigate(webContentNavigation.normalizedUrl, this.activeTargetId, 'browser')
        .catch(() => {
          toast.error(ui.toastWebContentRuntimeUnavailable);
        });

      if (showToast) {
        toast.success(formatLocalized(ui.toastNavigatingTo, { url: webContentNavigation.normalizedUrl }));
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
    webContentRuntime,
    ui,
  }: BrowserRefreshParams): void {
    const webContentRefreshMode = resolveWebContentRefreshMode(
      electronRuntime,
      webContentRuntime,
    );

    if (webContentRefreshMode === 'content-runtime-unavailable') {
      toast.error(ui.toastWebContentRuntimeUnavailable);
      return;
    }

    if (webContentRefreshMode === 'webcontents-content' && window.electronAPI?.webContent) {
      window.electronAPI.webContent.reload(this.activeTargetId);
    }
  }

  handleWebContentBack({ webContentRuntime, ui }: WebContentNavigationButtonParams): void {
    if (!webContentRuntime || !window.electronAPI?.webContent) {
      toast.info(ui.toastWebContentBackUnsupported);
      return;
    }

    window.electronAPI.webContent.goBack(this.activeTargetId);
  }

  handleWebContentForward({ webContentRuntime, ui }: WebContentNavigationButtonParams): void {
    if (!webContentRuntime || !window.electronAPI?.webContent) {
      toast.info(ui.toastWebContentForwardUnsupported);
      return;
    }

    window.electronAPI.webContent.goForward(this.activeTargetId);
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
