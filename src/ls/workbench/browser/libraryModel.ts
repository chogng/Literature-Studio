import { useCallback, useEffect, useState } from 'react';
import type {
  ElectronInvoke,
  LibraryDocumentsResult,
} from '../../base/parts/sandbox/common/desktopTypes.js';

type UseLibraryModelParams = {
  desktopRuntime: boolean;
  invokeDesktop: ElectronInvoke;
};

const emptyLibraryDocumentsResult: LibraryDocumentsResult = {
  items: [],
  totalCount: 0,
  fileCount: 0,
  queuedJobCount: 0,
  libraryDbFile: '',
  defaultManagedDirectory: '',
  ragCacheDir: '',
};

export function useLibraryModel({
  desktopRuntime,
  invokeDesktop,
}: UseLibraryModelParams) {
  const [snapshot, setSnapshot] = useState<LibraryDocumentsResult>(emptyLibraryDocumentsResult);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);

  const refreshLibrary = useCallback(async () => {
    if (!desktopRuntime) {
      setSnapshot(emptyLibraryDocumentsResult);
      return;
    }

    setIsLibraryLoading(true);
    try {
      const nextSnapshot = await invokeDesktop<LibraryDocumentsResult>('list_library_documents', {
        limit: 8,
      });
      setSnapshot(nextSnapshot);
    } catch (error) {
      console.error('Failed to load library overview.', error);
    } finally {
      setIsLibraryLoading(false);
    }
  }, [desktopRuntime, invokeDesktop]);

  useEffect(() => {
    void refreshLibrary();
  }, [refreshLibrary]);

  return {
    librarySnapshot: snapshot,
    isLibraryLoading,
    refreshLibrary,
  };
}
