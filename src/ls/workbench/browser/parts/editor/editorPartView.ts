import type {
  WritingEditorDocument,
  WritingWorkspaceTab,
} from 'ls/workbench/browser/writingEditorModel';
import type {
  EditorStatusLabels,
  EditorStatusState,
} from 'ls/workbench/browser/parts/editor/editorStatus';
import type { WritingEditorSurfaceLabels } from 'ls/editor/browser/text/editor';
import { WORKBENCH_PART_IDS, registerWorkbenchPartDomNode } from 'ls/workbench/browser/layout';
import type { DraftEditorSurfaceActionId } from 'ls/workbench/browser/parts/editor/activeDraftEditorCommandExecutor';
import type { DraftEditorCommandId } from 'ls/workbench/browser/parts/editor/panes/draftEditorCommands';
import type { ViewPartProps } from 'ls/workbench/browser/parts/views/viewPartView';
import { EditorGroupView } from 'ls/workbench/browser/parts/editor/editorGroupView';
import 'ls/workbench/browser/parts/editor/media/editor.css';
import 'ls/workbench/browser/parts/editor/media/tabsTitleControl.css';

export type EditorPartLabels = {
  topbarAddAction: string;
  createWrite: string;
  createBrowser: string;
  createFile: string;
  toolbarSources: string;
  toolbarBack: string;
  toolbarForward: string;
  toolbarRefresh: string;
  toolbarFavorite: string;
  toolbarMore: string;
  toolbarAddressBar: string;
  draftMode: string;
  sourceMode: string;
  pdfMode: string;
  close: string;
  expandEditor: string;
  collapseEditor: string;
  emptyWorkspaceTitle: string;
  emptyWorkspaceBody: string;
  draftBodyPlaceholder: string;
  sourceTitle: string;
  sourceUrlPrompt: string;
  pdfTitle: string;
  status: EditorStatusLabels;
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
  onCreateWebTab: () => void;
  onCreatePdfTab: () => void;
  onDraftDocumentChange: (value: WritingEditorDocument) => void;
  topbarActionsElement?: HTMLElement | null;
  topbarToolbarElement?: HTMLElement | null;
  onStatusChange?: (status: EditorStatusState) => void;
};

export class EditorPartView {
  private readonly element = document.createElement('section');
  private readonly groupView: EditorGroupView;

  constructor(props: EditorPartProps) {
    this.element.className = 'panel editor-panel';
    registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.editor, this.element);
    this.groupView = new EditorGroupView(props);
    this.element.append(this.groupView.getElement());
  }

  getElement() {
    return this.element;
  }

  executeActiveDraftCommand(commandId: DraftEditorCommandId) {
    return this.groupView.executeActiveDraftCommand(commandId);
  }

  canExecuteActiveDraftCommand(commandId: DraftEditorCommandId) {
    return this.groupView.canExecuteActiveDraftCommand(commandId);
  }

  runActiveDraftEditorAction(actionId: DraftEditorSurfaceActionId) {
    return this.groupView.runActiveDraftEditorAction(actionId);
  }

  getActiveDraftStableSelectionTarget() {
    return this.groupView.getActiveDraftStableSelectionTarget();
  }

  setProps(props: EditorPartProps) {
    this.groupView.setProps(props);
  }

  dispose() {
    this.groupView.dispose();
    registerWorkbenchPartDomNode(WORKBENCH_PART_IDS.editor, null);
    this.element.replaceChildren();
  }
}

export function createEditorPartView(props: EditorPartProps) {
  return new EditorPartView(props);
}

export default EditorPartView;
