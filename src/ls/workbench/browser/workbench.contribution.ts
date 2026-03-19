import {
  getWorkbenchPartDomSnapshot,
  subscribeWorkbenchPartDom,
  WORKBENCH_PART_IDS,
  getWorkbenchLayoutStateSnapshot,
  subscribeWorkbenchLayoutState,
} from './layout';
import {
  getWorkbenchStateSnapshot,
  subscribeWorkbenchState,
} from './workbench';

type Disposable = {
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

function createWorkbenchContainerStateContribution(): Disposable {
  let lastContainer: HTMLElement | null = null;

  const clearContainerState = (container: HTMLElement | null) => {
    if (!container) {
      return;
    }

    delete container.dataset.workbenchPage;
    delete container.dataset.sidebarVisible;
    delete container.dataset.workbenchParts;
  };

  // Keep container DOM state synchronized outside React so future parts can observe workbench state from one place.
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

registerWorkbenchContribution(createWorkbenchContainerStateContribution);
startWorkbenchContributions();
