import type { WritingWorkspaceContentTab } from 'ls/workbench/browser/writingEditorModel';
import { ViewPartView, type ViewPartProps } from 'ls/workbench/browser/parts/views/viewPartView';
import type { EditorPartLabels } from 'ls/workbench/browser/parts/editor/editorPartView';

export type ContentEditorPaneProps = {
  labels: EditorPartLabels;
  contentTab: WritingWorkspaceContentTab;
  viewPartProps: ViewPartProps;
};

export class ContentEditorPane {
  private readonly element = document.createElement('div');
  private readonly bodyElement = document.createElement('div');
  private readonly viewPartView: ViewPartView;

  constructor(props: ContentEditorPaneProps) {
    this.element.className = 'editor-source-pane';
    this.bodyElement.className = 'editor-source-body';
    this.viewPartView = new ViewPartView(props.viewPartProps);
    this.bodyElement.append(this.viewPartView.getElement());
    this.element.append(this.bodyElement);
  }

  getElement() {
    return this.element;
  }

  setProps(props: ContentEditorPaneProps) {
    this.viewPartView.setProps(props.viewPartProps);
  }

  dispose() {
    this.viewPartView.dispose();
    this.element.replaceChildren();
  }
}

export function createContentEditorPane(props: ContentEditorPaneProps) {
  return new ContentEditorPane(props);
}

export default ContentEditorPane;
