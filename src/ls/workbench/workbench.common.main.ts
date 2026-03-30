//#region --- workbench core
import {
  createWorkbenchContainerStateContribution,
  createWorkbenchDocumentLocaleContribution,
  createWorkbenchServicesLifecycleContribution,
  createWorkbenchStatusbarContribution,
  createWorkbenchTitlebarActionContribution,
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
registerWorkbenchContribution(createWorkbenchDocumentLocaleContribution);
registerWorkbenchContribution(createWorkbenchServicesLifecycleContribution);
registerWorkbenchContribution(createWorkbenchStatusbarContribution);
registerWorkbenchContribution(createWorkbenchTitlebarActionContribution);
registerWorkbenchContribution(createWorkbenchWebContentViewContribution);
startWorkbenchContributions();
//#endregion
