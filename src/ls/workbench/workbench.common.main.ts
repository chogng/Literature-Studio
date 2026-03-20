//#region --- workbench core
import {
  createWorkbenchContainerStateContribution,
  registerWorkbenchContribution,
  startWorkbenchContributions,
} from 'ls/workbench/browser/workbench.contribution';
//#endregion

//#region --- workbench services
import 'ls/workbench/services/quickAccess/quickAccess.contribution';
//#endregion

//#region --- workbench contributions
registerWorkbenchContribution(createWorkbenchContainerStateContribution);
startWorkbenchContributions();
//#endregion
