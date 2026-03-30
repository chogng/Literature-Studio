import { jsx, jsxs } from 'react/jsx-runtime';
import { useEffect, useState, useSyncExternalStore } from 'react';
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
  type EditorStatusState,
} from './editorStatus';
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
  onStatusChange?: (status: EditorStatusState) => void;
};

type EditorGroupControllerSnapshot = {
  group: EditorGroupModel;
  editorStatus: EditorStatusState;
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

function createEditorStatusLabels(labels: EditorPartLabels) {
  return {
    draftMode: labels.draftMode,
    sourceMode: labels.sourceMode,
    pdfMode: labels.pdfMode,
    paragraph: labels.paragraph,
    heading1: labels.heading1,
    heading2: labels.heading2,
    heading3: labels.heading3,
    bulletList: labels.bulletList,
    orderedList: labels.orderedList,
    blockquote: labels.blockquote,
    undo: labels.undo,
    redo: labels.redo,
    statusbarAriaLabel: labels.status.statusbarAriaLabel,
    words: labels.status.words,
    characters: labels.status.characters,
    paragraphs: labels.status.paragraphs,
    selection: labels.status.selection,
    block: labels.status.block,
    line: labels.status.line,
    column: labels.status.column,
    url: labels.status.url,
    blockFigure: labels.status.blockFigure,
    ready: labels.status.ready,
  };
}

function createEditorGroupControllerSnapshot(
  context: EditorGroupViewProps,
  draftStatusByTabId: Record<string, DraftEditorRuntimeState>,
): EditorGroupControllerSnapshot {
  const group = createEditorGroupModel({
    tabs: context.tabs,
    activeTabId: context.activeTabId,
    activeTab: context.activeTab,
    labels: context.labels,
  });
  const activeDraftStatus =
    group.activeTab?.kind === 'draft' ? draftStatusByTabId[group.activeTab.id] : undefined;

  return {
    group,
    editorStatus: createEditorStatus(
      group.activeTab,
      createEditorStatusLabels(context.labels),
      activeDraftStatus,
    ),
  };
}

function createEditorGroupSnapshotKey(snapshot: EditorGroupControllerSnapshot) {
  return JSON.stringify({
    tabs: snapshot.group.tabs,
    activeTabId: snapshot.group.activeTabId,
    activeTab: snapshot.group.activeTab
      ? {
          id: snapshot.group.activeTab.id,
          kind: snapshot.group.activeTab.kind,
        }
      : null,
    editorStatus: snapshot.editorStatus,
  });
}

class EditorGroupController {
  private context: EditorGroupViewProps;
  private draftStatusByTabId: Record<string, DraftEditorRuntimeState> = {};
  private snapshot: EditorGroupControllerSnapshot;
  private snapshotKey: string;
  private readonly listeners = new Set<() => void>();

  constructor(context: EditorGroupViewProps) {
    this.context = context;
    this.snapshot = createEditorGroupControllerSnapshot(
      this.context,
      this.draftStatusByTabId,
    );
    this.snapshotKey = createEditorGroupSnapshotKey(this.snapshot);
  }

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = () => this.snapshot;

  readonly setContext = (context: EditorGroupViewProps) => {
    this.context = context;
    this.pruneDraftStatuses();
    this.refreshSnapshot();
  };

  readonly dispose = () => {
    this.listeners.clear();
  };

  readonly updateDraftStatus = (tabId: string, nextStatus: DraftEditorRuntimeState) => {
    if (areDraftEditorRuntimeStatesEqual(this.draftStatusByTabId[tabId], nextStatus)) {
      return;
    }

    this.draftStatusByTabId = {
      ...this.draftStatusByTabId,
      [tabId]: nextStatus,
    };
    this.refreshSnapshot();
  };

  private emitChange() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private pruneDraftStatuses() {
    const draftTabIds = new Set(
      this.context.tabs
        .filter((tab) => tab.kind === 'draft')
        .map((tab) => tab.id),
    );
    const nextDraftStatusByTabId = Object.fromEntries(
      Object.entries(this.draftStatusByTabId).filter(([tabId]) =>
        draftTabIds.has(tabId),
      ),
    ) as Record<string, DraftEditorRuntimeState>;

    if (
      Object.keys(nextDraftStatusByTabId).length ===
      Object.keys(this.draftStatusByTabId).length
    ) {
      return;
    }

    this.draftStatusByTabId = nextDraftStatusByTabId;
  }

  private refreshSnapshot() {
    const nextSnapshot = createEditorGroupControllerSnapshot(
      this.context,
      this.draftStatusByTabId,
    );
    const nextSnapshotKey = createEditorGroupSnapshotKey(nextSnapshot);
    if (nextSnapshotKey === this.snapshotKey) {
      return;
    }

    this.snapshot = nextSnapshot;
    this.snapshotKey = nextSnapshotKey;
    this.emitChange();
  }
}

export function EditorGroupView(props: EditorGroupViewProps) {
  const [controller] = useState(() => new EditorGroupController(props));

  useEffect(() => {
    controller.setContext(props);
  }, [controller, props]);

  useEffect(() => {
    return () => {
      controller.dispose();
    };
  }, [controller]);

  const { group, editorStatus } = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  useEffect(() => {
    props.onStatusChange?.(editorStatus);
  }, [editorStatus, props.onStatusChange]);

  const titleAreaControl = createTitleAreaControl(props, group);

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
      ],
    });
  }

  const resolvedPane = resolveEditorPane(group.activeTab, {
    labels: props.labels,
    viewPartProps: props.viewPartProps,
    onDraftDocumentChange: props.onDraftDocumentChange,
    onDraftStatusChange: controller.updateDraftStatus,
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
    ],
  });
}
