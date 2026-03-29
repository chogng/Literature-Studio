import type { LocaleMessages } from '../../../../../language/locales';
import type { ViewPartProps } from '../views/viewPartView';
import type { EditorPartProps } from './editorPartView';
import type {
  RagAnswerResult,
} from '../../../../base/parts/sandbox/common/desktopTypes.js';
import type { WritingEditorViewMode } from '../../writingEditorModel';

export type EditorPartState = {
  ui: LocaleMessages;
  viewPartProps: ViewPartProps;
  isKnowledgeBaseModeEnabled: boolean;
  draftTitle: string;
  draftBody: string;
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
  onDraftBodyChange: (value: string) => void;
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
    draftBody,
    viewMode,
    latestAssistantResult,
    stats,
  },
  actions: {
    onDraftTitleChange,
    onDraftBodyChange,
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
    },
    viewPartProps,
    isKnowledgeBaseModeEnabled,
    draftTitle,
    draftBody,
    viewMode,
    latestAssistantResult,
    stats,
    onDraftTitleChange,
    onDraftBodyChange,
    onViewModeChange,
    onClearDraft,
  };
}
