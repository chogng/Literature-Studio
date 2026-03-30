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
import { resolveEditorPane, type EditorPaneRenderer } from './panes/editorPaneRegistry';
import { EditorEmptyWorkspaceView } from './editorEmptyWorkspaceView';
import type { EditorPartLabels } from './editorPartView';
import { createEditorGroupModel, type EditorGroupModel } from './editorGroupModel';
import { TabsTitleControl } from './tabsTitleControl';
import type { TitleControl } from './titleControl';

export type EditorGroupViewProps = {
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

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  return element;
}

function createTitleAreaControl(
  props: Pick<EditorGroupViewProps, 'labels' | 'onActivateTab' | 'onCloseTab'>,
  group: EditorGroupModel,
): TitleControl {
  return new TabsTitleControl({
    group,
    labels: {
      close: props.labels.close,
    },
    onActivateTab: props.onActivateTab,
    onCloseTab: props.onCloseTab,
  });
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

  constructor(context: EditorGroupViewProps) {
    this.context = context;
    this.snapshot = createEditorGroupControllerSnapshot(
      this.context,
      this.draftStatusByTabId,
    );
    this.snapshotKey = createEditorGroupSnapshotKey(this.snapshot);
  }

  getSnapshot() {
    return this.snapshot;
  }

  setContext(context: EditorGroupViewProps) {
    this.context = context;
    this.pruneDraftStatuses();
    this.refreshSnapshot();
  }

  updateDraftStatus = (tabId: string, nextStatus: DraftEditorRuntimeState) => {
    if (areDraftEditorRuntimeStatesEqual(this.draftStatusByTabId[tabId], nextStatus)) {
      return;
    }

    this.draftStatusByTabId = {
      ...this.draftStatusByTabId,
      [tabId]: nextStatus,
    };
    this.refreshSnapshot();
  };

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
  }
}

export class EditorGroupView {
  private props: EditorGroupViewProps;
  private readonly controller: EditorGroupController;
  private readonly element = createElement('div', 'editor-shell');
  private readonly headerElement = createElement('div', 'editor-tabs-header');
  private readonly contentElement = createElement('div');
  private readonly emptyWorkspaceView: EditorEmptyWorkspaceView;
  private activePaneRenderer: EditorPaneRenderer | null = null;
  private activePaneKey: string | null = null;

  constructor(props: EditorGroupViewProps) {
    this.props = props;
    this.controller = new EditorGroupController(props);
    this.emptyWorkspaceView = new EditorEmptyWorkspaceView({
      labels: props.labels,
      onCreateDraftTab: props.onCreateDraftTab,
    });
    this.element.append(this.headerElement, this.contentElement);
    this.render();
  }

  getElement() {
    return this.element;
  }

  setProps(props: EditorGroupViewProps) {
    this.props = props;
    this.controller.setContext(props);
    this.render();
  }

  dispose() {
    this.activePaneRenderer?.dispose();
    this.activePaneRenderer = null;
    this.activePaneKey = null;
    this.element.replaceChildren();
  }

  private render() {
    const { group, editorStatus } = this.controller.getSnapshot();
    this.props.onStatusChange?.(editorStatus);

    const titleAreaControl = createTitleAreaControl(this.props, group);
    this.headerElement.replaceChildren(titleAreaControl.render());

    this.contentElement.className = '';
    this.contentElement.removeAttribute('data-editor-pane');

    if (!group.activeTab) {
      this.activePaneRenderer?.dispose();
      this.activePaneRenderer = null;
      this.activePaneKey = null;
      this.emptyWorkspaceView.setProps({
        labels: this.props.labels,
        onCreateDraftTab: this.props.onCreateDraftTab,
      });
      this.contentElement.className = 'editor-content';
      this.contentElement.replaceChildren(this.emptyWorkspaceView.getElement());
      return;
    }

    const resolvedPane = resolveEditorPane(group.activeTab, {
      labels: this.props.labels,
      viewPartProps: this.props.viewPartProps,
      onDraftDocumentChange: this.props.onDraftDocumentChange,
      onDraftStatusChange: this.controller.updateDraftStatus,
    });

    if (this.activePaneKey !== resolvedPane.paneKey || !this.activePaneRenderer) {
      this.activePaneRenderer?.dispose();
      this.activePaneRenderer = resolvedPane.createRenderer();
      this.activePaneKey = resolvedPane.paneKey;
      this.contentElement.replaceChildren(this.activePaneRenderer.getElement());
    } else {
      resolvedPane.updateRenderer(this.activePaneRenderer);
      if (this.contentElement.firstChild !== this.activePaneRenderer.getElement()) {
        this.contentElement.replaceChildren(this.activePaneRenderer.getElement());
      }
    }

    this.contentElement.className = [
      'editor-content',
      ...resolvedPane.contentClassNames,
    ].join(' ');
    this.contentElement.dataset.editorPane = resolvedPane.paneId;
  }
}

export function createEditorGroupView(props: EditorGroupViewProps) {
  return new EditorGroupView(props);
}
