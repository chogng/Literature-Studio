import {
  areEditorDraftStyleCatalogSnapshotsEqual,
  getEditorDraftStyleCatalogSnapshot,
  normalizeEditorDraftStyleCatalogSnapshot,
  type EditorDraftStyleCatalogSnapshot,
} from 'ls/editor/browser/text/editorDraftStyleCatalog';

export type EditorDraftStyleStoreSnapshot = EditorDraftStyleCatalogSnapshot;

type EditorDraftStyleStoreListener = () => void;

export class EditorDraftStyleStore {
  private snapshot: EditorDraftStyleStoreSnapshot;
  private readonly listeners = new Set<EditorDraftStyleStoreListener>();

  constructor(
    initialSnapshot: EditorDraftStyleStoreSnapshot = getEditorDraftStyleCatalogSnapshot(),
  ) {
    this.snapshot = normalizeEditorDraftStyleCatalogSnapshot(initialSnapshot);
  }

  getSnapshot() {
    return this.snapshot;
  }

  subscribe(listener: EditorDraftStyleStoreListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setSnapshot(nextSnapshot: EditorDraftStyleStoreSnapshot) {
    const normalizedSnapshot = normalizeEditorDraftStyleCatalogSnapshot(nextSnapshot);
    if (areEditorDraftStyleCatalogSnapshotsEqual(this.snapshot, normalizedSnapshot)) {
      return;
    }

    this.snapshot = normalizedSnapshot;
    this.emitChange();
  }

  resetToCatalog() {
    this.setSnapshot(getEditorDraftStyleCatalogSnapshot());
  }

  private emitChange() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export function createEditorDraftStyleStore(
  initialSnapshot: EditorDraftStyleStoreSnapshot = getEditorDraftStyleCatalogSnapshot(),
) {
  return new EditorDraftStyleStore(initialSnapshot);
}

export const editorDraftStyleStore = createEditorDraftStyleStore();
