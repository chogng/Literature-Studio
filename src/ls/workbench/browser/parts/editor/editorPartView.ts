import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import {
  Suspense,
  lazy,
  useRef,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import {
  Eraser,
  FilePenLine,
  Globe,
  Highlighter,
  PanelsLeftRight,
  Plus,
  X,
} from 'lucide-react';
import type { RagAnswerResult } from '../../../../base/parts/sandbox/common/desktopTypes.js';
import { Button } from '../../../../base/browser/ui/button/button';
import { Input } from '../../../../base/browser/ui/input/input';
import type {
  WritingEditorDocument,
  WritingEditorViewMode,
  WritingWorkspaceDraftTab,
  WritingWorkspaceTab,
} from '../../writingEditorModel';
import { WORKBENCH_PART_IDS, useWorkbenchPartRef } from '../../layout';
import type {
  WritingEditorSurfaceHandle,
  WritingEditorSurfaceLabels,
} from './prosemirror/prosemirrorEditor';
import ViewPartView from '../views/viewPartView';
import type { ViewPartProps } from '../views/viewPartView';
import './media/editor.css';

const ProseMirrorEditor = lazy(() => import('./prosemirror/prosemirrorEditor'));

export type EditorPartLabels = {
  title: string;
  draftMode: string;
  splitMode: string;
  sourceMode: string;
  close: string;
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
  tabs: WritingWorkspaceTab[];
  activeTabId: string | null;
  activeTab: WritingWorkspaceTab | null;
  canCreateWebTab: boolean;
  latestAssistantResult: RagAnswerResult | null;
  stats: {
    wordCount: number;
    characterCount: number;
    paragraphCount: number;
  };
  onActivateTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCreateDraftTab: () => void;
  onCreateWebTab: () => void;
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

function renderWorkspaceActionButton({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return jsx(Button, {
    type: 'button',
    className: 'editor-workspace-action-btn',
    variant: 'secondary',
    size: 'sm',
    mode: 'text',
    textMode: 'with',
    iconMode: 'with',
    leftIcon: icon,
    onClick,
    disabled,
    children: label,
  });
}

function getDraftTabDisplayLabel(
  tab: WritingWorkspaceDraftTab,
  labels: EditorPartLabels,
  index: number,
) {
  const normalizedTitle = tab.title.trim();
  return normalizedTitle || `${labels.draftMode} ${index + 1}`;
}

function getTabDisplayLabel(
  tab: WritingWorkspaceTab,
  labels: EditorPartLabels,
  draftIndex: number,
) {
  if (tab.kind === 'draft') {
    return getDraftTabDisplayLabel(tab, labels, draftIndex);
  }

  return tab.title.trim() || labels.sourceMode;
}

function DraftPane({
  labels,
  isKnowledgeBaseModeEnabled,
  draftTab,
  latestAssistantResult,
  stats,
  onDraftTitleChange,
  onDraftDocumentChange,
  onClearDraft,
}: Pick<
  EditorPartProps,
  | 'labels'
  | 'isKnowledgeBaseModeEnabled'
  | 'latestAssistantResult'
  | 'stats'
  | 'onDraftTitleChange'
  | 'onDraftDocumentChange'
  | 'onClearDraft'
> & {
  draftTab: WritingWorkspaceDraftTab;
}) {
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
            value: draftTab.title,
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

function SourcePane({
  viewPartProps,
  heading,
  subheading,
}: Pick<EditorPartProps, 'viewPartProps'> & {
  heading: string;
  subheading?: string;
}) {
  return jsxs('div', {
    className: 'editor-source-pane',
    children: [
      jsxs('div', {
        className: 'editor-source-header',
        children: [
          jsxs('div', {
            className: 'editor-source-heading',
            children: [
              jsx('strong', { children: heading }),
              subheading
                ? jsx('span', {
                    className: 'editor-source-subheading',
                    children: subheading,
                  })
                : null,
            ],
          }),
        ],
      }),
      jsx('div', {
        className: 'editor-source-body',
        children: jsx(ViewPartView, { ...viewPartProps }),
      }),
    ],
  });
}

function renderEditorContent(props: EditorPartProps) {
  const {
    labels,
    tabs,
    activeTabId,
    activeTab,
    canCreateWebTab,
    onActivateTab,
    onCloseTab,
    onCreateDraftTab,
    onCreateWebTab,
    onViewModeChange,
  } = props;

  const activeDraftTab = activeTab?.kind === 'draft' ? activeTab : null;
  const draftTabIds = tabs
    .filter((tab) => tab.kind === 'draft')
    .map((tab) => tab.id);

  const tabStripView = jsx('div', {
    className: 'editor-tab-strip',
    role: 'tablist',
    children: tabs.map((tab) => {
      const draftIndex =
        tab.kind === 'draft' ? draftTabIds.indexOf(tab.id) : -1;
      const tabLabel = getTabDisplayLabel(tab, labels, Math.max(draftIndex, 0));
      const isActive = tab.id === activeTabId;

      return jsxs(
        'div',
        {
          className: ['editor-tab', isActive ? 'is-active' : ''].filter(Boolean).join(' '),
          children: [
            jsx('button', {
              type: 'button',
              role: 'tab',
              className: 'editor-tab-main',
              'aria-selected': isActive,
              title: tabLabel,
              onClick: () => onActivateTab(tab.id),
              children: jsxs('span', {
                className: 'editor-tab-label',
                children: [
                  tab.kind === 'draft'
                    ? jsx(FilePenLine, { size: 14, strokeWidth: 1.8 })
                    : jsx(Globe, { size: 14, strokeWidth: 1.8 }),
                  jsx('span', {
                    className: 'editor-tab-label-text',
                    children: tabLabel,
                  }),
                ],
              }),
            }),
            jsx('button', {
              type: 'button',
              className: 'editor-tab-close',
              title: labels.close,
              onClick: (event: ReactMouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                onCloseTab(tab.id);
              },
              children: jsx(X, { size: 14, strokeWidth: 1.8 }),
            }),
          ],
        },
        tab.id,
      );
    }),
  });

  if (!activeTab) {
    return jsxs('div', {
      className: 'editor-shell',
      children: [
        jsx('div', {
          className: 'editor-toolbar',
          children: tabStripView,
        }),
        jsx('div', {
          className: 'editor-empty-workspace',
          children: renderWorkspaceActionButton({
            label: labels.draftMode,
            icon: jsx(Plus, { size: 14, strokeWidth: 1.8 }),
            onClick: onCreateDraftTab,
          }),
        }),
      ],
    });
  }

  const contentView =
    activeTab.kind === 'draft'
      ? activeTab.viewMode === 'draft'
        ? jsx(DraftPane, {
            ...props,
            draftTab: activeTab,
          })
        : jsxs(Fragment, {
            children: [
              jsx(DraftPane, {
                ...props,
                draftTab: activeTab,
              }),
              jsx(SourcePane, {
                viewPartProps: props.viewPartProps,
                heading: labels.sourceTitle,
              }),
            ],
          })
      : jsx(SourcePane, {
          viewPartProps: props.viewPartProps,
          heading: activeTab.title.trim() || labels.sourceMode,
          subheading: activeTab.url,
        });

  return jsxs('div', {
    className: 'editor-shell',
    children: [
      jsxs('div', {
        className: 'editor-toolbar',
        children: [
          jsxs('div', {
            className: 'editor-toolbar-head',
            children: [
              jsxs('div', {
                className: 'editor-toolbar-title',
                children: [jsx('h2', { children: labels.title })],
              }),
              jsxs('div', {
                className: 'editor-toolbar-actions',
                children: [
                  activeDraftTab
                    ? jsxs('div', {
                        className: 'editor-mode-switcher',
                        children: [
                          renderModeButton({
                            isActive: activeDraftTab.viewMode === 'draft',
                            label: labels.draftMode,
                            icon: jsx(FilePenLine, { size: 14, strokeWidth: 1.8 }),
                            onClick: () => onViewModeChange('draft'),
                          }),
                          renderModeButton({
                            isActive: activeDraftTab.viewMode === 'split',
                            label: labels.splitMode,
                            icon: jsx(PanelsLeftRight, { size: 14, strokeWidth: 1.8 }),
                            onClick: () => onViewModeChange('split'),
                          }),
                        ],
                      })
                    : null,
                  jsxs('div', {
                    className: 'editor-workspace-actions',
                    children: [
                      renderWorkspaceActionButton({
                        label: labels.draftMode,
                        icon: jsx(Plus, { size: 14, strokeWidth: 1.8 }),
                        onClick: onCreateDraftTab,
                      }),
                      renderWorkspaceActionButton({
                        label: labels.sourceMode,
                        icon: jsx(Globe, { size: 14, strokeWidth: 1.8 }),
                        onClick: onCreateWebTab,
                        disabled: !canCreateWebTab,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          tabStripView,
        ],
      }),
      jsx('div', {
        className: [
          'editor-content',
          activeTab.kind === 'draft'
            ? `is-mode-${activeTab.viewMode}`
            : 'is-mode-web',
        ].join(' '),
        children: contentView,
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
