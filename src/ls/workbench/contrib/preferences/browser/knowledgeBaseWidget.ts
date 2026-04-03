import { LibraryWidget } from 'ls/workbench/contrib/preferences/browser/libraryWidget';
import type { LibraryWidgetProps } from 'ls/workbench/contrib/preferences/browser/libraryWidget';
import { RagWidget } from 'ls/workbench/contrib/preferences/browser/ragWidget';
import type { RagWidgetProps } from 'ls/workbench/contrib/preferences/browser/ragWidget';

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

export type KnowledgeBaseWidgetProps = {
  title: string;
  hint: string;
  library: LibraryWidgetProps;
  rag: RagWidgetProps;
};

export class KnowledgeBaseWidget {
  private props: KnowledgeBaseWidgetProps;
  private readonly element = el('section', 'settings-field settings-knowledge-base-field');
  private readonly libraryWidget: LibraryWidget;
  private readonly ragWidget: RagWidget;

  constructor(props: KnowledgeBaseWidgetProps) {
    this.props = props;
    this.libraryWidget = new LibraryWidget(props.library);
    this.ragWidget = new RagWidget(props.rag);
    this.setProps(props);
  }

  getElement() {
    return this.element;
  }

  setProps(props: KnowledgeBaseWidgetProps) {
    this.props = props;
    this.libraryWidget.setProps(props.library);
    this.ragWidget.setProps(props.rag);
    this.element.replaceChildren(this.render());
  }

  private render() {
    const root = el('div', 'settings-field');
    const title = el('span', 'settings-section-title');
    title.textContent = this.props.title;
    root.append(
      title,
      buildHint(this.props.hint),
      this.libraryWidget.getElement(),
      this.ragWidget.getElement(),
    );
    return root;
  }
}
