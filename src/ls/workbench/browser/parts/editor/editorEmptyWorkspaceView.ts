import type { EditorPartLabels } from 'ls/workbench/browser/parts/editor/editorPartView';
import { EditorPlaceholder } from 'ls/workbench/browser/parts/editor/editorPlaceholder';
import type { EditorOpenHandler } from 'ls/workbench/services/editor/common/editorOpenTypes';

export type EditorEmptyWorkspaceViewProps = {
  labels: Pick<
    EditorPartLabels,
    'emptyWorkspaceTitle' | 'emptyWorkspaceBody' | 'draftMode'
  >;
  onOpenEditor: EditorOpenHandler;
};

export class EditorEmptyWorkspaceView {
  private readonly placeholder: EditorPlaceholder;
  private onOpenEditor: EditorOpenHandler;

  constructor(props: EditorEmptyWorkspaceViewProps) {
    this.onOpenEditor = props.onOpenEditor;
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
    this.onOpenEditor = props.onOpenEditor;
    this.placeholder.setProps({
      className: 'editor-empty-workspace',
      title: props.labels.emptyWorkspaceTitle,
      body: props.labels.emptyWorkspaceBody,
      actions: [
        {
          label: props.labels.draftMode,
          onRun: () => {
            void this.onOpenEditor({
              kind: 'draft',
              disposition: 'reveal-or-open',
            });
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
