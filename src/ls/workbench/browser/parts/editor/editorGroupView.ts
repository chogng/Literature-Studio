import { jsx, jsxs } from 'react/jsx-runtime';
import { useCallback, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../../../base/browser/ui/button/button';
import type {
  WritingEditorDocument,
  WritingWorkspaceTab,
} from '../../writingEditorModel';
import type { ViewPartProps } from '../views/viewPartView';
import {
  areDraftEditorRuntimeStatesEqual,
  createEditorStatus,
  type DraftEditorRuntimeState,
} from './editorStatus';
import EditorStatusView from './editorStatusView';
import { resolveEditorPane } from './panes/editorPaneRegistry';
import type { EditorPartLabels } from './editorPartView';
import { createEditorGroupModel, type EditorGroupModel } from './editorGroupModel';
import { TabsTitleControl } from './tabsTitleControl';
import type { TitleControl } from './titleControl';

type EditorGroupViewProps = {
  labels: EditorPartLabels;
  viewPartProps: ViewPartProps;
  tabs: WritingWorkspaceTab[];
  activeTabId: string | null;
  activeTab: WritingWorkspaceTab | null;
  onActivateTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCreateDraftTab: () => void;
  onDraftDocumentChange: (value: WritingEditorDocument) => void;
};

function renderWorkspaceActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return jsx(Button, {
    type: 'button',
    className: 'editor-workspace-action-btn',
    variant: 'secondary',
    size: 'sm',
    mode: 'text',
    textMode: 'with',
    iconMode: 'with',
    leftIcon: jsx(Plus, { size: 14, strokeWidth: 1.8 }),
    onClick,
    children: label,
  });
}

function createTitleAreaControl(
  props: Pick<EditorGroupViewProps, 'labels' | 'onActivateTab' | 'onCloseTab'>,
  group: EditorGroupModel,
): TitleControl {
  const titleControlProps = {
    group,
    labels: {
      close: props.labels.close,
    },
    onActivateTab: props.onActivateTab,
    onCloseTab: props.onCloseTab,
  };

  return new TabsTitleControl(titleControlProps);
}

export function EditorGroupView(props: EditorGroupViewProps) {
  const [draftStatusByTabId, setDraftStatusByTabId] = useState<
    Record<string, DraftEditorRuntimeState>
  >({});
  const group = createEditorGroupModel({
    tabs: props.tabs,
    activeTabId: props.activeTabId,
    activeTab: props.activeTab,
    labels: props.labels,
  });
  const titleAreaControl = createTitleAreaControl(props, group);
  const handleDraftStatusChange = useCallback(
    (tabId: string, nextStatus: DraftEditorRuntimeState) => {
      setDraftStatusByTabId((current) => {
        if (areDraftEditorRuntimeStatesEqual(current[tabId], nextStatus)) {
          return current;
        }

        return {
          ...current,
          [tabId]: nextStatus,
        };
      });
    },
    [],
  );
  const editorStatusLabels = useMemo(
    () => ({
      draftMode: props.labels.draftMode,
      sourceMode: props.labels.sourceMode,
      pdfMode: props.labels.pdfMode,
      paragraph: props.labels.paragraph,
      heading1: props.labels.heading1,
      heading2: props.labels.heading2,
      heading3: props.labels.heading3,
      bulletList: props.labels.bulletList,
      orderedList: props.labels.orderedList,
      blockquote: props.labels.blockquote,
      undo: props.labels.undo,
      redo: props.labels.redo,
      statusbarAriaLabel: props.labels.status.statusbarAriaLabel,
      words: props.labels.status.words,
      characters: props.labels.status.characters,
      paragraphs: props.labels.status.paragraphs,
      selection: props.labels.status.selection,
      block: props.labels.status.block,
      line: props.labels.status.line,
      column: props.labels.status.column,
      url: props.labels.status.url,
      blockFigure: props.labels.status.blockFigure,
      ready: props.labels.status.ready,
    }),
    [props.labels],
  );
  const activeDraftStatus =
    group.activeTab?.kind === 'draft' ? draftStatusByTabId[group.activeTab.id] : undefined;
  const editorStatus = useMemo(
    () => createEditorStatus(group.activeTab, editorStatusLabels, activeDraftStatus),
    [activeDraftStatus, editorStatusLabels, group.activeTab],
  );

  if (!group.activeTab) {
    return jsxs('div', {
      className: 'editor-shell',
      children: [
        jsx('div', {
          className: 'editor-tabs-header',
          children: titleAreaControl.render(),
        }),
        jsx('div', {
          className: 'editor-empty-workspace',
          children: renderWorkspaceActionButton({
            label: props.labels.draftMode,
            onClick: props.onCreateDraftTab,
          }),
        }),
        jsx(EditorStatusView, {
          status: editorStatus,
        }),
      ],
    });
  }

  const resolvedPane = resolveEditorPane(group.activeTab, {
    labels: props.labels,
    viewPartProps: props.viewPartProps,
    onDraftDocumentChange: props.onDraftDocumentChange,
    onDraftStatusChange: handleDraftStatusChange,
  });
  const editorContentClassName = ['editor-content', ...resolvedPane.contentClassNames].join(' ');

  return jsxs('div', {
    className: 'editor-shell',
    children: [
      jsx('div', {
        className: 'editor-tabs-header',
        children: titleAreaControl.render(),
      }),
      jsx('div', {
        className: editorContentClassName,
        'data-editor-pane': resolvedPane.paneId,
        children: resolvedPane.view,
      }),
      jsx(EditorStatusView, {
        status: editorStatus,
      }),
    ],
  });
}
