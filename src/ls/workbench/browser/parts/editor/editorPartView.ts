import { jsx, jsxs } from 'react/jsx-runtime';
import { type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { FilePenLine, FileText, Globe, Plus, X } from 'lucide-react';
import { Button } from '../../../../base/browser/ui/button/button';
import type {
  WritingEditorDocument,
  WritingWorkspaceDraftTab,
  WritingWorkspaceTab,
} from '../../writingEditorModel';
import { WORKBENCH_PART_IDS, useWorkbenchPartRef } from '../../layout';
import type { WritingEditorSurfaceLabels } from './prosemirror/prosemirrorEditor';
import type { ViewPartProps } from '../views/viewPartView';
import { resolveEditorPane } from './panes/editorPaneRegistry';
import './media/editor.css';

export type EditorPartLabels = {
  draftMode: string;
  sourceMode: string;
  pdfMode: string;
  close: string;
  draftBodyPlaceholder: string;
  sourceTitle: string;
  pdfTitle: string;
} & WritingEditorSurfaceLabels;

export type EditorPartProps = {
  labels: EditorPartLabels;
  viewPartProps: ViewPartProps;
  tabs: WritingWorkspaceTab[];
  activeTabId: string | null;
  activeTab: WritingWorkspaceTab | null;
  onActivateTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCreateDraftTab: () => void;
  onCreatePdfTab: () => void;
  onDraftDocumentChange: (value: WritingEditorDocument) => void;
};

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

  if (tab.kind === 'pdf') {
    return tab.title.trim() || labels.pdfMode;
  }

  return tab.title.trim() || labels.sourceMode;
}

function renderEditorContent(props: EditorPartProps) {
  const {
    labels,
    tabs,
    activeTabId,
    activeTab,
    onActivateTab,
    onCloseTab,
    onCreateDraftTab,
  } = props;

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
                    : tab.kind === 'pdf'
                      ? jsx(FileText, { size: 14, strokeWidth: 1.8 })
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

  const resolvedPane = resolveEditorPane(activeTab, {
    labels: props.labels,
    viewPartProps: props.viewPartProps,
    onDraftDocumentChange: props.onDraftDocumentChange,
  });
  const editorContentClassName = ['editor-content', ...resolvedPane.contentClassNames].join(' ');

  return jsxs('div', {
    className: 'editor-shell',
    children: [
      jsxs('div', {
        className: 'editor-toolbar',
        children: [tabStripView],
      }),
      jsx('div', {
        className: editorContentClassName,
        'data-editor-pane': resolvedPane.paneId,
        children: resolvedPane.view,
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
