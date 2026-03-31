import {
  connectWorkbenchWindowControls,
  registerWorkbenchWindowControlsProvider,
} from 'ls/workbench/browser/window';
import { hasDesktopRuntime } from 'ls/base/common/platform';
import { nativeHostService } from 'ls/platform/native/browser/nativeHostService';
import { registerWorkbenchContribution } from '../workbench/workbench.contribution';

registerWorkbenchWindowControlsProvider({
  getState: async () => {
    const controls = nativeHostService.windowControls;
    if (!controls) {
      return { isMaximized: false };
    }

    return controls.getState();
  },
  onStateChange: (listener) => {
    const controls = nativeHostService.windowControls;
    if (!controls) {
      return () => {};
    }

    return controls.onStateChange(listener);
  },
  perform: (action) => {
    nativeHostService.windowControls?.perform(action);
  },
});

registerWorkbenchContribution(() => {
  return {
    dispose: connectWorkbenchWindowControls(hasDesktopRuntime()),
  };
});
