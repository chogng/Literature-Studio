import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import { Suspense, lazy, useRef, type ChangeEvent, type ReactNode } from 'react';
import { Eraser, FilePenLine, Highlighter, PanelsLeftRight, Rows2 } from 'lucide-react';
import type { RagAnswerResult } from '../../../../base/parts/sandbox/common/desktopTypes.js';
import { Button } from '../../../../base/browser/ui/button/button';
import { Input } from '../../../../base/browser/ui/input/input';
import type { WritingEditorDocument, WritingEditorViewMode } from '../../writingEditorModel';
import { WORKBENCH_PART_IDS, useWorkbenchPartRef } from '../../layout';
import type { WritingEditorSurfaceHandle, WritingEditorSurfaceLabels } from './prosemirror/prosemirrorEditor';
import ViewPartView from '../views/viewPartView';
import type { ViewPartProps } from '../views/viewPartView';
import './media/editor.css';

const ProseMirrorEditor = lazy(() => import('./prosemirror/prosemirrorEditor'));

export type EditorPartLabels = {
  title: string;
  draftMode: string;
  splitMode: string;
  sourceMode: string;
  knowledgeBaseModeOn: string;
  knowledgeBaseModeOff: string;
  draftTitle: string;
  draftTitlePlaceholder: string;
  draftBodyPlaceholder: string;
  wordCount: string;
  characterCount: string;
  paragraphCount: string;
  clearDraft: string;
  latestAssistant: string;
  insertAssistantAnswer: string;
  insertAssistantEvidence: string;
  sourceTitle: string;
  emptyAssistant: string;
} & WritingEditorSurfaceLabels;

export type EditorPartProps = {
  labels: EditorPartLabels;
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
  onDraftTitleChange: (value: string) => void;
  onDraftDocumentChange: (value: WritingEditorDocument) => void;
  onViewModeChange: (mode: WritingEditorViewMode) => void;
  onClearDraft: () => void;
};

function formatAssistantEvidence(result: RagAnswerResult) {
  return result.evidence
    .map((item) =>
      [
        `- [${item.rank}] ${item.title}`,
        item.journalTitle || item.publishedAt
          ? `${[item.journalTitle, item.publishedAt].filter(Boolean).join(' | ')}`
          : '',
        item.excerpt,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n');
}

function renderModeButton({
  isActive,
  label,
  icon,
  onClick,
}: {
  isActive: boolean;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return jsx(Button, {
    type: 'button',
    className: ['editor-mode-btn', isActive ? 'is-active' : ''].filter(Boolean).join(' '),
    variant: isActive ? 'primary' : 'secondary',
    size: 'sm',
    mode: 'text',
    textMode: 'with',
    iconMode: 'with',
    leftIcon: icon,
    onClick,
    children: label,
  });
}

function DraftPane({
  labels,
  isKnowledgeBaseModeEnabled,
  draftTitle,
  draftDocument,
  latestAssistantResult,
  stats,
  onDraftTitleChange,
  onDraftDocumentChange,
  onClearDraft,
}: Pick<
  EditorPartProps,
  | 'labels'
  | 'isKnowledgeBaseModeEnabled'
  | 'draftTitle'
  | 'draftDocument'
  | 'latestAssistantResult'
  | 'stats'
  | 'onDraftTitleChange'
  | 'onDraftDocumentChange'
  | 'onClearDraft'
>) {
  const editorSurfaceRef = useRef<WritingEditorSurfaceHandle | null>(null);

  const handleInsertAssistantAnswer = () => {
    if (!latestAssistantResult?.answer) {
      return;
    }

    editorSurfaceRef.current?.insertPlainText(latestAssistantResult.answer.trim());
  };

  const handleInsertAssistantEvidence = () => {
    if (!latestAssistantResult || latestAssistantResult.evidence.length === 0) {
      return;
    }

    editorSurfaceRef.current?.insertPlainText(formatAssistantEvidence(latestAssistantResult));
  };

  return jsxs('div', {
    className: 'editor-draft-pane',
    children: [
      jsxs('div', {
        className: 'editor-draft-toolbar',
        children: [
          jsxs('div', {
            className: 'editor-draft-toolbar-main',
            children: [
              jsx('span', {
                className: `editor-mode-pill ${isKnowledgeBaseModeEnabled ? 'is-enabled' : 'is-disabled'}`,
                children: isKnowledgeBaseModeEnabled
                  ? labels.knowledgeBaseModeOn
                  : labels.knowledgeBaseModeOff,
              }),
              jsxs('div', {
                className: 'editor-stats',
                children: [
                  jsx('span', { children: `${labels.wordCount} ${stats.wordCount}` }),
                  jsx('span', { children: `${labels.characterCount} ${stats.characterCount}` }),
                  jsx('span', { children: `${labels.paragraphCount} ${stats.paragraphCount}` }),
                ],
              }),
            ],
          }),
          jsx(Button, {
            type: 'button',
            className: 'editor-clear-btn',
            variant: 'secondary',
            size: 'sm',
            mode: 'text',
            textMode: 'with',
            iconMode: 'with',
            leftIcon: jsx(Eraser, { size: 14, strokeWidth: 1.8 }),
            onClick: onClearDraft,
            children: labels.clearDraft,
          }),
        ],
      }),
      jsxs('label', {
        className: 'editor-title-field',
        children: [
          jsx('span', { className: 'editor-field-label', children: labels.draftTitle }),
          jsx(Input, {
            className: 'editor-title-input',
            size: 'sm',
            type: 'text',
            value: draftTitle,
            onChange: (event: ChangeEvent<HTMLInputElement>) => onDraftTitleChange(event.target.value),
            placeholder: labels.draftTitlePlaceholder,
          }),
        ],
      }),
      jsxs('div', {
        className: 'editor-assistant-card',
        children: [
          jsxs('div', {
            className: 'editor-assistant-card-header',
            children: [
              jsxs('div', {
                className: 'editor-assistant-card-title-wrap',
                children: [
                  jsx(FilePenLine, { size: 15, strokeWidth: 1.8 }),
                  jsx('strong', { children: labels.latestAssistant }),
                ],
              }),
              latestAssistantResult
                ? jsx('span', {
                    className: `editor-mode-pill ${latestAssistantResult.rerankApplied ? 'is-enabled' : 'is-disabled'}`,
                    children: latestAssistantResult.embeddingModel,
                  })
                : null,
            ],
          }),
          latestAssistantResult
            ? jsxs(Fragment, {
                children: [
                  jsx('p', {
                    className: 'editor-assistant-card-text',
                    children: latestAssistantResult.answer,
                  }),
                  jsxs('div', {
                    className: 'editor-assistant-actions',
                    children: [
                      jsx(Button, {
                        type: 'button',
                        variant: 'primary',
                        size: 'sm',
                        mode: 'text',
                        textMode: 'with',
                        iconMode: 'with',
                        leftIcon: jsx(FilePenLine, { size: 14, strokeWidth: 1.8 }),
                        onClick: handleInsertAssistantAnswer,
                        children: labels.insertAssistantAnswer,
                      }),
                      jsx(Button, {
                        type: 'button',
                        variant: 'secondary',
                        size: 'sm',
                        mode: 'text',
                        textMode: 'with',
                        iconMode: 'with',
                        leftIcon: jsx(Highlighter, { size: 14, strokeWidth: 1.8 }),
                        onClick: handleInsertAssistantEvidence,
                        disabled: latestAssistantResult.evidence.length === 0,
                        children: labels.insertAssistantEvidence,
                      }),
                    ],
                  }),
                ],
              })
            : jsx('p', {
                className: 'editor-assistant-card-empty',
                children: labels.emptyAssistant,
              }),
        ],
      }),
      jsx(Suspense, {
        fallback: jsx('div', {
          className: 'editor-loading-shell',
          children: jsx('div', {
            className: 'editor-loading-card',
            children: labels.draftBodyPlaceholder,
          }),
        }),
        children: jsx(ProseMirrorEditor, {
          ref: editorSurfaceRef,
          document: draftDocument,
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

function SourcePane({
  labels,
  viewPartProps,
}: Pick<EditorPartProps, 'labels' | 'viewPartProps'>) {
  return jsxs('div', {
    className: 'editor-source-pane',
    children: [
      jsxs('div', {
        className: 'editor-source-header',
        children: [jsx('strong', { children: labels.sourceTitle })],
      }),
      jsx('div', {
        className: 'editor-source-body',
        children: jsx(ViewPartView, { ...viewPartProps }),
      }),
    ],
  });
}

function renderEditorContent(props: EditorPartProps) {
  const { labels, viewMode, onViewModeChange } = props;

  const draftPane = jsx(DraftPane, { ...props });
  const sourcePane = jsx(SourcePane, { ...props });

  return jsxs('div', {
    className: 'editor-shell',
    children: [
      jsxs('div', {
        className: 'editor-toolbar',
        children: [
          jsxs('div', {
            className: 'editor-toolbar-title',
            children: [jsx('h2', { children: labels.title })],
          }),
          jsxs('div', {
            className: 'editor-mode-switcher',
            children: [
              renderModeButton({
                isActive: viewMode === 'draft',
                label: labels.draftMode,
                icon: jsx(FilePenLine, { size: 14, strokeWidth: 1.8 }),
                onClick: () => onViewModeChange('draft'),
              }),
              renderModeButton({
                isActive: viewMode === 'split',
                label: labels.splitMode,
                icon: jsx(PanelsLeftRight, { size: 14, strokeWidth: 1.8 }),
                onClick: () => onViewModeChange('split'),
              }),
              renderModeButton({
                isActive: viewMode === 'source',
                label: labels.sourceMode,
                icon: jsx(Rows2, { size: 14, strokeWidth: 1.8 }),
                onClick: () => onViewModeChange('source'),
              }),
            ],
          }),
        ],
      }),
      jsx('div', {
        className: ['editor-content', `is-mode-${viewMode}`].join(' '),
        children:
          viewMode === 'draft'
            ? draftPane
            : viewMode === 'source'
              ? sourcePane
              : jsxs(Fragment, {
                  children: [draftPane, sourcePane],
                }),
      }),
    ],
  });
}

export default function EditorPartView(props: EditorPartProps) {
  const editorPartRef = useWorkbenchPartRef(WORKBENCH_PART_IDS.editor);
  const editorContentView = renderEditorContent(props);

  return jsx('section', {
    ref: editorPartRef,
    className: 'panel web-panel',
    children: editorContentView,
  });
}
