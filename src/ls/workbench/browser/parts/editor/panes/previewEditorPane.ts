import type { WritingWorkspacePreviewTab } from '../../../writingEditorModel';
import { ViewPartView, type ViewPartProps } from '../../views/viewPartView';
import type { EditorPartLabels } from '../editorPartView';

export type PreviewEditorPaneProps = {
  labels: EditorPartLabels;
  previewTab: WritingWorkspacePreviewTab;
  viewPartProps: ViewPartProps;
};

export class PreviewEditorPane {
  private readonly element = document.createElement('div');
  private readonly bodyElement = document.createElement('div');
  private readonly viewPartView: ViewPartView;

  constructor(props: PreviewEditorPaneProps) {
    this.element.className = 'editor-source-pane';
    this.bodyElement.className = 'editor-source-body';
    this.viewPartView = new ViewPartView(props.viewPartProps);
    this.bodyElement.append(this.viewPartView.getElement());
    this.element.append(this.bodyElement);
  }

  getElement() {
    return this.element;
  }

  setProps(props: PreviewEditorPaneProps) {
    this.viewPartView.setProps(props.viewPartProps);
  }

  dispose() {
    this.viewPartView.dispose();
    this.element.replaceChildren();
  }
}

export function createPreviewEditorPane(props: PreviewEditorPaneProps) {
  return new PreviewEditorPane(props);
}

export default PreviewEditorPane;
