import { jsx, jsxs } from 'react/jsx-runtime';
import type { WritingEditorDocument, WritingWorkspaceDraftTab } from '../../../writingEditorModel';
import type { DraftEditorRuntimeState } from '../editorStatus';
import type { EditorPartLabels } from '../editorPartView';
import ProseMirrorEditor from '../prosemirror/prosemirrorEditor';

export type DraftEditorPaneProps = {
  labels: EditorPartLabels;
  draftTab: WritingWorkspaceDraftTab;
  onDraftDocumentChange: (value: WritingEditorDocument) => void;
  onStatusChange?: (status: DraftEditorRuntimeState) => void;
};

export default function DraftEditorPane({
  labels,
  draftTab,
  onDraftDocumentChange,
  onStatusChange,
}: DraftEditorPaneProps) {
  return jsxs('div', {
    className: 'editor-draft-pane',
    children: [
      jsx(ProseMirrorEditor, {
        document: draftTab.document,
        placeholder: labels.draftBodyPlaceholder,
        statusLabels: {
          blockFigure: labels.status.blockFigure,
        },
        labels: {
          paragraph: labels.paragraph,
          heading1: labels.heading1,
          heading2: labels.heading2,
          heading3: labels.heading3,
          bold: labels.bold,
          italic: labels.italic,
          bulletList: labels.bulletList,
          orderedList: labels.orderedList,
          blockquote: labels.blockquote,
          undo: labels.undo,
          redo: labels.redo,
          insertCitation: labels.insertCitation,
          insertFigure: labels.insertFigure,
          insertFigureRef: labels.insertFigureRef,
          citationPrompt: labels.citationPrompt,
          figureUrlPrompt: labels.figureUrlPrompt,
          figureCaptionPrompt: labels.figureCaptionPrompt,
          figureRefPrompt: labels.figureRefPrompt,
        },
        onDocumentChange: onDraftDocumentChange,
        onStatusChange,
      }),
    ],
  });
}
