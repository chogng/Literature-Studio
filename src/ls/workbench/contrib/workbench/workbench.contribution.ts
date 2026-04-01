import {
  getWorkbenchPartDomSnapshot,
  subscribeWorkbenchPartDom,
  WORKBENCH_PART_IDS,
  getWorkbenchLayoutStateSnapshot,
  subscribeWorkbenchLayoutState,
} from 'ls/workbench/browser/layout';
import {
  disposeWorkbenchServices,
  getWorkbenchStateSnapshot,
  subscribeWorkbenchState,
} from 'ls/workbench/browser/workbench';
import {
  localeService,
} from 'ls/workbench/contrib/localization/browser/localeService';
import { getWorkbenchTitlebarCommandHandlers } from 'ls/workbench/browser/titlebarCommands';
import {
  getStatusbarStateSnapshot,
  subscribeStatusbarState,
} from 'ls/workbench/browser/parts/statusbar/statusbarModel';
import { StatusbarPart } from 'ls/workbench/browser/parts/statusbar/statusbarPart';
import { subscribeTitlebarUiActions } from 'ls/workbench/browser/parts/titlebar/titlebarActions';

export type Disposable = {
  dispose: () => void;
};

type WorkbenchContributionFactory = () => Disposable | void;

const workbenchContributionFactories: WorkbenchContributionFactory[] = [];
const activeWorkbenchContributions: Disposable[] = [];
let workbenchContributionsStarted = false;

export function registerWorkbenchContribution(
  contributionFactory: WorkbenchContributionFactory,
) {
  workbenchContributionFactories.push(contributionFactory);

  if (!workbenchContributionsStarted) {
    return;
  }

  const contribution = contributionFactory();
  if (contribution) {
    activeWorkbenchContributions.push(contribution);
  }
}

export function startWorkbenchContributions() {
  if (workbenchContributionsStarted) {
    return;
  }

  workbenchContributionsStarted = true;

  for (const contributionFactory of workbenchContributionFactories) {
    const contribution = contributionFactory();
    if (contribution) {
      activeWorkbenchContributions.push(contribution);
    }
  }
}

export function stopWorkbenchContributions() {
  while (activeWorkbenchContributions.length > 0) {
    activeWorkbenchContributions.pop()?.dispose();
  }

  workbenchContributionsStarted = false;
}

export function createWorkbenchContainerStateContribution(): Disposable {
  let lastContainer: HTMLElement | null = null;

  const clearContainerState = (container: HTMLElement | null) => {
    if (!container) {
      return;
    }

    delete container.dataset.workbenchPage;
    delete container.dataset.sidebarVisible;
    delete container.dataset.auxiliarySidebarVisible;
    delete container.dataset.activeSidebarKind;
    delete container.dataset.workbenchParts;
  };

  const syncContainerState = () => {
    const workbenchPartDomSnapshot = getWorkbenchPartDomSnapshot();
    const nextContainer = workbenchPartDomSnapshot[WORKBENCH_PART_IDS.container];
    if (lastContainer && lastContainer !== nextContainer) {
      clearContainerState(lastContainer);
    }

    lastContainer = nextContainer;
    if (!lastContainer) {
      return;
    }

    const registeredPartIds = Object.entries(workbenchPartDomSnapshot)
      .filter(([, element]) => Boolean(element))
      .map(([partId]) => partId)
      .join(' ');

    lastContainer.dataset.workbenchPage = getWorkbenchStateSnapshot().activePage;
    lastContainer.dataset.sidebarVisible = String(
      getWorkbenchLayoutStateSnapshot().isSidebarVisible,
    );
    lastContainer.dataset.auxiliarySidebarVisible = String(
      getWorkbenchLayoutStateSnapshot().isAuxiliarySidebarVisible,
    );
    lastContainer.dataset.activeSidebarKind =
      getWorkbenchLayoutStateSnapshot().activeSidebarKind;
    lastContainer.dataset.workbenchParts = registeredPartIds;
  };

  const unsubscribeWorkbenchState = subscribeWorkbenchState(syncContainerState);
  const unsubscribeWorkbenchLayoutState =
    subscribeWorkbenchLayoutState(syncContainerState);
  const unsubscribeWorkbenchPartDom = subscribeWorkbenchPartDom(syncContainerState);

  syncContainerState();

  return {
    dispose: () => {
      unsubscribeWorkbenchState();
      unsubscribeWorkbenchLayoutState();
      unsubscribeWorkbenchPartDom();
      clearContainerState(lastContainer);
      lastContainer = null;
    },
  };
}

export function createWorkbenchStatusbarContribution(): Disposable {
  let currentHost: HTMLElement | null = null;
  let statusbarPart: StatusbarPart | null = null;

  const disposeStatusbarPart = () => {
    statusbarPart?.dispose();
    statusbarPart = null;
  };

  const syncStatusbarPart = () => {
    const nextHost = getWorkbenchPartDomSnapshot()[WORKBENCH_PART_IDS.statusbar];

    if (currentHost !== nextHost) {
      disposeStatusbarPart();
      currentHost = nextHost;
    }

    if (!currentHost) {
      return;
    }

    if (!statusbarPart) {
      statusbarPart = new StatusbarPart(currentHost);
    }

    statusbarPart.render(getStatusbarStateSnapshot());
  };

  const unsubscribeWorkbenchPartDom = subscribeWorkbenchPartDom(syncStatusbarPart);
  const unsubscribeStatusbarState = subscribeStatusbarState(syncStatusbarPart);

  syncStatusbarPart();

  return {
    dispose: () => {
      unsubscribeWorkbenchPartDom();
      unsubscribeStatusbarState();
      disposeStatusbarPart();
      currentHost = null;
    },
  };
}

export function createWorkbenchDocumentLocaleContribution(): Disposable {
  const syncLocale = () => {
    localeService.syncDocumentLanguage();
  };

  const unsubscribeWorkbenchLocale = localeService.subscribe(syncLocale);
  syncLocale();

  return {
    dispose: () => {
      unsubscribeWorkbenchLocale();
    },
  };
}

export function createWorkbenchTitlebarActionContribution(): Disposable {
  const unsubscribeTitlebarUiActions = subscribeTitlebarUiActions((action) => {
    const handlers = getWorkbenchTitlebarCommandHandlers();
    if (!handlers) {
      return;
    }

    if (action.type === 'TOGGLE_SIDEBAR') {
      handlers.onToggleSidebar();
      return;
    }

    if (action.type === 'TOGGLE_AUXILIARY_SIDEBAR') {
      handlers.onToggleAuxiliarySidebar();
      return;
    }

    if (action.type === 'NAVIGATE_BACK') {
      handlers.onNavigateBack();
      return;
    }

    if (action.type === 'NAVIGATE_FORWARD') {
      handlers.onNavigateForward();
      return;
    }

    if (action.type === 'NAVIGATE_WEB') {
      handlers.onNavigateWeb();
      return;
    }

    if (action.type === 'TOGGLE_SETTINGS') {
      handlers.onToggleSettings();
      return;
    }

    if (action.type === 'EXPORT_DOCX') {
      handlers.onExportDocx();
    }
  });

  return {
    dispose: () => {
      unsubscribeTitlebarUiActions();
    },
  };
}

export function createWorkbenchServicesLifecycleContribution(): Disposable {
  return {
    dispose: () => {
      disposeWorkbenchServices();
    },
  };
}
