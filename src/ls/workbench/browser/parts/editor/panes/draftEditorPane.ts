import { jsx, jsxs } from 'react/jsx-runtime';
import { Suspense, lazy } from 'react';
import type { WritingEditorDocument, WritingWorkspaceDraftTab } from '../../../writingEditorModel';
import type { EditorPartLabels } from '../editorPartView';

const ProseMirrorEditor = lazy(() => import('../prosemirror/prosemirrorEditor'));

export type DraftEditorPaneProps = {
  labels: EditorPartLabels;
  draftTab: WritingWorkspaceDraftTab;
  onDraftDocumentChange: (value: WritingEditorDocument) => void;
};

export default function DraftEditorPane({
  labels,
  draftTab,
  onDraftDocumentChange,
}: DraftEditorPaneProps) {
  return jsxs('div', {
    className: 'editor-draft-pane',
    children: [
      jsx(Suspense, {
        fallback: jsx('div', {
          className: 'editor-loading-shell',
          children: jsx('div', {
            className: 'editor-loading-card',
            children: labels.draftBodyPlaceholder,
          }),
        }),
        children: jsx(ProseMirrorEditor, {
          document: draftTab.document,
          placeholder: labels.draftBodyPlaceholder,
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
        }),
      }),
    ],
  });
}
