import type { LocaleMessages } from '../../../../../language/locales';
import type { RagAnswerResult } from '../../../../base/parts/sandbox/common/desktopTypes.js';
import type { WritingEditorDocument, WritingEditorViewMode } from '../../writingEditorModel';
import type { ViewPartProps } from '../views/viewPartView';
import type { EditorPartProps } from './editorPartView';

export type EditorPartState = {
  ui: LocaleMessages;
  viewPartProps: ViewPartProps;
  isKnowledgeBaseModeEnabled: boolean;
  draftTitle: string;
  draftDocument: WritingEditorDocument;
  viewMode: WritingEditorViewMode;
  latestAssistantResult: RagAnswerResult | null;
  stats: {
    wordCount: number;
    characterCount: number;
    paragraphCount: number;
  };
};

export type EditorPartActions = {
  onDraftTitleChange: (value: string) => void;
  onDraftDocumentChange: (value: WritingEditorDocument) => void;
  onViewModeChange: (mode: WritingEditorViewMode) => void;
  onClearDraft: () => void;
};

type CreateEditorPartPropsParams = {
  state: EditorPartState;
  actions: EditorPartActions;
};

export function createEditorPartProps({
  state: {
    ui,
    viewPartProps,
    isKnowledgeBaseModeEnabled,
    draftTitle,
    draftDocument,
    viewMode,
    latestAssistantResult,
    stats,
  },
  actions: {
    onDraftTitleChange,
    onDraftDocumentChange,
    onViewModeChange,
    onClearDraft,
  },
}: CreateEditorPartPropsParams): EditorPartProps {
  return {
    labels: {
      title: ui.editorTitle,
      draftMode: ui.editorDraftMode,
      splitMode: ui.editorSplitMode,
      sourceMode: ui.editorSourceMode,
      knowledgeBaseModeOn: ui.assistantSidebarModeOn,
      knowledgeBaseModeOff: ui.assistantSidebarModeOff,
      draftTitle: ui.editorDraftTitle,
      draftTitlePlaceholder: ui.editorDraftTitlePlaceholder,
      draftBodyPlaceholder: ui.editorDraftBodyPlaceholder,
      wordCount: ui.editorWordCount,
      characterCount: ui.editorCharacterCount,
      paragraphCount: ui.editorParagraphCount,
      clearDraft: ui.editorClearDraft,
      latestAssistant: ui.editorLatestAssistant,
      insertAssistantAnswer: ui.editorInsertAssistantAnswer,
      insertAssistantEvidence: ui.editorInsertAssistantEvidence,
      sourceTitle: ui.editorSourceTitle,
      emptyAssistant: ui.editorNoAssistantYet,
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
    isKnowledgeBaseModeEnabled,
    draftTitle,
    draftDocument,
    viewMode,
    latestAssistantResult,
    stats,
    onDraftTitleChange,
    onDraftDocumentChange,
    onViewModeChange,
    onClearDraft,
  };
}
