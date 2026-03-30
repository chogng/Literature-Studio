import type { EditorPartLabels } from './editorPartView';

export type EditorEmptyWorkspaceViewProps = {
  labels: Pick<
    EditorPartLabels,
    'emptyWorkspaceTitle' | 'emptyWorkspaceBody' | 'draftMode'
  >;
  onCreateDraftTab: () => void;
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

export class EditorEmptyWorkspaceView {
  private readonly element = createElement('div', 'editor-empty-workspace');
  private readonly titleElement = createElement('h2', 'editor-empty-workspace-title');
  private readonly bodyElement = createElement('p', 'editor-empty-workspace-body');
  private readonly actionElement = createElement(
    'button',
    'editor-workspace-action-btn btn-base btn-secondary btn-md',
  );
  private onCreateDraftTab: () => void;

  constructor(props: EditorEmptyWorkspaceViewProps) {
    this.onCreateDraftTab = props.onCreateDraftTab;
    this.actionElement.type = 'button';
    this.actionElement.addEventListener('click', () => {
      this.onCreateDraftTab();
    });
    this.element.append(
      this.titleElement,
      this.bodyElement,
      this.actionElement,
    );
    this.setProps(props);
  }

  getElement() {
    return this.element;
  }

  setProps(props: EditorEmptyWorkspaceViewProps) {
    this.onCreateDraftTab = props.onCreateDraftTab;
    this.titleElement.textContent = props.labels.emptyWorkspaceTitle;
    this.bodyElement.textContent = props.labels.emptyWorkspaceBody;
    this.actionElement.textContent = props.labels.draftMode;
  }
}

export function createEditorEmptyWorkspaceView(props: EditorEmptyWorkspaceViewProps) {
  return new EditorEmptyWorkspaceView(props);
}

export default EditorEmptyWorkspaceView;
