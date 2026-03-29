import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collectWritingEditorStats,
  createEmptyWritingEditorDocument,
  createWritingEditorDocumentFromPlainText,
  normalizeWritingEditorDocument,
  type WritingEditorDocument,
  writingEditorDocumentToPlainText,
} from './writingEditorDocument';

export type { WritingEditorDocument } from './writingEditorDocument';

export type WritingEditorViewMode = 'draft' | 'split' | 'source';

const draftStorageKeys = {
  title: 'ls.writingDraft.title',
  body: 'ls.writingDraft.body',
  document: 'ls.writingDraft.document',
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

function readStoredDocument(): WritingEditorDocument {
  const rawDocument = readStoredValue(draftStorageKeys.document);
  if (rawDocument) {
    try {
      return normalizeWritingEditorDocument(JSON.parse(rawDocument));
    } catch {
      return createEmptyWritingEditorDocument();
    }
  }

  // Migrate legacy textarea drafts into the structured ProseMirror document once.
  const legacyBody = readStoredValue(draftStorageKeys.body);
  return legacyBody
    ? createWritingEditorDocumentFromPlainText(legacyBody)
    : createEmptyWritingEditorDocument();
}

export function useWritingEditorModel() {
  const [draftTitle, setDraftTitle] = useState(() => readStoredValue(draftStorageKeys.title));
  const [draftDocument, setDraftDocument] = useState<WritingEditorDocument>(() => readStoredDocument());
  const [viewMode, setViewMode] = useState<WritingEditorViewMode>(() => readStoredViewMode());

  useEffect(() => {
    persistDraftValue(draftStorageKeys.title, draftTitle);
  }, [draftTitle]);

  useEffect(() => {
    const normalizedDocument = normalizeWritingEditorDocument(draftDocument);
    persistDraftValue(draftStorageKeys.document, JSON.stringify(normalizedDocument));
    persistDraftValue(draftStorageKeys.body, writingEditorDocumentToPlainText(normalizedDocument));
  }, [draftDocument]);

  useEffect(() => {
    persistDraftValue(draftStorageKeys.viewMode, viewMode);
  }, [viewMode]);

  const clearDraft = useCallback(() => {
    setDraftTitle('');
    setDraftDocument(createEmptyWritingEditorDocument());
  }, []);

  const draftBody = useMemo(
    () => writingEditorDocumentToPlainText(draftDocument),
    [draftDocument],
  );

  const stats = useMemo(() => collectWritingEditorStats(draftDocument), [draftDocument]);

  return {
    draftTitle,
    setDraftTitle,
    draftDocument,
    setDraftDocument,
    draftBody,
    viewMode,
    setViewMode,
    clearDraft,
    stats,
  };
}
