import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { createStore } from '../../base/common/store';

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

const windowStateStore = createStore(DEFAULT_WINDOW_STATE);

export const subscribeWindowState = windowStateStore.subscribe;
export const getWindowStateSnapshot = windowStateStore.getSnapshot;

export function useWindowControls({ electronRuntime }: UseWindowControlsParams) {
  const windowState = useSyncExternalStore(
    subscribeWindowState,
    getWindowStateSnapshot,
    getWindowStateSnapshot,
  );

  useEffect(() => {
    if (!electronRuntime || !window.electronAPI?.windowControls) {
      windowStateStore.setState(DEFAULT_WINDOW_STATE);
      return;
    }

    let mounted = true;
    const controls = window.electronAPI.windowControls;

    void controls
      .getState()
      .then((state) => {
        if (mounted) {
          windowStateStore.setState({
            isMaximized: Boolean(state.isMaximized),
          });
        }
      })
      .catch(() => {
        if (mounted) {
          windowStateStore.setState(DEFAULT_WINDOW_STATE);
        }
      });

    const unsubscribe = controls.onStateChange((state) => {
      windowStateStore.setState({
        isMaximized: Boolean(state.isMaximized),
      });
    });

    return () => {
      mounted = false;
      unsubscribe();
      windowStateStore.setState(DEFAULT_WINDOW_STATE);
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
