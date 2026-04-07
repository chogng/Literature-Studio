import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createWritingEditorDocumentFromPlainText,
  writingEditorDocumentToPlainText,
} from 'ls/editor/common/writingEditorDocument';
import { DEFAULT_EDITOR_GROUP_ID } from 'ls/workbench/browser/editorGroupIdentity';
import { createEditorModel } from 'ls/workbench/browser/parts/editor/editorModel';

type MockStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

type MockWindow = Pick<Window, 'localStorage' | 'setTimeout' | 'clearTimeout'>;

const globalWindow = globalThis as {
  window?: MockWindow;
};

function createLocalStorage(initialValues: Record<string, string> = {}): MockStorage {
  const values = new Map(Object.entries(initialValues));

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function installMockWindow(localStorage: MockStorage) {
  const previousWindow = globalWindow.window;
  globalWindow.window = {
    localStorage: localStorage as Storage,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  };

  return () => {
    globalWindow.window = previousWindow;
  };
}

test('editor model restores draft documents from persisted input and draft-state records', () => {
  const localStorage = createLocalStorage({
    'ls.writingWorkspace.state': JSON.stringify({
      groups: [
        {
          groupId: 'editor-group-a',
          inputs: [
            {
              id: 'draft-a',
              kind: 'draft',
              title: 'Draft A',
              viewMode: 'draft',
            },
            {
              id: 'browser-a',
              kind: 'browser',
              title: 'Example',
              url: 'https://example.com/article',
            },
          ],
          activeTabId: 'draft-a',
          mruTabIds: ['draft-a', 'browser-a'],
        },
      ],
      activeGroupId: 'editor-group-a',
      draftStateByInputId: {
        'draft-a': {
          title: 'Recovered Draft',
          viewMode: 'draft',
          document: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'restored body' }],
              },
            ],
          },
        },
      },
      viewStateEntries: [
        {
          key: {
            groupId: 'editor-group-a',
            paneId: 'draft',
            resourceKey: 'draft:draft-a',
          },
          state: {
            scrollPosition: {
              scrollLeft: 0,
              scrollTop: 24,
            },
          },
        },
      ],
    }),
  });
  const restoreWindow = installMockWindow(localStorage);

  try {
    const model = createEditorModel();
    const snapshot = model.getSnapshot();
    const draftTab = snapshot.tabs.find((tab) => tab.id === 'draft-a');

    assert.ok(draftTab);
    assert.equal(draftTab.kind, 'draft');
    assert.equal(draftTab.title, 'Recovered Draft');
    assert.equal(writingEditorDocumentToPlainText(draftTab.document), 'restored body');
    assert.equal(snapshot.activeGroupId, 'editor-group-a');
    assert.equal(snapshot.groupId, 'editor-group-a');
    assert.equal(snapshot.activeTab?.id, 'draft-a');
    assert.equal(snapshot.groups.length, 1);
    assert.deepEqual(snapshot.viewStateEntries, [
      {
        key: {
          groupId: 'editor-group-a',
          paneId: 'draft',
          resourceKey: 'draft:draft-a',
        },
        state: {
          scrollPosition: {
            scrollLeft: 0,
            scrollTop: 24,
          },
        },
      },
    ]);
    model.dispose();
  } finally {
    restoreWindow();
  }
});

test('editor model flattens the active group while preserving grouped workspace state', () => {
  const model = createEditorModel({
    groups: [
      {
        groupId: 'editor-group-a',
        tabs: [
          {
            id: 'draft-a',
            kind: 'draft',
            title: 'Draft A',
            document: createWritingEditorDocumentFromPlainText('alpha'),
            viewMode: 'draft',
          },
        ],
        activeTabId: 'draft-a',
        mruTabIds: ['draft-a'],
      },
      {
        groupId: 'editor-group-b',
        tabs: [
          {
            id: 'browser-b',
            kind: 'browser',
            title: 'Browser B',
            url: 'https://example.com/b',
          },
        ],
        activeTabId: 'browser-b',
        mruTabIds: ['browser-b'],
      },
    ],
    activeGroupId: 'editor-group-b',
    viewStateEntries: [
      {
        key: {
          groupId: 'editor-group-a',
          paneId: 'draft',
          resourceKey: 'draft:draft-a',
        },
        state: {
          scrollPosition: {
            scrollLeft: 0,
            scrollTop: 12,
          },
        },
      },
      {
        key: {
          groupId: 'editor-group-b',
          paneId: 'browser',
          resourceKey: 'browser:https://example.com/b',
        },
        state: {
          scrollY: 48,
        },
      },
    ],
  });

  try {
    const snapshot = model.getSnapshot();
    assert.equal(snapshot.activeGroupId, 'editor-group-b');
    assert.equal(snapshot.groupId, 'editor-group-b');
    assert.equal(snapshot.activeTabId, 'browser-b');
    assert.equal(snapshot.activeTab?.kind, 'browser');
    assert.equal(snapshot.tabs.length, 1);
    assert.equal(snapshot.tabs[0].id, 'browser-b');
    assert.equal(snapshot.groups.length, 2);
    assert.equal(snapshot.viewStateEntries.length, 2);
  } finally {
    model.dispose();
  }
});

test('editor model restores legacy flat workspace payloads into a default group', () => {
  const localStorage = createLocalStorage({
    'ls.writingWorkspace.state': JSON.stringify({
      groupId: 'editor-group-legacy',
      inputs: [
        {
          id: 'draft-a',
          kind: 'draft',
          title: 'Draft A',
          viewMode: 'draft',
        },
      ],
      activeTabId: 'draft-a',
      mruTabIds: ['draft-a'],
    }),
  });
  const restoreWindow = installMockWindow(localStorage);

  try {
    const model = createEditorModel();
    const snapshot = model.getSnapshot();
    assert.equal(snapshot.activeGroupId, 'editor-group-legacy');
    assert.equal(snapshot.groupId, 'editor-group-legacy');
    assert.equal(snapshot.groups.length, 1);
    assert.equal(snapshot.groups[0].groupId, 'editor-group-legacy');
    assert.equal(snapshot.groups[0].tabs[0]?.id, 'draft-a');
    model.dispose();
  } finally {
    restoreWindow();
  }
});

test('editor model can create and activate explicit editor groups', () => {
  const model = createEditorModel({
    groups: [
      {
        groupId: DEFAULT_EDITOR_GROUP_ID,
        tabs: [
          {
            id: 'draft-a',
            kind: 'draft',
            title: 'Draft A',
            document: createWritingEditorDocumentFromPlainText('alpha'),
            viewMode: 'draft',
          },
        ],
        activeTabId: 'draft-a',
        mruTabIds: ['draft-a'],
      },
    ],
    activeGroupId: DEFAULT_EDITOR_GROUP_ID,
    viewStateEntries: [],
  });

  try {
    const nextGroupId = model.createGroup({
      groupId: 'editor-group-b',
      activate: false,
    });
    let snapshot = model.getSnapshot();

    assert.equal(nextGroupId, 'editor-group-b');
    assert.equal(snapshot.activeGroupId, DEFAULT_EDITOR_GROUP_ID);
    assert.equal(snapshot.groups.length, 2);
    assert.equal(
      snapshot.groups.some((group) => group.groupId === 'editor-group-b'),
      true,
    );

    model.activateGroup(nextGroupId);
    snapshot = model.getSnapshot();
    assert.equal(snapshot.activeGroupId, 'editor-group-b');
    assert.equal(snapshot.groupId, 'editor-group-b');
    assert.equal(snapshot.tabs.length, 0);
    assert.equal(snapshot.activeTabId, null);
  } finally {
    model.dispose();
  }
});

test('editor model can open the same browser resource into another group without changing the active group', () => {
  const model = createEditorModel({
    groups: [
      {
        groupId: 'editor-group-a',
        tabs: [
          {
            id: 'browser-a',
            kind: 'browser',
            title: 'Article',
            url: 'https://example.com/article',
          },
        ],
        activeTabId: 'browser-a',
        mruTabIds: ['browser-a'],
      },
      {
        groupId: 'editor-group-b',
        tabs: [],
        activeTabId: null,
        mruTabIds: [],
      },
    ],
    activeGroupId: 'editor-group-a',
    viewStateEntries: [],
  });

  try {
    model.createBrowserTab('https://example.com/article', {
      groupId: 'editor-group-b',
      activateGroup: false,
    });

    const snapshot = model.getSnapshot();
    const firstGroup = snapshot.groups.find((group) => group.groupId === 'editor-group-a');
    const secondGroup = snapshot.groups.find((group) => group.groupId === 'editor-group-b');

    assert(firstGroup);
    assert(secondGroup);
    assert.equal(snapshot.activeGroupId, 'editor-group-a');
    assert.equal(snapshot.groupId, 'editor-group-a');
    assert.equal(snapshot.activeTab?.id, 'browser-a');
    assert.equal(firstGroup.tabs.length, 1);
    assert.equal(secondGroup.tabs.length, 1);
    assert.equal(secondGroup.activeTabId, secondGroup.tabs[0]?.id ?? null);
    assert.equal(secondGroup.tabs[0]?.kind, 'browser');
    assert.equal(secondGroup.tabs[0]?.url, 'https://example.com/article');
    assert.notEqual(firstGroup.tabs[0]?.id, secondGroup.tabs[0]?.id);
  } finally {
    model.dispose();
  }
});

test('editor model reveals an existing browser tab inside the target group and can activate that group', () => {
  const model = createEditorModel({
    groups: [
      {
        groupId: 'editor-group-a',
        tabs: [
          {
            id: 'draft-a',
            kind: 'draft',
            title: 'Draft A',
            document: createWritingEditorDocumentFromPlainText('alpha'),
            viewMode: 'draft',
          },
        ],
        activeTabId: 'draft-a',
        mruTabIds: ['draft-a'],
      },
      {
        groupId: 'editor-group-b',
        tabs: [
          {
            id: 'browser-b',
            kind: 'browser',
            title: 'Article',
            url: 'https://example.com/article',
          },
        ],
        activeTabId: null,
        mruTabIds: [],
      },
    ],
    activeGroupId: 'editor-group-a',
    viewStateEntries: [],
  });

  try {
    model.createBrowserTab('https://example.com/article', {
      groupId: 'editor-group-b',
      activateGroup: true,
    });

    const snapshot = model.getSnapshot();
    const secondGroup = snapshot.groups.find((group) => group.groupId === 'editor-group-b');

    assert(secondGroup);
    assert.equal(snapshot.activeGroupId, 'editor-group-b');
    assert.equal(snapshot.groupId, 'editor-group-b');
    assert.equal(snapshot.activeTabId, 'browser-b');
    assert.equal(snapshot.activeTab?.id, 'browser-b');
    assert.equal(secondGroup.tabs.length, 1);
    assert.deepEqual(secondGroup.mruTabIds, ['browser-b']);
  } finally {
    model.dispose();
  }
});

test('editor model can close other tabs, rename a tab, preserve a custom title, and close all tabs', () => {
  const model = createEditorModel({
    groups: [
      {
        groupId: DEFAULT_EDITOR_GROUP_ID,
        tabs: [
          {
            id: 'draft-a',
            kind: 'draft',
            title: 'Draft A',
            document: createWritingEditorDocumentFromPlainText('alpha'),
            viewMode: 'draft',
          },
          {
            id: 'browser-a',
            kind: 'browser',
            title: 'example.com/article',
            url: 'https://example.com/article',
          },
          {
            id: 'pdf-a',
            kind: 'pdf',
            title: 'example.com/paper.pdf',
            url: 'https://example.com/paper.pdf',
          },
        ],
        activeTabId: 'browser-a',
        mruTabIds: ['browser-a', 'pdf-a', 'draft-a'],
      },
    ],
    activeGroupId: DEFAULT_EDITOR_GROUP_ID,
    viewStateEntries: [],
  });

  try {
    model.closeOtherTabs('browser-a');
    let snapshot = model.getSnapshot();

    assert.deepEqual(
      snapshot.tabs.map((tab) => tab.id),
      ['browser-a'],
    );
    assert.equal(snapshot.activeTabId, 'browser-a');
    assert.deepEqual(snapshot.mruTabIds, ['browser-a']);

    model.renameTab('browser-a', 'Pinned Article');
    model.updateActiveContentTabUrl('https://example.com/next');
    snapshot = model.getSnapshot();

    assert.equal(snapshot.tabs[0]?.title, 'Pinned Article');
    assert.equal(snapshot.tabs[0]?.kind, 'browser');
    assert.equal(snapshot.tabs[0]?.url, 'https://example.com/next');

    model.closeAllTabs();
    snapshot = model.getSnapshot();

    assert.equal(snapshot.tabs.length, 0);
    assert.equal(snapshot.activeTabId, null);
    assert.equal(snapshot.activeTab, null);
    assert.deepEqual(snapshot.mruTabIds, []);
  } finally {
    model.dispose();
  }
});

test('editor model tracks dirty draft tabs against explicit save checkpoints', () => {
  const model = createEditorModel({
    groups: [
      {
        groupId: DEFAULT_EDITOR_GROUP_ID,
        tabs: [
          {
            id: 'draft-a',
            kind: 'draft',
            title: 'Draft A',
            document: createWritingEditorDocumentFromPlainText('alpha'),
            viewMode: 'draft',
          },
        ],
        activeTabId: 'draft-a',
        mruTabIds: ['draft-a'],
      },
    ],
    activeGroupId: DEFAULT_EDITOR_GROUP_ID,
    viewStateEntries: [],
  });

  try {
    assert.deepEqual(model.getSnapshot().dirtyDraftTabIds, []);
    assert.equal(model.canSaveActiveDraft(), true);

    model.setDraftDocument(createWritingEditorDocumentFromPlainText('beta'));
    assert.deepEqual(model.getSnapshot().dirtyDraftTabIds, ['draft-a']);
    assert.equal(model.canSaveActiveDraft(), true);

    const didSave = model.saveActiveDraft();
    assert.equal(didSave, true);
    assert.deepEqual(model.getSnapshot().dirtyDraftTabIds, []);
    assert.equal(model.canSaveActiveDraft(), true);
  } finally {
    model.dispose();
  }
});

test('editor model restores saved draft checkpoints from persisted workspace state', () => {
  const localStorage = createLocalStorage({
    'ls.writingWorkspace.state': JSON.stringify({
      groups: [
        {
          groupId: 'editor-group-a',
          inputs: [
            {
              id: 'draft-a',
              kind: 'draft',
              title: 'Draft A',
              viewMode: 'draft',
            },
          ],
          activeTabId: 'draft-a',
          mruTabIds: ['draft-a'],
        },
      ],
      activeGroupId: 'editor-group-a',
      draftStateByInputId: {
        'draft-a': {
          title: 'Draft A',
          viewMode: 'draft',
          document: createWritingEditorDocumentFromPlainText('changed'),
        },
      },
      savedDraftStateByInputId: {
        'draft-a': {
          title: 'Draft A',
          viewMode: 'draft',
          document: createWritingEditorDocumentFromPlainText('saved'),
        },
      },
      viewStateEntries: [],
    }),
  });
  const restoreWindow = installMockWindow(localStorage);

  try {
    const model = createEditorModel();
    assert.deepEqual(model.getSnapshot().dirtyDraftTabIds, ['draft-a']);
    model.dispose();
  } finally {
    restoreWindow();
  }
});

test('editor model restores saved draft checkpoints from persisted document keys', () => {
  const localStorage = createLocalStorage({
    'ls.writingWorkspace.state': JSON.stringify({
      groups: [
        {
          groupId: 'editor-group-a',
          inputs: [
            {
              id: 'draft-a',
              kind: 'draft',
              title: 'Draft A',
              viewMode: 'draft',
            },
          ],
          activeTabId: 'draft-a',
          mruTabIds: ['draft-a'],
        },
      ],
      activeGroupId: 'editor-group-a',
      draftStateByInputId: {
        'draft-a': {
          title: 'Draft A',
          viewMode: 'draft',
          document: createWritingEditorDocumentFromPlainText('changed'),
        },
      },
      savedDraftStateByInputId: {
        'draft-a': {
          title: 'Draft A',
          viewMode: 'draft',
          documentKey: JSON.stringify(
            createWritingEditorDocumentFromPlainText('saved'),
          ),
        },
      },
      viewStateEntries: [],
    }),
  });
  const restoreWindow = installMockWindow(localStorage);

  try {
    const model = createEditorModel();
    assert.deepEqual(model.getSnapshot().dirtyDraftTabIds, ['draft-a']);
    model.dispose();
  } finally {
    restoreWindow();
  }
});
