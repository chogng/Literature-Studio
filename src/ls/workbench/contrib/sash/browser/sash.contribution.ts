import {
  initializeGlobalSashStyles,
} from 'ls/base/browser/ui/sash/sash';
import { registerWorkbenchContribution } from 'ls/workbench/contrib/workbench/workbench.contribution';

export function createWorkbenchSashContribution() {
  initializeGlobalSashStyles();

  return {
    dispose: () => {},
  };
}

registerWorkbenchContribution(createWorkbenchSashContribution);
