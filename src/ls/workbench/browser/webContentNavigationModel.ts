import { toast } from 'ls/base/browser/ui/toast/toast';
import { EventEmitter } from 'ls/base/common/event';
import type { LocaleMessages } from 'language/locales';
import { nativeHostService } from 'ls/platform/native/electron-sandbox/nativeHostService';
import type { BatchSource } from 'ls/workbench/services/config/configSchema';
import { formatLocalized } from 'ls/workbench/services/desktop/desktopError';
import { EMPTY_WEB_CONTENT_STATE, resolveWebContentNavigation, resolveWebContentRefreshMode, resolveWebContentStateUrlUpdate } from 'ls/workbench/services/webContent/webContentNavigationService';
import type { WebContentState } from 'ls/workbench/services/webContent/webContentNavigationService';

import type {
  QuickAccessCycleDirection,
  QuickAccessSourceOption,
} from 'ls/workbench/services/quickAccess/quickAccessService';

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

function isSameWebContentTargetId(left: string | null, right: string | null) {
  return (left ?? null) === (right ?? null);
}

function isStateForActiveTarget(
  state: WebContentState,
  activeTargetId: string | null,
) {
  return (
    state.ownership === 'active' &&
    isSameWebContentTargetId(state.activeTargetId, activeTargetId) &&
    isSameWebContentTargetId(state.targetId, activeTargetId)
  );
}

function areWebContentStatesEqual(previous: WebContentState, next: WebContentState) {
  return (
    previous.targetId === next.targetId &&
    previous.activeTargetId === next.activeTargetId &&
    previous.ownership === next.ownership &&
    previous.layoutPhase === next.layoutPhase &&
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
    return {
      applyUrlInput: (nextUrl, setWebUrl, setFetchSeedUrl) => {
        const normalized = nextUrl.trim();
        setWebUrl(normalized);
        setFetchSeedUrl(normalized);
      },
      createSourceOptions: () => [],
      findSourceOption: () => undefined,
      resolveNextSourceOption: () => null,
      resolveSourceId: () => '',
    };
  }

  return webContentNavigationQuickAccessProvider;
}

export class WebContentNavigationModel {
  private snapshot: WebContentNavigationSnapshot = DEFAULT_WEB_CONTENT_NAVIGATION_SNAPSHOT;
  private readonly onDidChangeEmitter = new EventEmitter<void>();
  private activeTargetId: string | null = null;

  private emitChange() {
    this.onDidChangeEmitter.fire();
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
    return this.onDidChangeEmitter.event(listener);
  };

  readonly getSnapshot = () => this.snapshot;

  async activateTarget(
    targetId: string | null,
    context?: Pick<WebContentStateSyncContext, 'setWebUrl' | 'setFetchSeedUrl'>,
  ) {
    this.activeTargetId = targetId;
    const requestedTargetId = targetId;

    const webContent = nativeHostService.webContent;
    if (!webContent) {
      return null;
    }

    if (!targetId) {
      this.setWebContentState(EMPTY_WEB_CONTENT_STATE);
      return null;
    }

    webContent.activate(targetId);

    if (!context) {
      return null;
    }

    try {
      const state = await webContent.getState(targetId);
      if (
        !isSameWebContentTargetId(this.activeTargetId, requestedTargetId) ||
        !isStateForActiveTarget(state, requestedTargetId)
      ) {
        return null;
      }
      this.applyWebContentState(state, context);
      return state;
    } catch {
      return null;
    }
  }

  releaseTarget(targetId: string | null) {
    const webContent = nativeHostService.webContent;
    if (!webContent) {
      return;
    }

    webContent.release(targetId);
  }

  connectWebContentState({
    webContentRuntime,
    setWebUrl,
    setFetchSeedUrl,
  }: WebContentStateSyncContext): () => void {
    const webContent = nativeHostService.webContent;
    if (!webContentRuntime || !webContent) {
      this.setWebContentState(EMPTY_WEB_CONTENT_STATE);
      return () => {};
    }

    let mounted = true;
    const requestedTargetId = this.activeTargetId;

    void webContent
      .getState(requestedTargetId)
      .then((state) => {
        if (
          !mounted ||
          !isSameWebContentTargetId(this.activeTargetId, requestedTargetId) ||
          !isStateForActiveTarget(state, requestedTargetId)
        ) {
          return;
        }

        this.applyWebContentState(state, {
          setWebUrl,
          setFetchSeedUrl,
        });
      })
      .catch(() => {});

    const unsubscribe = webContent.onStateChange((state) => {
      if (!isStateForActiveTarget(state, this.activeTargetId)) {
        return;
      }
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

    const webContent = nativeHostService.webContent;
    if (webContentNavigation.kind === 'webcontents-content' && webContent) {
      void webContent
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

    const webContent = nativeHostService.webContent;
    if (webContentRefreshMode === 'webcontents-content' && webContent) {
      webContent.reload(this.activeTargetId);
    }
  }

  handleBrowserHardReload({
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

    const webContent = nativeHostService.webContent;
    if (webContentRefreshMode === 'webcontents-content' && webContent) {
      webContent.hardReload(this.activeTargetId);
    }
  }

  handleWebContentBack({ webContentRuntime, ui }: WebContentNavigationButtonParams): void {
    const webContent = nativeHostService.webContent;
    if (!webContentRuntime || !webContent) {
      toast.info(ui.toastWebContentBackUnsupported);
      return;
    }

    webContent.goBack(this.activeTargetId);
  }

  handleWebContentForward({ webContentRuntime, ui }: WebContentNavigationButtonParams): void {
    const webContent = nativeHostService.webContent;
    if (!webContentRuntime || !webContent) {
      toast.info(ui.toastWebContentForwardUnsupported);
      return;
    }

    webContent.goForward(this.activeTargetId);
  }

  handleWebContentClearHistory({ webContentRuntime, ui }: WebContentNavigationButtonParams): void {
    const webContent = nativeHostService.webContent;
    if (!webContentRuntime || !webContent) {
      toast.error(ui.toastWebContentRuntimeUnavailable);
      return;
    }

    webContent.clearHistory(this.activeTargetId);
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
