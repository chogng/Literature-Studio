import { createEmptyWritingEditorDocument, normalizeWritingEditorDocument } from 'ls/editor/common/writingEditorDocument';
import type { WritingEditorDocument } from 'ls/editor/common/writingEditorDocument';

import {
  createEditorBrowserTabInput,
  createEditorDraftTabInput,
  createEditorPdfTabInput,
  isEditorBrowserTabInput,
  isEditorDraftTabInput,
  isEditorPdfTabInput,
  normalizeEditorTabInput,
  toEditorTabInput,
} from 'ls/workbench/browser/parts/editor/editorInput';
import type {
  EditorBrowserTabInput,
  EditorDraftTabInput,
  EditorTabInput,
  EditorPdfTabInput,
} from 'ls/workbench/browser/parts/editor/editorInput';
import { createEditorLiveDraftState } from 'ls/workbench/browser/parts/editor/editorLiveState';
import { createEditorStorage } from 'ls/workbench/browser/parts/editor/editorStorage';
import type { StoredWritingWorkspaceState } from 'ls/workbench/browser/parts/editor/editorStorage';
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
import { getEditorContentTabTitle } from 'ls/workbench/browser/parts/editor/editorUrlPresentation';

export type { WritingEditorDocument } from 'ls/editor/common/writingEditorDocument';

// Content tabs only store editor input metadata. The active content tab temporarily owns one shared
// web-content surface instead of spawning a dedicated browser/view instance per tab.
export type EditorWorkspaceDraftTab = EditorDraftTabInput & {
  document: WritingEditorDocument;
};

export type EditorWorkspaceBrowserTab = EditorBrowserTabInput;
export type EditorWorkspacePdfTab = EditorPdfTabInput;
export type EditorWorkspaceContentTab =
  | EditorWorkspaceBrowserTab
  | EditorWorkspacePdfTab;

export type EditorWorkspaceTab =
  | EditorWorkspaceDraftTab
  | EditorWorkspaceContentTab;

export type EditorEditorGroupState = {
  groupId: string;
  tabs: EditorWorkspaceTab[];
  activeTabId: string | null;
  mruTabIds: string[];
};

export type EditorWorkspaceState = {
  groups: EditorEditorGroupState[];
  activeGroupId: string | null;
  viewStateEntries: SerializedEditorViewStateEntry[];
};

export type EditorModelSnapshot = {
  groups: EditorEditorGroupState[];
  activeGroupId: string;
  groupId: string;
  tabs: EditorWorkspaceTab[];
  activeTabId: string | null;
  mruTabIds: string[];
  activeTab: EditorWorkspaceTab | null;
  viewStateEntries: SerializedEditorViewStateEntry[];
};

export type EditorGroupTarget = {
  groupId?: string;
  activateGroup?: boolean;
};

type EditorModelListener = () => void;

type ResolvedEditorGroupTarget = {
  groupId: string;
  activateGroup: boolean;
};

function createDraftTab(
  initial?: Partial<Pick<EditorWorkspaceDraftTab, 'id' | 'title' | 'document' | 'viewMode'>>,
): EditorWorkspaceDraftTab {
  return {
    ...createEditorDraftTabInput({
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
  initial?: Partial<Pick<EditorBrowserTabInput, 'id' | 'title'>>,
): EditorBrowserTabInput {
  return createEditorBrowserTabInput(url, initial);
}

function createPdfTab(
  url: string,
  initial?: Partial<Pick<EditorPdfTabInput, 'id' | 'title'>>,
): EditorPdfTabInput {
  return createEditorPdfTabInput(url, initial);
}

function normalizeWorkspaceTab(value: unknown): EditorWorkspaceTab | null {
  const candidate = value as Partial<EditorWorkspaceDraftTab> | null | undefined;
  const normalizedInput = normalizeEditorTabInput(value);
  if (!candidate || typeof candidate !== 'object' || !normalizedInput) {
    return null;
  }

  if (isEditorDraftTabInput(normalizedInput)) {
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
  state: EditorEditorGroupState,
): EditorEditorGroupState {
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
  Pick<EditorWorkspaceDraftTab, 'title' | 'document' | 'viewMode'>
>;

function normalizeStoredDraftState(value: unknown): StoredDraftState | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<EditorWorkspaceDraftTab>;
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
  input: EditorTabInput,
  draftStateByInputId: Record<string, StoredDraftState>,
): EditorWorkspaceTab {
  if (isEditorDraftTabInput(input)) {
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

function createEmptyEditorGroupState(groupId: string): EditorEditorGroupState {
  return {
    groupId: normalizeEditorGroupId(groupId),
    tabs: [],
    activeTabId: null,
    mruTabIds: [],
  };
}

function ensureWorkspaceGroup(
  workspaceState: EditorWorkspaceState,
  groupId: string,
): EditorWorkspaceState {
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
  state: EditorWorkspaceState,
): EditorWorkspaceState {
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
  storage = createEditorStorage(),
): EditorWorkspaceState {
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
  storage = createEditorStorage(),
): EditorWorkspaceState {
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
                .map((input) => normalizeEditorTabInput(input))
                .filter((input): input is EditorTabInput => Boolean(input))
                .map((input) => createWorkspaceTabFromStoredInput(input, draftStateByInputId))
            : Array.isArray(candidate.tabs)
              ? candidate.tabs
                  .map((tab) => normalizeWorkspaceTab(tab))
                  .filter((tab): tab is EditorWorkspaceTab => Boolean(tab))
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
            } satisfies EditorEditorGroupState,
          ];
        })
      : (() => {
          const tabs = Array.isArray(rawWorkspace.inputs)
            ? rawWorkspace.inputs
                .map((input) => normalizeEditorTabInput(input))
                .filter((input): input is EditorTabInput => Boolean(input))
                .map((input) => createWorkspaceTabFromStoredInput(input, draftStateByInputId))
            : Array.isArray(rawWorkspace.tabs)
              ? rawWorkspace.tabs
                  .map((tab) => normalizeWorkspaceTab(tab))
                  .filter((tab): tab is EditorWorkspaceTab => Boolean(tab))
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
            } satisfies EditorEditorGroupState,
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

function resolveActiveGroup(workspaceState: EditorWorkspaceState) {
  return (
    workspaceState.groups.find((group) => group.groupId === workspaceState.activeGroupId) ??
    workspaceState.groups[0]
  );
}

function resolveActiveTab(groupState: EditorEditorGroupState) {
  return (
    groupState.tabs.find((tab) => tab.id === groupState.activeTabId) ??
    groupState.tabs[0] ??
    null
  );
}

function resolveContextDraftTab(
  groupState: EditorEditorGroupState,
  activeTab: EditorWorkspaceTab | null,
) {
  if (isEditorDraftTabInput(activeTab)) {
    return activeTab;
  }

  const tabById = new Map(groupState.tabs.map((tab) => [tab.id, tab] as const));
  return (
    groupState.mruTabIds
      .map((tabId) => tabById.get(tabId))
      .find((tab): tab is EditorWorkspaceDraftTab => isEditorDraftTabInput(tab)) ??
    null
  );
}

export function toEditorWorkspaceTabInput(tab: EditorWorkspaceTab): EditorTabInput {
  return toEditorTabInput(tab);
}

function hasDerivedContentTabTitle(tab: EditorWorkspaceContentTab) {
  return tab.title.trim() === getEditorContentTabTitle(tab.url);
}

function createEditorModelSnapshot(
  workspaceState: EditorWorkspaceState,
): EditorModelSnapshot {
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

export class EditorModel {
  private workspaceState: EditorWorkspaceState;
  private snapshot: EditorModelSnapshot;
  private readonly liveDraftState = createEditorLiveDraftState();
  private readonly storage = createEditorStorage();
  private listeners = new Set<EditorModelListener>();

  constructor(initialState: EditorWorkspaceState = readStoredWorkspaceState()) {
    this.workspaceState = normalizeWorkspaceState(initialState);
    this.syncLiveDraftState();
    this.snapshot = createEditorModelSnapshot(this.workspaceState);
    this.storage.save(this.createPersistedState());
  }

  readonly subscribe = (listener: EditorModelListener) => {
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

  readonly closeOtherTabs = (tabId: string) => {
    const activeGroup = resolveActiveGroup(this.workspaceState);
    if (!activeGroup.tabs.some((tab) => tab.id === tabId)) {
      return;
    }

    if (activeGroup.tabs.length === 1 && activeGroup.tabs[0]?.id === tabId) {
      return;
    }

    this.updateActiveGroupState((group) => ({
      ...group,
      tabs: group.tabs.filter((tab) => tab.id === tabId),
      activeTabId: tabId,
      mruTabIds: group.mruTabIds.filter((id) => id === tabId),
    }));
  };

  readonly closeAllTabs = () => {
    const activeGroup = resolveActiveGroup(this.workspaceState);
    if (activeGroup.tabs.length === 0) {
      return;
    }

    this.updateActiveGroupState((group) => ({
      ...group,
      tabs: [],
      activeTabId: null,
      mruTabIds: [],
    }));
  };

  readonly createDraftTab = (target: EditorGroupTarget = {}) => {
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
    target: EditorGroupTarget = {},
  ) => {
    const normalizedUrl = url.trim();
    if (!normalizedUrl) {
      return;
    }

    this.updateTargetGroupState(target, (group) => {
      // Mirror upstream open-editor behavior: the same web content resource re-activates its tab
      // instead of creating duplicate entries in the target group strip.
      const existingTab = group.tabs.find(
        (tab) => isEditorBrowserTabInput(tab) && tab.url === normalizedUrl,
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
    target: EditorGroupTarget = {},
  ) => {
    const normalizedUrl = url.trim();
    if (!normalizedUrl) {
      return;
    }

    this.updateTargetGroupState(target, (group) => {
      // Keep PDF tabs aligned with web tabs: one resource maps to one tab/input entry
      // inside the target group.
      const existingTab = group.tabs.find(
        (tab) => isEditorPdfTabInput(tab) && tab.url === normalizedUrl,
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
        (tab): tab is EditorWorkspaceDraftTab =>
          tab.id === activeGroup.activeTabId && isEditorDraftTabInput(tab),
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
          tab.id === group.activeTabId && isEditorDraftTabInput(tab)
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
    const activeGroup = resolveActiveGroup(this.workspaceState);
    const activeTab = resolveActiveTab(activeGroup);
    if (!activeTab || isEditorDraftTabInput(activeTab)) {
      return;
    }

    const nextTitle = hasDerivedContentTabTitle(activeTab)
      ? getEditorContentTabTitle(normalizedUrl)
      : activeTab.title;
    if (activeTab.url === normalizedUrl && activeTab.title === nextTitle) {
      return;
    }

    this.updateActiveGroupState((group) => ({
      ...group,
      tabs: group.tabs.map((tab) =>
        // When the shared web content view navigates while a content tab owns it, update that tab's
        // input so the tab title/url stay consistent with the visible editor content.
        tab.id === group.activeTabId && !isEditorDraftTabInput(tab)
          ? {
              ...tab,
              url: normalizedUrl,
              title: hasDerivedContentTabTitle(tab)
                ? getEditorContentTabTitle(normalizedUrl)
                : tab.title,
            }
          : tab,
      ),
    }));
  };

  readonly renameTab = (tabId: string, title: string) => {
    const nextTitle = title.trim();
    if (!nextTitle) {
      return;
    }

    const activeGroup = resolveActiveGroup(this.workspaceState);
    const targetTab = activeGroup.tabs.find((tab) => tab.id === tabId);
    if (!targetTab || targetTab.title === nextTitle) {
      return;
    }

    this.updateActiveGroupState((group) => ({
      ...group,
      tabs: group.tabs.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              title: nextTitle,
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
    updater: (state: EditorWorkspaceState) => EditorWorkspaceState,
    options: { persist?: 'immediate' | 'debounced' } = {},
  ) {
    this.workspaceState = normalizeWorkspaceState(updater(this.workspaceState));
    this.syncLiveDraftState();
    this.snapshot = createEditorModelSnapshot(this.workspaceState);
    if (options.persist === 'debounced') {
      this.storage.scheduleSave(this.createPersistedState());
    } else {
      this.storage.save(this.createPersistedState());
    }
    this.emitChange();
  }

  private updateActiveGroupState(
    updater: (group: EditorEditorGroupState) => EditorEditorGroupState,
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
    target: EditorGroupTarget,
    updater: (group: EditorEditorGroupState) => EditorEditorGroupState,
    options: { persist?: 'immediate' | 'debounced' } = {},
  ) {
    this.updateResolvedGroupState(
      this.resolveTargetGroup(target),
      updater,
      options,
    );
  }

  private updateResolvedGroupState(
    target: ResolvedEditorGroupTarget,
    updater: (group: EditorEditorGroupState) => EditorEditorGroupState,
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
    target: EditorGroupTarget,
  ): ResolvedEditorGroupTarget {
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
    const activeDraftTab = isEditorDraftTabInput(activeTab) ? activeTab : null;
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

export function createEditorModel(
  initialState: EditorWorkspaceState = readStoredWorkspaceState(),
) {
  return new EditorModel(initialState);
}
