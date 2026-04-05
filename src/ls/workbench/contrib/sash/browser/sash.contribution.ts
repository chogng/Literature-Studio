import {
  resetGlobalSashSize,
  syncGlobalSashSizeFromCss,
} from 'ls/base/browser/ui/sash/sash';
import { registerWorkbenchContribution } from 'ls/workbench/contrib/workbench/workbench.contribution';

export function createWorkbenchSashContribution() {
  syncGlobalSashSizeFromCss();

  return {
    dispose: () => {
      resetGlobalSashSize();
    },
  };
}

registerWorkbenchContribution(createWorkbenchSashContribution);
