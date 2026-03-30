//#region --- workbench core
import {
  createWorkbenchContainerStateContribution,
  registerWorkbenchContribution,
  startWorkbenchContributions,
} from 'ls/workbench/browser/workbench.contribution';
import { createWorkbenchPreviewSurfaceContribution } from 'ls/workbench/browser/parts/views/viewService';
//#endregion

//#region --- workbench services
import 'ls/workbench/services/quickAccess/quickAccess.contribution';
//#endregion

//#region --- workbench contributions
registerWorkbenchContribution(createWorkbenchContainerStateContribution);
registerWorkbenchContribution(createWorkbenchPreviewSurfaceContribution);
startWorkbenchContributions();
//#endregion
