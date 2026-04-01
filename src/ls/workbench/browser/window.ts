import type {
  WindowControlAction,
  WindowState,
  WindowStateListener,
} from 'ls/base/parts/sandbox/common/desktopTypes.js';

export type WorkbenchWindowControlAction = 'minimize' | 'toggle-maximize' | 'close';

type WindowStateSnapshot = {
  isMaximized: boolean;
};

type WorkbenchWindowControlsProvider = {
  getState: () => Promise<WindowState>;
  onStateChange: (listener: WindowStateListener) => () => void;
  perform: (action: WindowControlAction) => void;
};

const DEFAULT_WINDOW_STATE: WindowStateSnapshot = {
  isMaximized: false,
};

let workbenchWindowControlsProvider: WorkbenchWindowControlsProvider | null = null;

let windowStateSnapshot = DEFAULT_WINDOW_STATE;
const windowStateListeners = new Set<() => void>();

function setWindowState(nextState: WindowStateSnapshot) {
  if (Object.is(windowStateSnapshot, nextState)) {
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

export function connectWorkbenchWindowControls(electronRuntime: boolean) {
  const controls = electronRuntime ? getWorkbenchWindowControlsProvider() : null;
  if (!controls) {
    setWindowState(DEFAULT_WINDOW_STATE);
    return () => {};
  }

  let mounted = true;

  void controls
    .getState()
    .then((state) => {
      if (mounted) {
        setWindowState({
          isMaximized: Boolean(state.isMaximized),
        });
      }
    })
    .catch(() => {
      if (mounted) {
        setWindowState(DEFAULT_WINDOW_STATE);
      }
    });

  const unsubscribe = controls.onStateChange((state) => {
    setWindowState({
      isMaximized: Boolean(state.isMaximized),
    });
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
