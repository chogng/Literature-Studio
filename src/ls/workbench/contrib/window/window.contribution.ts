import {
  registerWorkbenchWindowControlsProvider,
} from 'ls/workbench/browser/window';

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
