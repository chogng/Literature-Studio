import { useCallback, useEffect, useMemo, useState } from 'react';

export type WritingEditorViewMode = 'draft' | 'split' | 'source';

const draftStorageKeys = {
  title: 'ls.writingDraft.title',
  body: 'ls.writingDraft.body',
  viewMode: 'ls.writingDraft.viewMode',
} as const;

function readStoredValue(key: string): string {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    return window.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function readStoredViewMode(): WritingEditorViewMode {
  const value = readStoredValue(draftStorageKeys.viewMode);
  if (value === 'draft' || value === 'split' || value === 'source') {
    return value;
  }

  return 'split';
}

function persistDraftValue(key: string, value: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (value) {
      window.localStorage.setItem(key, value);
      return;
    }

    window.localStorage.removeItem(key);
  } catch {
    // Ignore local storage failures so the editor still works in restricted runtimes.
  }
}

export function useWritingEditorModel() {
  const [draftTitle, setDraftTitle] = useState(() => readStoredValue(draftStorageKeys.title));
  const [draftBody, setDraftBody] = useState(() => readStoredValue(draftStorageKeys.body));
  const [viewMode, setViewMode] = useState<WritingEditorViewMode>(() => readStoredViewMode());

  useEffect(() => {
    persistDraftValue(draftStorageKeys.title, draftTitle);
  }, [draftTitle]);

  useEffect(() => {
    persistDraftValue(draftStorageKeys.body, draftBody);
  }, [draftBody]);

  useEffect(() => {
    persistDraftValue(draftStorageKeys.viewMode, viewMode);
  }, [viewMode]);

  const clearDraft = useCallback(() => {
    setDraftTitle('');
    setDraftBody('');
  }, []);

  const stats = useMemo(() => {
    const normalizedBody = draftBody.trim();
    const characterCount = normalizedBody.replace(/\s+/g, '').length;
    const wordCount = normalizedBody ? normalizedBody.split(/\s+/).filter(Boolean).length : 0;
    const paragraphCount = normalizedBody ? normalizedBody.split(/\n{2,}/).filter(Boolean).length : 0;

    return {
      characterCount,
      wordCount,
      paragraphCount,
    };
  }, [draftBody]);

  return {
    draftTitle,
    setDraftTitle,
    draftBody,
    setDraftBody,
    viewMode,
    setViewMode,
    clearDraft,
    stats,
  };
}
