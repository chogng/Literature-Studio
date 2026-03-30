import type {
  ElectronInvoke,
  LibraryDocumentsResult,
} from '../../base/parts/sandbox/common/desktopTypes.js';

export type LibraryModelContext = {
  desktopRuntime: boolean;
  invokeDesktop: ElectronInvoke;
};

export type LibraryModelSnapshot = {
  librarySnapshot: LibraryDocumentsResult;
  isLibraryLoading: boolean;
};

export const EMPTY_LIBRARY_DOCUMENTS_RESULT: LibraryDocumentsResult = {
  items: [],
  totalCount: 0,
  fileCount: 0,
  queuedJobCount: 0,
  libraryDbFile: '',
  defaultManagedDirectory: '',
  ragCacheDir: '',
};

const DEFAULT_LIBRARY_MODEL_SNAPSHOT: LibraryModelSnapshot = {
  librarySnapshot: EMPTY_LIBRARY_DOCUMENTS_RESULT,
  isLibraryLoading: false,
};

export class LibraryModel {
  private context: LibraryModelContext;
  private snapshot: LibraryModelSnapshot = DEFAULT_LIBRARY_MODEL_SNAPSHOT;
  private listeners = new Set<() => void>();
  private refreshSequence = 0;
  private started = false;
  private disposed = false;

  constructor(context: LibraryModelContext) {
    this.context = context;
  }

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = () => this.snapshot;

  readonly setContext = (context: LibraryModelContext) => {
    this.context = context;
  };

  readonly start = () => {
    if (this.started) {
      return;
    }

    this.started = true;
    void this.refresh();
  };

  readonly refresh = async () => {
    const sequence = ++this.refreshSequence;

    if (!this.context.desktopRuntime) {
      this.setSnapshot({
        librarySnapshot: EMPTY_LIBRARY_DOCUMENTS_RESULT,
        isLibraryLoading: false,
      });
      return;
    }

    this.setSnapshot({
      librarySnapshot: this.snapshot.librarySnapshot,
      isLibraryLoading: true,
    });

    const { invokeDesktop } = this.context;
    try {
      const nextSnapshot = await invokeDesktop<LibraryDocumentsResult>('list_library_documents', {
        limit: 8,
      });

      if (!this.shouldApplySnapshot(sequence)) {
        return;
      }

      this.setSnapshot({
        librarySnapshot: nextSnapshot,
        isLibraryLoading: false,
      });
    } catch (error) {
      if (!this.shouldApplySnapshot(sequence)) {
        return;
      }

      console.error('Failed to load library overview.', error);
      this.setSnapshot({
        librarySnapshot: this.snapshot.librarySnapshot,
        isLibraryLoading: false,
      });
    }
  };

  readonly dispose = () => {
    this.disposed = true;
    this.listeners.clear();
  };

  private emitChange() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private shouldApplySnapshot(sequence: number) {
    return !this.disposed && sequence === this.refreshSequence;
  }

  private setSnapshot(nextSnapshot: LibraryModelSnapshot) {
    if (
      this.snapshot.librarySnapshot === nextSnapshot.librarySnapshot &&
      this.snapshot.isLibraryLoading === nextSnapshot.isLibraryLoading
    ) {
      return;
    }

    this.snapshot = nextSnapshot;
    this.emitChange();
  }
}

export function createLibraryModel(context: LibraryModelContext) {
  return new LibraryModel(context);
}
