import { useCallback, useEffect, useSyncExternalStore } from 'react';

export type WorkbenchWindowControlAction = 'minimize' | 'toggle-maximize' | 'close';

type UseWindowControlsParams = {
  electronRuntime: boolean;
};

type WindowStateSnapshot = {
  isMaximized: boolean;
};

const DEFAULT_WINDOW_STATE: WindowStateSnapshot = {
  isMaximized: false,
};

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
    if (!electronRuntime || !window.electronAPI?.windowControls) {
      setWindowState(DEFAULT_WINDOW_STATE);
      return;
    }

    let mounted = true;
    const controls = window.electronAPI.windowControls;

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
    window.electronAPI?.windowControls?.perform(action);
  }, []);

  return {
    isWindowMaximized: windowState.isMaximized,
    handleWindowControl,
  };
}
