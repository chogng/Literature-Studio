import type { LocaleMessages } from '../../../../../language/locales';
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
