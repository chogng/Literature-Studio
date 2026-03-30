//#region --- workbench core
import {
  createWorkbenchContainerStateContribution,
  registerWorkbenchContribution,
  startWorkbenchContributions,
} from 'ls/workbench/contrib/workbench/workbench.contribution';
import { createWorkbenchWebContentViewContribution } from 'ls/workbench/contrib/webContentView/webContentView.contribution';
//#endregion

//#region --- workbench services
import 'ls/workbench/contrib/quickAccess/quickAccess.contribution';
//#endregion

//#region --- workbench contributions
registerWorkbenchContribution(createWorkbenchContainerStateContribution);
registerWorkbenchContribution(createWorkbenchWebContentViewContribution);
startWorkbenchContributions();
//#endregion
