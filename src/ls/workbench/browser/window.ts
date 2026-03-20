import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type {
  WindowControlAction,
  WindowState,
  WindowStateListener,
} from '../../base/parts/sandbox/common/desktopTypes.js';

export type WorkbenchWindowControlAction = 'minimize' | 'toggle-maximize' | 'close';

type UseWindowControlsParams = {
  electronRuntime: boolean;
};

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

export function useWindowControls({ electronRuntime }: UseWindowControlsParams) {
  const windowState = useSyncExternalStore(
    subscribeWindowState,
    getWindowStateSnapshot,
    getWindowStateSnapshot,
  );

  useEffect(() => {
    const controls = electronRuntime ? getWorkbenchWindowControlsProvider() : null;
    if (!controls) {
      setWindowState(DEFAULT_WINDOW_STATE);
      return;
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
  }, [electronRuntime]);

  const handleWindowControl = useCallback((action: WorkbenchWindowControlAction) => {
    getWorkbenchWindowControlsProvider()?.perform(action);
  }, []);

  return {
    isWindowMaximized: windowState.isMaximized,
    handleWindowControl,
  };
}
