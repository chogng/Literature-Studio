import type {
  WindowControlAction,
  WindowState,
  WindowStateListener,
} from 'ls/base/parts/sandbox/common/desktopTypes';

export type WorkbenchWindowControlAction = 'minimize' | 'toggle-maximize' | 'close';

type WindowStateSnapshot = {
  isMaximized: boolean;
  isFullscreen: boolean;
};

type WorkbenchWindowControlsProvider = {
  getState: () => Promise<WindowState>;
  onStateChange: (listener: WindowStateListener) => () => void;
  perform: (action: WindowControlAction) => void;
};

const DEFAULT_WINDOW_STATE: WindowStateSnapshot = {
  isMaximized: false,
  isFullscreen: false,
};

let workbenchWindowControlsProvider: WorkbenchWindowControlsProvider | null = null;

let windowStateSnapshot = DEFAULT_WINDOW_STATE;
const windowStateListeners = new Set<() => void>();

function setWindowState(nextState: WindowStateSnapshot) {
  if (
    windowStateSnapshot.isMaximized === nextState.isMaximized &&
    windowStateSnapshot.isFullscreen === nextState.isFullscreen
  ) {
    return;
  }

  windowStateSnapshot = nextState;
  for (const listener of windowStateListeners) {
    listener();
  }
}

export function registerWorkbenchWindowControlsProvider(
  provider: WorkbenchWindowControlsProvider,
) {
  workbenchWindowControlsProvider = provider;
}

export function getWorkbenchWindowControlsProvider() {
  return workbenchWindowControlsProvider;
}

export function hasWorkbenchWindowControlsProvider() {
  return Boolean(workbenchWindowControlsProvider);
}

export function subscribeWindowState(listener: () => void) {
  windowStateListeners.add(listener);
  return () => {
    windowStateListeners.delete(listener);
  };
}

export function getWindowStateSnapshot() {
  return windowStateSnapshot;
}

function normalizeWindowState(state: Partial<WindowStateSnapshot> | null | undefined) {
  return {
    isMaximized: Boolean(state?.isMaximized),
    isFullscreen: Boolean(state?.isFullscreen),
  } satisfies WindowStateSnapshot;
}

function getNavigatorPlatform() {
  if (typeof navigator === 'undefined') {
    return '';
  }

  return String(navigator.platform ?? '').toLowerCase();
}

function detectBrowserFullscreen() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const fullscreenDocument = document as Document & {
    webkitFullscreenElement?: Element | null;
    webkitIsFullScreen?: boolean;
  };

  if (
    fullscreenDocument.fullscreenElement ||
    fullscreenDocument.webkitFullscreenElement ||
    fullscreenDocument.webkitIsFullScreen
  ) {
    return true;
  }

  if (typeof screen === 'undefined') {
    return false;
  }

  if (window.innerHeight === screen.height) {
    return true;
  }

  const navigatorPlatform = getNavigatorPlatform();
  const isMacOrLinux =
    navigatorPlatform.includes('mac') ||
    navigatorPlatform.includes('linux') ||
    navigatorPlatform.includes('x11');

  return (
    isMacOrLinux &&
    window.outerHeight === screen.height &&
    window.outerWidth === screen.width
  );
}

export function connectWorkbenchWindowControls(electronRuntime: boolean) {
  const controls = electronRuntime ? getWorkbenchWindowControlsProvider() : null;
  if (!controls) {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      setWindowState(DEFAULT_WINDOW_STATE);
      return () => {};
    }

    const syncBrowserWindowState = () => {
      setWindowState({
        ...DEFAULT_WINDOW_STATE,
        isFullscreen: detectBrowserFullscreen(),
      });
    };

    syncBrowserWindowState();
    document.addEventListener('fullscreenchange', syncBrowserWindowState);
    document.addEventListener('webkitfullscreenchange', syncBrowserWindowState);
    window.addEventListener('resize', syncBrowserWindowState);

    return () => {
      document.removeEventListener('fullscreenchange', syncBrowserWindowState);
      document.removeEventListener('webkitfullscreenchange', syncBrowserWindowState);
      window.removeEventListener('resize', syncBrowserWindowState);
      setWindowState(DEFAULT_WINDOW_STATE);
    };
  }

  let mounted = true;

  void controls
    .getState()
    .then((state) => {
      if (mounted) {
        setWindowState(normalizeWindowState(state));
      }
    })
    .catch(() => {
      if (mounted) {
        setWindowState(DEFAULT_WINDOW_STATE);
      }
    });

  const unsubscribe = controls.onStateChange((state) => {
    setWindowState(normalizeWindowState(state));
  });

  return () => {
    mounted = false;
    unsubscribe();
    setWindowState(DEFAULT_WINDOW_STATE);
  };
}

export function performWorkbenchWindowControl(action: WorkbenchWindowControlAction) {
  getWorkbenchWindowControlsProvider()?.perform(action);
}
