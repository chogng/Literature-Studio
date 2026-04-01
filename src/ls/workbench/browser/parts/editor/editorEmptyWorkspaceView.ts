import type { EditorPartLabels } from 'ls/workbench/browser/parts/editor/editorPartView';
import { EditorPlaceholder } from 'ls/workbench/browser/parts/editor/editorPlaceholder';

export type EditorEmptyWorkspaceViewProps = {
  labels: Pick<
    EditorPartLabels,
    'emptyWorkspaceTitle' | 'emptyWorkspaceBody' | 'draftMode'
  >;
  onCreateDraftTab: () => void;
};

export class EditorEmptyWorkspaceView {
  private readonly placeholder: EditorPlaceholder;
  private onCreateDraftTab: () => void;

  constructor(props: EditorEmptyWorkspaceViewProps) {
    this.onCreateDraftTab = props.onCreateDraftTab;
    this.placeholder = new EditorPlaceholder({
      className: 'editor-empty-workspace',
      title: props.labels.emptyWorkspaceTitle,
      body: props.labels.emptyWorkspaceBody,
      actions: [],
    });
    this.setProps(props);
  }

  getElement() {
    return this.placeholder.getElement();
  }

  setProps(props: EditorEmptyWorkspaceViewProps) {
    this.onCreateDraftTab = props.onCreateDraftTab;
    this.placeholder.setProps({
      className: 'editor-empty-workspace',
      title: props.labels.emptyWorkspaceTitle,
      body: props.labels.emptyWorkspaceBody,
      actions: [
        {
          label: props.labels.draftMode,
          onRun: () => {
            this.onCreateDraftTab();
          },
          className: 'editor-workspace-action-btn btn-secondary btn-md',
        },
      ],
    });
  }
}

export function createEditorEmptyWorkspaceView(props: EditorEmptyWorkspaceViewProps) {
  return new EditorEmptyWorkspaceView(props);
}

export default EditorEmptyWorkspaceView;
