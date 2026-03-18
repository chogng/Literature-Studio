import { useCallback, useEffect, useState } from 'react';

export type WindowControlAction = 'minimize' | 'toggle-maximize' | 'close';

type UseWindowControlsParams = {
  electronRuntime: boolean;
};

export function useWindowControls({ electronRuntime }: UseWindowControlsParams) {
  const [isWindowMaximized, setIsWindowMaximized] = useState(false);

  useEffect(() => {
    if (!electronRuntime || !window.electronAPI?.windowControls) {
      setIsWindowMaximized(false);
      return;
    }

    let mounted = true;
    const controls = window.electronAPI.windowControls;

    void controls
      .getState()
      .then((state) => {
        if (mounted) {
          setIsWindowMaximized(Boolean(state.isMaximized));
        }
      })
      .catch(() => {
        if (mounted) {
          setIsWindowMaximized(false);
        }
      });

    const unsubscribe = controls.onStateChange((state) => {
      setIsWindowMaximized(Boolean(state.isMaximized));
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [electronRuntime]);

  const handleWindowControl = useCallback((action: WindowControlAction) => {
    window.electronAPI?.windowControls?.perform(action);
  }, []);

  return {
    isWindowMaximized,
    handleWindowControl,
  };
}
