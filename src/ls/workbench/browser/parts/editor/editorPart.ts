import { useCallback, useMemo } from 'react';
import type { LocaleMessages } from '../../../../../language/locales';
import { normalizeUrl } from '../../../common/url';
import {
  createPreviewSurfaceSnapshot,
  resolvePreviewSourceUrl,
} from '../../previewSurfaceState';
import { preparePdfDownload } from '../../../services/document/documentActionService';
import { useWritingEditorModel } from '../../writingEditorModel';
import type {
  WritingEditorDocument,
  WritingWorkspaceTab,
} from '../../writingEditorModel';
import type { ViewPartProps } from '../views/viewPartView';
import type { EditorPartProps } from './editorPartView';

export type EditorPartState = {
  ui: LocaleMessages;
  viewPartProps: ViewPartProps;
  tabs: WritingWorkspaceTab[];
  activeTabId: string | null;
  activeTab: WritingWorkspaceTab | null;
};

export type EditorPartActions = {
  onActivateTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCreateDraftTab: () => void;
  onCreatePdfTab: () => void;
  onDraftDocumentChange: (value: WritingEditorDocument) => void;
};

type UseEditorPartModelParams = {
  ui: LocaleMessages;
  viewPartProps: ViewPartProps;
  browserUrl: string;
  webUrl: string;
};

export type EditorPartModel = ReturnType<typeof useEditorPartModel>;

type CreateEditorPartPropsParams = {
  state: EditorPartState;
  actions: EditorPartActions;
};

export function createEditorPartProps({
  state: {
    ui,
    viewPartProps,
    tabs,
    activeTabId,
    activeTab,
  },
  actions: {
    onActivateTab,
    onCloseTab,
    onCreateDraftTab,
    onCreatePdfTab,
    onDraftDocumentChange,
    },
}: CreateEditorPartPropsParams): EditorPartProps {
  return {
    labels: {
      draftMode: ui.editorDraftMode,
      sourceMode: ui.editorSourceMode,
      pdfMode: ui.editorPdfMode,
      close: ui.toastClose,
      draftBodyPlaceholder: ui.editorDraftBodyPlaceholder,
      sourceTitle: ui.editorSourceTitle,
      pdfTitle: ui.editorPdfTitle,
      status: {
        statusbarAriaLabel: ui.editorStatusbarAriaLabel,
        words: ui.editorStatusWords,
        characters: ui.editorStatusCharacters,
        paragraphs: ui.editorStatusParagraphs,
        selection: ui.editorStatusSelection,
        block: ui.editorStatusBlock,
        line: ui.editorStatusLine,
        column: ui.editorStatusColumn,
        url: ui.editorStatusUrl,
        blockFigure: ui.editorStatusFigure,
        ready: ui.statusReady,
      },
      paragraph: ui.editorParagraph,
      heading1: ui.editorHeading1,
      heading2: ui.editorHeading2,
      heading3: ui.editorHeading3,
      bold: ui.editorBold,
      italic: ui.editorItalic,
      bulletList: ui.editorBulletList,
      orderedList: ui.editorOrderedList,
      blockquote: ui.editorBlockquote,
      undo: ui.editorUndo,
      redo: ui.editorRedo,
      insertCitation: ui.editorInsertCitation,
      insertFigure: ui.editorInsertFigure,
      insertFigureRef: ui.editorInsertFigureRef,
      citationPrompt: ui.editorCitationPrompt,
      figureUrlPrompt: ui.editorFigureUrlPrompt,
      figureCaptionPrompt: ui.editorFigureCaptionPrompt,
      figureRefPrompt: ui.editorFigureRefPrompt,
    },
    viewPartProps,
    tabs,
    activeTabId,
    activeTab,
    onActivateTab,
    onCloseTab,
    onCreateDraftTab,
    onCreatePdfTab,
    onDraftDocumentChange,
  };
}

function looksLikePdfUrl(url: string) {
  const normalized = url.trim().toLowerCase();
  return (
    normalized.includes('.pdf') ||
    normalized.includes('/pdf') ||
    normalized.includes('format=pdf') ||
    normalized.includes('download=pdf')
  );
}

export function useEditorPartModel({
  ui,
  viewPartProps,
  browserUrl,
  webUrl,
}: UseEditorPartModelParams) {
  const {
    tabs,
    activeTabId,
    activeTab,
    setDraftDocument,
    draftBody,
    activateTab,
    closeTab,
    createDraftTab,
    createWebTab,
    createPdfTab,
    updateActivePreviewTabUrl,
  } = useWritingEditorModel();

  // The editor part is the boundary where workbench-level preview state and
  // workspace tab state are composed into one editor-facing model.
  const previewSurfaceSnapshot = useMemo(
    () => createPreviewSurfaceSnapshot(activeTab),
    [activeTab],
  );

  const handleCreatePdfTab = useCallback(() => {
    const seedUrl = resolvePreviewSourceUrl(
      previewSurfaceSnapshot,
      browserUrl,
      webUrl,
    );
    const preparedPdfDownload = seedUrl ? preparePdfDownload(seedUrl) : null;
    const defaultPdfUrl = preparedPdfDownload?.preferredPdfUrl ?? '';
    const shouldPromptForUrl =
      !defaultPdfUrl ||
      (preparedPdfDownload?.normalizedSourceUrl === defaultPdfUrl &&
        !looksLikePdfUrl(defaultPdfUrl));
    const nextInput = shouldPromptForUrl
      ? window.prompt(ui.editorPdfUrlPrompt, defaultPdfUrl || 'https://') ?? ''
      : defaultPdfUrl;
    const normalizedPdfUrl = normalizeUrl(nextInput);
    if (!normalizedPdfUrl) {
      return;
    }

    createPdfTab(normalizedPdfUrl);
  }, [
    browserUrl,
    createPdfTab,
    previewSurfaceSnapshot,
    ui.editorPdfUrlPrompt,
    webUrl,
  ]);

  const editorPartProps = useMemo(
    () =>
      createEditorPartProps({
        state: {
          ui,
          viewPartProps,
          tabs,
          activeTabId,
          activeTab,
        },
        actions: {
          onActivateTab: activateTab,
          onCloseTab: closeTab,
          onCreateDraftTab: createDraftTab,
          onCreatePdfTab: handleCreatePdfTab,
          onDraftDocumentChange: setDraftDocument,
        },
      }),
    [
      activateTab,
      activeTab,
      activeTabId,
      closeTab,
      createDraftTab,
      handleCreatePdfTab,
      setDraftDocument,
      tabs,
      ui,
      viewPartProps,
    ],
  );

  return {
    tabs,
    activeTabId,
    activeTab,
    draftBody,
    setDraftDocument,
    activateTab,
    closeTab,
    createDraftTab,
    createWebTab,
    previewSurfaceSnapshot,
    updateActivePreviewTabUrl,
    editorPartProps,
  };
}
