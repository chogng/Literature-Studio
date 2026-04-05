//#region --- workbench core
import 'ls/base/browser/ui/button/button.css';
import {
  createWorkbenchContainerStateContribution,
  createWorkbenchDocumentLocaleContribution,
  createWorkbenchServicesLifecycleContribution,
  createWorkbenchStatusbarContribution,
  createWorkbenchTitlebarActionContribution,
  registerWorkbenchContribution,
} from 'ls/workbench/contrib/workbench/workbench.contribution';
import { createWorkbenchWebContentViewContribution } from 'ls/workbench/contrib/webContentView/webContentView.contribution';
//#endregion

//#region --- workbench services
import 'ls/workbench/contrib/localization/localization.contribution';
import 'ls/workbench/contrib/sash/browser/sash.contribution';
//#endregion

//#region --- workbench contributions
registerWorkbenchContribution(createWorkbenchContainerStateContribution);
registerWorkbenchContribution(createWorkbenchDocumentLocaleContribution);
registerWorkbenchContribution(createWorkbenchServicesLifecycleContribution);
registerWorkbenchContribution(createWorkbenchStatusbarContribution);
registerWorkbenchContribution(createWorkbenchTitlebarActionContribution);
registerWorkbenchContribution(createWorkbenchWebContentViewContribution);
//#endregion
