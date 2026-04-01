import { LibraryFieldView, type LibraryFieldViewProps } from 'ls/workbench/contrib/preferences/browser/libraryField.js';
import { RagFieldView, type RagFieldViewProps } from 'ls/workbench/contrib/preferences/browser/ragField.js';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  return node;
}

function buildHint(value: string, className = 'settings-hint') {
  const hint = el('p', className);
  hint.textContent = value;
  return hint;
}

export type KnowledgeBaseFieldViewProps = {
  title: string;
  hint: string;
  library: LibraryFieldViewProps;
  rag: RagFieldViewProps;
};

export class KnowledgeBaseFieldView {
  private props: KnowledgeBaseFieldViewProps;
  private readonly element = el('section', 'settings-field settings-knowledge-base-field');
  private readonly libraryField: LibraryFieldView;
  private readonly ragField: RagFieldView;

  constructor(props: KnowledgeBaseFieldViewProps) {
    this.props = props;
    this.libraryField = new LibraryFieldView(props.library);
    this.ragField = new RagFieldView(props.rag);
    this.setProps(props);
  }

  getElement() {
    return this.element;
  }

  setProps(props: KnowledgeBaseFieldViewProps) {
    this.props = props;
    this.libraryField.setProps(props.library);
    this.ragField.setProps(props.rag);
    this.element.replaceChildren(this.render());
  }

  private render() {
    const root = el('div', 'settings-field');
    const title = el('span', 'settings-section-title');
    title.textContent = this.props.title;
    root.append(
      title,
      buildHint(this.props.hint),
      this.libraryField.getElement(),
      this.ragField.getElement(),
    );
    return root;
  }
}
