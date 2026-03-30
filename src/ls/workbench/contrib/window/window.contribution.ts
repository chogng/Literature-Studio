import {
  connectWorkbenchWindowControls,
  registerWorkbenchWindowControlsProvider,
} from 'ls/workbench/browser/window';
import { registerWorkbenchContribution } from '../workbench/workbench.contribution';

registerWorkbenchWindowControlsProvider({
  getState: async () => {
    const controls = window.electronAPI?.windowControls;
    if (!controls) {
      return { isMaximized: false };
    }

    return controls.getState();
  },
  onStateChange: (listener) => {
    const controls = window.electronAPI?.windowControls;
    if (!controls) {
      return () => {};
    }

    return controls.onStateChange(listener);
  },
  perform: (action) => {
    window.electronAPI?.windowControls?.perform(action);
  },
});

registerWorkbenchContribution(() => {
  const electronRuntime =
    typeof window !== 'undefined' &&
    typeof window.electronAPI?.invoke === 'function';

  return {
    dispose: connectWorkbenchWindowControls(electronRuntime),
  };
});
