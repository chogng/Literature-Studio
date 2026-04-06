import { createEmptyWritingEditorDocument, normalizeWritingEditorDocument } from 'ls/editor/common/writingEditorDocument';
import type { WritingEditorDocument } from 'ls/editor/common/writingEditorDocument';

import {
  createWritingBrowserEditorInput,
  createWritingDraftEditorInput,
  createWritingPdfEditorInput,
  getWritingContentInputTitle,
  isWritingBrowserEditorInput,
  isWritingDraftEditorInput,
  isWritingPdfEditorInput,
  normalizeWritingEditorInput,
  toWritingEditorInput,
} from 'ls/workbench/browser/editorInput';
import { createWritingLiveDraftState } from 'ls/workbench/browser/writingEditorLiveState';
import {
  createWritingEditorStorage,
} from 'ls/workbench/browser/writingEditorStorage';
import type { StoredWritingWorkspaceState } from 'ls/workbench/browser/writingEditorStorage';
import {
  createEditorGroupId,
  DEFAULT_EDITOR_GROUP_ID,
  normalizeEditorGroupId,
} from 'ls/workbench/browser/editorGroupIdentity';
import {
  normalizeSerializedEditorViewStateEntries,
} from 'ls/workbench/browser/parts/editor/editorViewStateStore';
import type {
  EditorViewStateKey,
  SerializedEditorViewStateEntry,
} from 'ls/workbench/browser/parts/editor/editorViewStateStore';

export type { WritingEditorDocument } from 'ls/editor/common/writingEditorDocument';
export type {
  WritingDraftEditorInput,
  WritingEditorInput,
  WritingEditorViewMode,
} from 'ls/workbench/browser/editorInput';
import type {
  WritingBrowserEditorInput,
  WritingDraftEditorInput,
  WritingEditorInput,
  WritingPdfEditorInput,
} from 'ls/workbench/browser/editorInput';

// Content tabs only store editor input metadata. The active content tab temporarily owns one shared
// web-content surface instead of spawning a dedicated browser/view instance per tab.
export type WritingWorkspaceDraftTab = WritingDraftEditorInput & {
  document: WritingEditorDocument;
};

export type WritingWorkspaceBrowserTab = WritingBrowserEditorInput;
export type WritingWorkspacePdfTab = WritingPdfEditorInput;
export type WritingWorkspaceContentTab =
  | WritingWorkspaceBrowserTab
  | WritingWorkspacePdfTab;

export type WritingWorkspaceTab =
  | WritingWorkspaceDraftTab
  | WritingWorkspaceContentTab;

export type WritingEditorGroupState = {
  groupId: string;
  tabs: WritingWorkspaceTab[];
  activeTabId: string | null;
  mruTabIds: string[];
};

export type WritingWorkspaceState = {
  groups: WritingEditorGroupState[];
  activeGroupId: string | null;
  viewStateEntries: SerializedEditorViewStateEntry[];
};

export type WritingEditorModelSnapshot = {
  groups: WritingEditorGroupState[];
  activeGroupId: string;
  groupId: string;
  tabs: WritingWorkspaceTab[];
  activeTabId: string | null;
  mruTabIds: string[];
  activeTab: WritingWorkspaceTab | null;
  viewStateEntries: SerializedEditorViewStateEntry[];
};

export type WritingEditorGroupTarget = {
  groupId?: string;
  activateGroup?: boolean;
};

type WritingEditorModelListener = () => void;

type ResolvedWritingEditorGroupTarget = {
  groupId: string;
  activateGroup: boolean;
};

function createDraftTab(
  initial?: Partial<Pick<WritingWorkspaceDraftTab, 'id' | 'title' | 'document' | 'viewMode'>>,
): WritingWorkspaceDraftTab {
  return {
    ...createWritingDraftEditorInput({
      id: initial?.id,
      title: initial?.title,
      viewMode: initial?.viewMode,
    }),
    document: normalizeWritingEditorDocument(
      initial?.document ?? createEmptyWritingEditorDocument(),
    ),
  };
}

function createNormalizedDocumentKey(document: WritingEditorDocument) {
  return JSON.stringify(normalizeWritingEditorDocument(document));
}

function createBrowserTab(
  url: string,
  initial?: Partial<Pick<WritingBrowserEditorInput, 'id' | 'title'>>,
): WritingBrowserEditorInput {
  return createWritingBrowserEditorInput(url, initial);
}

function createPdfTab(
  url: string,
  initial?: Partial<Pick<WritingPdfEditorInput, 'id' | 'title'>>,
): WritingPdfEditorInput {
  return createWritingPdfEditorInput(url, initial);
}

function normalizeWorkspaceTab(value: unknown): WritingWorkspaceTab | null {
  const candidate = value as Partial<WritingWorkspaceDraftTab> | null | undefined;
  const normalizedInput = normalizeWritingEditorInput(value);
  if (!candidate || typeof candidate !== 'object' || !normalizedInput) {
    return null;
  }

  if (isWritingDraftEditorInput(normalizedInput)) {
    return createDraftTab({
      id: normalizedInput.id,
      title: normalizedInput.title,
      document: candidate.document,
      viewMode: normalizedInput.viewMode,
    });
  }

  return normalizedInput;
}

function normalizeEditorGroupState(
  state: WritingEditorGroupState,
): WritingEditorGroupState {
  const normalizedGroupId = normalizeEditorGroupId(state.groupId);
  const tabs = state.tabs;
  const tabIdSet = new Set(tabs.map((tab) => tab.id));
  const normalizedMruTabIds = toUniqueIds(
    [...state.mruTabIds, ...tabs.map((tab) => tab.id)].filter((tabId) =>
      tabIdSet.has(tabId),
    ),
  );

  const activeTabId =
    state.activeTabId && tabIdSet.has(state.activeTabId)
      ? state.activeTabId
      : normalizedMruTabIds[0] ?? tabs[0]?.id ?? null;

  return {
    groupId: normalizedGroupId,
    tabs,
    activeTabId,
    mruTabIds: activeTabId
      ? touchMruTab(normalizedMruTabIds, activeTabId)
      : normalizedMruTabIds,
  };
}

type StoredDraftState = Partial<
  Pick<WritingWorkspaceDraftTab, 'title' | 'document' | 'viewMode'>
>;

function normalizeStoredDraftState(value: unknown): StoredDraftState | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<WritingWorkspaceDraftTab>;
  return {
    title: typeof candidate.title === 'string' ? candidate.title : undefined,
    document: candidate.document,
    viewMode: candidate.viewMode === 'draft' ? candidate.viewMode : undefined,
  };
}

function normalizeStoredDraftStateByInputId(
  value: StoredWritingWorkspaceState['draftStateByInputId'],
) {
  if (!value || typeof value !== 'object') {
    return {} as Record<string, StoredDraftState>;
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([tabId, draftState]) => {
      const normalizedDraftState = normalizeStoredDraftState(draftState);
      return normalizedDraftState ? [[tabId, normalizedDraftState]] : [];
    }),
  ) as Record<string, StoredDraftState>;
}

function createWorkspaceTabFromStoredInput(
  input: WritingEditorInput,
  draftStateByInputId: Record<string, StoredDraftState>,
): WritingWorkspaceTab {
  if (isWritingDraftEditorInput(input)) {
    const draftState = draftStateByInputId[input.id];
    return createDraftTab({
      id: input.id,
      title: draftState?.title ?? input.title,
      document: draftState?.document,
      viewMode: draftState?.viewMode ?? input.viewMode,
    });
  }

  return input;
}

function toUniqueIds(values: ReadonlyArray<string>) {
  return Array.from(new Set(values));
}

function touchMruTab(mruTabIds: ReadonlyArray<string>, tabId: string) {
  return [tabId, ...mruTabIds.filter((value) => value !== tabId)];
}

function createEmptyEditorGroupState(groupId: string): WritingEditorGroupState {
  return {
    groupId: normalizeEditorGroupId(groupId),
    tabs: [],
    activeTabId: null,
    mruTabIds: [],
  };
}

function ensureWorkspaceGroup(
  workspaceState: WritingWorkspaceState,
  groupId: string,
): WritingWorkspaceState {
  const normalizedGroupId = normalizeEditorGroupId(groupId);
  if (workspaceState.groups.some((group) => group.groupId === normalizedGroupId)) {
    return workspaceState;
  }

  return {
    ...workspaceState,
    groups: [...workspaceState.groups, createEmptyEditorGroupState(normalizedGroupId)],
  };
}

function normalizeWorkspaceState(
  state: WritingWorkspaceState,
): WritingWorkspaceState {
  const normalizedGroups = toUniqueIds(
    state.groups.map((group) => normalizeEditorGroupId(group.groupId)),
  ).map((groupId) =>
    normalizeEditorGroupState(
      state.groups.find((group) => normalizeEditorGroupId(group.groupId) === groupId) ??
        createEmptyEditorGroupState(groupId),
    ),
  );
  const groups =
    normalizedGroups.length > 0
      ? normalizedGroups
      : [
          normalizeEditorGroupState(createEmptyEditorGroupState(DEFAULT_EDITOR_GROUP_ID)),
        ];
  const activeGroupId = groups.some((group) => group.groupId === state.activeGroupId)
    ? (state.activeGroupId as string)
    : groups[0].groupId;
  const groupIdSet = new Set(groups.map((group) => group.groupId));

  return {
    groups,
    activeGroupId,
    viewStateEntries: normalizeSerializedEditorViewStateEntries(
      state.viewStateEntries,
    ).filter((entry) => groupIdSet.has(entry.key.groupId)),
  };
}

function migrateLegacyWorkspaceState(
  storage = createWritingEditorStorage(),
): WritingWorkspaceState {
  const legacyDraftState = storage.readLegacyDraftState();
  const initialDraftTab = createDraftTab({
    title: legacyDraftState.title,
    document: legacyDraftState.document,
    viewMode: legacyDraftState.viewMode,
  });

  return {
    groups: [
      {
        groupId: DEFAULT_EDITOR_GROUP_ID,
        tabs: [initialDraftTab],
        activeTabId: initialDraftTab.id,
        mruTabIds: [initialDraftTab.id],
      },
    ],
    activeGroupId: DEFAULT_EDITOR_GROUP_ID,
    viewStateEntries: [],
  };
}

function readStoredWorkspaceState(
  storage = createWritingEditorStorage(),
): WritingWorkspaceState {
  const rawWorkspace = storage.readWorkspaceState();
  if (!rawWorkspace) {
    return migrateLegacyWorkspaceState(storage);
  }

  try {
    const draftStateByInputId = normalizeStoredDraftStateByInputId(
      rawWorkspace.draftStateByInputId,
    );
    const groups = Array.isArray(rawWorkspace.groups)
      ? rawWorkspace.groups.flatMap((group) => {
          if (!group || typeof group !== 'object') {
            return [];
          }

          const candidate = group as {
            groupId?: unknown;
            inputs?: unknown;
            tabs?: unknown;
            activeTabId?: unknown;
            mruTabIds?: unknown;
          };
          const tabs = Array.isArray(candidate.inputs)
            ? candidate.inputs
                .map((input) => normalizeWritingEditorInput(input))
                .filter((input): input is WritingEditorInput => Boolean(input))
                .map((input) => createWorkspaceTabFromStoredInput(input, draftStateByInputId))
            : Array.isArray(candidate.tabs)
              ? candidate.tabs
                  .map((tab) => normalizeWorkspaceTab(tab))
                  .filter((tab): tab is WritingWorkspaceTab => Boolean(tab))
              : [];
          const activeTabId =
            typeof candidate.activeTabId === 'string'
              ? candidate.activeTabId
              : null;
          const mruTabIds = Array.isArray(candidate.mruTabIds)
            ? candidate.mruTabIds.filter(
                (tabId): tabId is string => typeof tabId === 'string',
              )
            : [];

          return [
            {
              groupId:
                typeof candidate.groupId === 'string'
                  ? candidate.groupId
                  : DEFAULT_EDITOR_GROUP_ID,
              tabs,
              activeTabId,
              mruTabIds,
            } satisfies WritingEditorGroupState,
          ];
        })
      : (() => {
          const tabs = Array.isArray(rawWorkspace.inputs)
            ? rawWorkspace.inputs
                .map((input) => normalizeWritingEditorInput(input))
                .filter((input): input is WritingEditorInput => Boolean(input))
                .map((input) => createWorkspaceTabFromStoredInput(input, draftStateByInputId))
            : Array.isArray(rawWorkspace.tabs)
              ? rawWorkspace.tabs
                  .map((tab) => normalizeWorkspaceTab(tab))
                  .filter((tab): tab is WritingWorkspaceTab => Boolean(tab))
              : [];
          const activeTabId =
            typeof rawWorkspace.activeTabId === 'string'
              ? rawWorkspace.activeTabId
              : null;
          const groupId =
            typeof rawWorkspace.groupId === 'string'
              ? rawWorkspace.groupId
              : DEFAULT_EDITOR_GROUP_ID;
          const mruTabIds = Array.isArray(rawWorkspace.mruTabIds)
            ? rawWorkspace.mruTabIds.filter(
                (tabId): tabId is string => typeof tabId === 'string',
              )
            : [];

          return [
            {
              groupId,
              tabs,
              activeTabId,
              mruTabIds,
            } satisfies WritingEditorGroupState,
          ];
        })();
    const activeGroupId =
      typeof rawWorkspace.activeGroupId === 'string'
        ? rawWorkspace.activeGroupId
        : typeof rawWorkspace.groupId === 'string'
          ? rawWorkspace.groupId
          : DEFAULT_EDITOR_GROUP_ID;
    const viewStateEntries = normalizeSerializedEditorViewStateEntries(
      rawWorkspace.viewStateEntries,
    );

    return normalizeWorkspaceState({
      groups,
      activeGroupId,
      viewStateEntries,
    });
  } catch {
    return migrateLegacyWorkspaceState(storage);
  }
}

function resolveActiveGroup(workspaceState: WritingWorkspaceState) {
  return (
    workspaceState.groups.find((group) => group.groupId === workspaceState.activeGroupId) ??
    workspaceState.groups[0]
  );
}

function resolveActiveTab(groupState: WritingEditorGroupState) {
  return (
    groupState.tabs.find((tab) => tab.id === groupState.activeTabId) ??
    groupState.tabs[0] ??
    null
  );
}

function resolveContextDraftTab(
  groupState: WritingEditorGroupState,
  activeTab: WritingWorkspaceTab | null,
) {
  if (isWritingDraftEditorInput(activeTab)) {
    return activeTab;
  }

  const tabById = new Map(groupState.tabs.map((tab) => [tab.id, tab] as const));
  return (
    groupState.mruTabIds
      .map((tabId) => tabById.get(tabId))
      .find((tab): tab is WritingWorkspaceDraftTab => isWritingDraftEditorInput(tab)) ??
    null
  );
}

export function toWritingWorkspaceTabInput(tab: WritingWorkspaceTab): WritingEditorInput {
  return toWritingEditorInput(tab);
}

function createWritingEditorModelSnapshot(
  workspaceState: WritingWorkspaceState,
): WritingEditorModelSnapshot {
  const activeGroup = resolveActiveGroup(workspaceState);
  const activeTab = resolveActiveTab(activeGroup);

  return {
    groups: workspaceState.groups,
    activeGroupId: activeGroup.groupId,
    groupId: activeGroup.groupId,
    tabs: activeGroup.tabs,
    activeTabId: activeGroup.activeTabId,
    mruTabIds: activeGroup.mruTabIds,
    activeTab,
    viewStateEntries: workspaceState.viewStateEntries,
  };
}

export class WritingEditorModel {
  private workspaceState: WritingWorkspaceState;
  private snapshot: WritingEditorModelSnapshot;
  private readonly liveDraftState = createWritingLiveDraftState();
  private readonly storage = createWritingEditorStorage();
  private listeners = new Set<WritingEditorModelListener>();

  constructor(initialState: WritingWorkspaceState = readStoredWorkspaceState()) {
    this.workspaceState = normalizeWorkspaceState(initialState);
    this.syncLiveDraftState();
    this.snapshot = createWritingEditorModelSnapshot(this.workspaceState);
    this.storage.save(this.createPersistedState());
  }

  readonly subscribe = (listener: WritingEditorModelListener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = () => this.snapshot;
  readonly getDraftBody = () => this.liveDraftState.getContextDraftBody();
  readonly getDraftDocument = () => this.liveDraftState.getActiveDraftDocument();

  readonly createGroup = (
    options: {
      groupId?: string;
      activate?: boolean;
    } = {},
  ) => {
    const nextGroupId = normalizeEditorGroupId(
      options.groupId ?? createEditorGroupId(),
    );
    const shouldActivate = options.activate ?? true;
    const groupExists = this.workspaceState.groups.some(
      (group) => group.groupId === nextGroupId,
    );

    if (groupExists) {
      if (shouldActivate) {
        this.activateGroup(nextGroupId);
      }

      return nextGroupId;
    }

    this.updateWorkspaceState((workspaceState) => {
      const nextWorkspaceState = ensureWorkspaceGroup(workspaceState, nextGroupId);
      return {
        ...nextWorkspaceState,
        activeGroupId: shouldActivate
          ? nextGroupId
          : nextWorkspaceState.activeGroupId,
      };
    });

    return nextGroupId;
  };

  readonly activateGroup = (groupId: string) => {
    const normalizedGroupId = normalizeEditorGroupId(groupId);
    if (
      this.workspaceState.activeGroupId === normalizedGroupId ||
      !this.workspaceState.groups.some((group) => group.groupId === normalizedGroupId)
    ) {
      return;
    }

    this.updateWorkspaceState((workspaceState) => ({
      ...workspaceState,
      activeGroupId: normalizedGroupId,
    }));
  };

  readonly activateTab = (tabId: string) => {
    this.updateActiveGroupState((group) => ({
      ...group,
      activeTabId: tabId,
      mruTabIds: touchMruTab(group.mruTabIds, tabId),
    }));
  };

  readonly closeTab = (tabId: string) => {
    this.updateActiveGroupState((group) => ({
      ...group,
      tabs: group.tabs.filter((tab) => tab.id !== tabId),
      activeTabId: group.activeTabId === tabId ? null : group.activeTabId,
      mruTabIds: group.mruTabIds.filter((id) => id !== tabId),
    }));
  };

  readonly createDraftTab = (target: WritingEditorGroupTarget = {}) => {
    const nextTab = createDraftTab();
    this.updateTargetGroupState(target, (group) => ({
      ...group,
      tabs: [...group.tabs, nextTab],
      activeTabId: nextTab.id,
      mruTabIds: touchMruTab(group.mruTabIds, nextTab.id),
    }));
  };

  readonly createBrowserTab = (
    url: string,
    target: WritingEditorGroupTarget = {},
  ) => {
    const normalizedUrl = url.trim();
    if (!normalizedUrl) {
      return;
    }

    this.updateTargetGroupState(target, (group) => {
      // Mirror upstream open-editor behavior: the same web content resource re-activates its tab
      // instead of creating duplicate entries in the target group strip.
      const existingTab = group.tabs.find(
        (tab) => isWritingBrowserEditorInput(tab) && tab.url === normalizedUrl,
      );
      if (existingTab) {
        return {
          ...group,
          activeTabId: existingTab.id,
          mruTabIds: touchMruTab(group.mruTabIds, existingTab.id),
        };
      }

      const nextTab = createBrowserTab(normalizedUrl);
      return {
        ...group,
        tabs: [...group.tabs, nextTab],
        activeTabId: nextTab.id,
        mruTabIds: touchMruTab(group.mruTabIds, nextTab.id),
      };
    });
  };

  readonly createPdfTab = (
    url: string,
    target: WritingEditorGroupTarget = {},
  ) => {
    const normalizedUrl = url.trim();
    if (!normalizedUrl) {
      return;
    }

    this.updateTargetGroupState(target, (group) => {
      // Keep PDF tabs aligned with web tabs: one resource maps to one tab/input entry
      // inside the target group.
      const existingTab = group.tabs.find(
        (tab) => isWritingPdfEditorInput(tab) && tab.url === normalizedUrl,
      );
      if (existingTab) {
        return {
          ...group,
          activeTabId: existingTab.id,
          mruTabIds: touchMruTab(group.mruTabIds, existingTab.id),
        };
      }

      const nextTab = createPdfTab(normalizedUrl);
      return {
        ...group,
        tabs: [...group.tabs, nextTab],
        activeTabId: nextTab.id,
        mruTabIds: touchMruTab(group.mruTabIds, nextTab.id),
      };
    });
  };

  readonly setDraftDocument = (value: WritingEditorDocument) => {
    const normalizedDocument = normalizeWritingEditorDocument(value);
    const activeGroup = resolveActiveGroup(this.workspaceState);
    const currentActiveDraftTab =
      activeGroup.tabs.find(
        (tab): tab is WritingWorkspaceDraftTab =>
          tab.id === activeGroup.activeTabId && isWritingDraftEditorInput(tab),
      ) ?? null;

    if (
      currentActiveDraftTab &&
      createNormalizedDocumentKey(currentActiveDraftTab.document) ===
        createNormalizedDocumentKey(normalizedDocument)
    ) {
      return;
    }

    this.updateActiveGroupState(
      (group) => ({
        ...group,
        tabs: group.tabs.map((tab) =>
          tab.id === group.activeTabId && isWritingDraftEditorInput(tab)
            ? {
                ...tab,
                document: normalizedDocument,
              }
            : tab,
        ),
      }),
      { persist: 'debounced' },
    );
  };

  readonly updateActiveContentTabUrl = (url: string) => {
    const normalizedUrl = url.trim();
    this.updateActiveGroupState((group) => ({
      ...group,
      tabs: group.tabs.map((tab) =>
        // When the shared web content view navigates while a content tab owns it, update that tab's
        // input so the tab title/url stay consistent with the visible editor content.
        tab.id === group.activeTabId && !isWritingDraftEditorInput(tab)
          ? {
              ...tab,
              url: normalizedUrl,
              title: getWritingContentInputTitle(normalizedUrl),
            }
          : tab,
      ),
    }));
  };

  readonly setEditorViewState = (
    key: EditorViewStateKey,
    state: unknown,
  ) => {
    this.updateWorkspaceState((currentState) => ({
      ...currentState,
      viewStateEntries: [
        ...currentState.viewStateEntries.filter(
          (entry) =>
            entry.key.groupId !== key.groupId ||
            entry.key.paneId !== key.paneId ||
            entry.key.resourceKey !== key.resourceKey,
        ),
        {
          key,
          state,
        },
      ],
    }));
  };

  readonly deleteEditorViewState = (key: EditorViewStateKey) => {
    this.updateWorkspaceState((currentState) => ({
      ...currentState,
      viewStateEntries: currentState.viewStateEntries.filter(
        (entry) =>
          entry.key.groupId !== key.groupId ||
          entry.key.paneId !== key.paneId ||
          entry.key.resourceKey !== key.resourceKey,
      ),
    }));
  };

  readonly dispose = () => {
    this.storage.dispose();
    this.listeners.clear();
  };

  private emitChange() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private updateWorkspaceState(
    updater: (state: WritingWorkspaceState) => WritingWorkspaceState,
    options: { persist?: 'immediate' | 'debounced' } = {},
  ) {
    this.workspaceState = normalizeWorkspaceState(updater(this.workspaceState));
    this.syncLiveDraftState();
    this.snapshot = createWritingEditorModelSnapshot(this.workspaceState);
    if (options.persist === 'debounced') {
      this.storage.scheduleSave(this.createPersistedState());
    } else {
      this.storage.save(this.createPersistedState());
    }
    this.emitChange();
  }

  private updateActiveGroupState(
    updater: (group: WritingEditorGroupState) => WritingEditorGroupState,
    options: { persist?: 'immediate' | 'debounced' } = {},
  ) {
    this.updateResolvedGroupState(
      {
        groupId: this.workspaceState.activeGroupId ?? DEFAULT_EDITOR_GROUP_ID,
        activateGroup: true,
      },
      updater,
      options,
    );
  }

  private updateTargetGroupState(
    target: WritingEditorGroupTarget,
    updater: (group: WritingEditorGroupState) => WritingEditorGroupState,
    options: { persist?: 'immediate' | 'debounced' } = {},
  ) {
    this.updateResolvedGroupState(
      this.resolveTargetGroup(target),
      updater,
      options,
    );
  }

  private updateResolvedGroupState(
    target: ResolvedWritingEditorGroupTarget,
    updater: (group: WritingEditorGroupState) => WritingEditorGroupState,
    options: { persist?: 'immediate' | 'debounced' } = {},
  ) {
    this.updateWorkspaceState(
      (workspaceState) => {
        const nextWorkspaceState = ensureWorkspaceGroup(
          workspaceState,
          target.groupId,
        );

        return {
          ...nextWorkspaceState,
          activeGroupId: target.activateGroup
            ? target.groupId
            : nextWorkspaceState.activeGroupId,
          groups: nextWorkspaceState.groups.map((group) =>
            group.groupId === target.groupId ? updater(group) : group,
          ),
        };
      },
      options,
    );
  }

  private resolveTargetGroup(
    target: WritingEditorGroupTarget,
  ): ResolvedWritingEditorGroupTarget {
    const groupId = normalizeEditorGroupId(
      target.groupId ?? this.workspaceState.activeGroupId,
    );

    return {
      groupId,
      activateGroup:
        target.activateGroup ?? groupId === this.workspaceState.activeGroupId,
    };
  }

  private syncLiveDraftState() {
    const activeGroup = resolveActiveGroup(this.workspaceState);
    const activeTab = resolveActiveTab(activeGroup);
    const activeDraftTab = isWritingDraftEditorInput(activeTab) ? activeTab : null;
    const contextDraftTab = resolveContextDraftTab(activeGroup, activeTab);
    this.liveDraftState.sync({
      activeDraftDocument: activeDraftTab?.document ?? null,
      contextDraftDocument: contextDraftTab?.document ?? null,
    });
  }

  private createPersistedState() {
    const activeGroup = resolveActiveGroup(this.workspaceState);
    const activeTab = resolveActiveTab(activeGroup);

    return {
      workspaceState: {
        groups: this.workspaceState.groups,
        activeGroupId: this.workspaceState.activeGroupId,
        viewStateEntries: this.workspaceState.viewStateEntries,
      },
      contextDraftTab: resolveContextDraftTab(activeGroup, activeTab),
    };
  }
}

export function createWritingEditorModel(
  initialState: WritingWorkspaceState = readStoredWorkspaceState(),
) {
  return new WritingEditorModel(initialState);
}
