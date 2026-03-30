import type { EditorPartLabels } from '../editorPartView';

export type DraftEmptyStateViewProps = {
  labels: Pick<EditorPartLabels, 'draftEmptyTitle' | 'draftEmptyBody'>;
  visible: boolean;
};

export class DraftEmptyStateView {
  private readonly element = document.createElement('div');
  private readonly titleElement = document.createElement('h2');
  private readonly bodyElement = document.createElement('p');

  constructor(props: DraftEmptyStateViewProps) {
    this.element.className = 'editor-draft-empty-state';
    this.titleElement.className = 'editor-draft-empty-state-title';
    this.bodyElement.className = 'editor-draft-empty-state-body';
    this.element.append(this.titleElement, this.bodyElement);
    this.setProps(props);
  }

  getElement() {
    return this.element;
  }

  setProps(props: DraftEmptyStateViewProps) {
    this.titleElement.textContent = props.labels.draftEmptyTitle;
    this.bodyElement.textContent = props.labels.draftEmptyBody;
    this.element.classList.toggle('is-hidden', !props.visible);
  }
}

export function createDraftEmptyStateView(props: DraftEmptyStateViewProps) {
  return new DraftEmptyStateView(props);
}

export default DraftEmptyStateView;
