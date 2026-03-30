import type { Article } from "../services/article/articleFetch";

export type SelectionModePhase = "off" | "multi" | "all";

export type WorkbenchSessionSnapshot = {
  webUrl: string;
  fetchSeedUrl: string;
  articles: Article[];
  selectionModePhase: SelectionModePhase;
  selectedArticleKeysInOrder: string[];
};

const DEFAULT_WORKBENCH_SESSION: WorkbenchSessionSnapshot = {
  webUrl: "",
  fetchSeedUrl: "",
  articles: [],
  selectionModePhase: "off",
  selectedArticleKeysInOrder: [],
};

let workbenchSessionState = DEFAULT_WORKBENCH_SESSION;
const workbenchSessionListeners = new Set<() => void>();

function emitWorkbenchSessionChange() {
  for (const listener of workbenchSessionListeners) {
    listener();
  }
}

function updateWorkbenchSessionState(
  reducer: (current: WorkbenchSessionSnapshot) => WorkbenchSessionSnapshot,
) {
  const nextState = reducer(workbenchSessionState);
  if (Object.is(nextState, workbenchSessionState)) {
    return;
  }

  workbenchSessionState = nextState;
  emitWorkbenchSessionChange();
}

export function subscribeWorkbenchSession(listener: () => void) {
  workbenchSessionListeners.add(listener);
  return () => {
    workbenchSessionListeners.delete(listener);
  };
}

export function getWorkbenchSessionSnapshot() {
  return workbenchSessionState;
}

export function setWorkbenchWebUrl(webUrl: string) {
  updateWorkbenchSessionState((current) =>
    current.webUrl === webUrl ? current : { ...current, webUrl },
  );
}

export function setWorkbenchFetchSeedUrl(
  fetchSeedUrl: string | ((current: string) => string),
) {
  updateWorkbenchSessionState((current) => {
    const nextFetchSeedUrl =
      typeof fetchSeedUrl === "function"
        ? fetchSeedUrl(current.fetchSeedUrl)
        : fetchSeedUrl;

    return current.fetchSeedUrl === nextFetchSeedUrl
      ? current
      : { ...current, fetchSeedUrl: nextFetchSeedUrl };
  });
}

export function setWorkbenchArticles(articles: Article[]) {
  updateWorkbenchSessionState((current) =>
    Object.is(current.articles, articles) ? current : { ...current, articles },
  );
}

export function setWorkbenchSelectionModePhase(
  selectionModePhase: SelectionModePhase,
) {
  updateWorkbenchSessionState((current) =>
    current.selectionModePhase === selectionModePhase
      ? current
      : { ...current, selectionModePhase },
  );
}

export function setWorkbenchSelectedArticleKeysInOrder(
  selectedArticleKeysInOrder: string[] | ((current: string[]) => string[]),
) {
  updateWorkbenchSessionState((current) => {
    const nextSelectedArticleKeysInOrder =
      typeof selectedArticleKeysInOrder === "function"
        ? selectedArticleKeysInOrder(current.selectedArticleKeysInOrder)
        : selectedArticleKeysInOrder;

    return Object.is(
      current.selectedArticleKeysInOrder,
      nextSelectedArticleKeysInOrder,
    )
      ? current
      : {
          ...current,
          selectedArticleKeysInOrder: nextSelectedArticleKeysInOrder,
        };
  });
}
