import type { WritingEditorToolbarState } from './commands';
import type { WritingEditorSurfaceLabels } from './prosemirrorEditor';

export type DraftEditorToolbarActions = {
  setParagraph: () => void;
  toggleHeading: (level: number) => void;
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleBulletList: () => void;
  toggleOrderedList: () => void;
  toggleBlockquote: () => void;
  undo: () => void;
  redo: () => void;
  insertCitation: () => void;
  insertFigure: () => void;
  insertFigureRef: () => void;
};

export type DraftEditorToolbarProps = {
  labels: WritingEditorSurfaceLabels;
  toolbarState: WritingEditorToolbarState;
  actions: DraftEditorToolbarActions;
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

export class DraftEditorToolbar {
  private props: DraftEditorToolbarProps;
  private readonly element = createElement('div', 'pm-toolbar');

  constructor(props: DraftEditorToolbarProps) {
    this.props = props;
    this.render();
  }

  getElement() {
    return this.element;
  }

  setProps(props: DraftEditorToolbarProps) {
    this.props = props;
    this.render();
  }

  private render() {
    const { labels, toolbarState, actions } = this.props;

    this.element.replaceChildren(
      this.createToolbarGroup([
        this.createToolbarButton(labels.paragraph, actions.setParagraph, {
          isActive: toolbarState.isParagraphActive,
        }),
        this.createToolbarButton(labels.heading1, () => actions.toggleHeading(1), {
          isActive: toolbarState.activeHeadingLevel === 1,
        }),
        this.createToolbarButton(labels.heading2, () => actions.toggleHeading(2), {
          isActive: toolbarState.activeHeadingLevel === 2,
        }),
        this.createToolbarButton(labels.heading3, () => actions.toggleHeading(3), {
          isActive: toolbarState.activeHeadingLevel === 3,
        }),
      ]),
      this.createToolbarGroup([
        this.createToolbarButton(labels.bold, actions.toggleBold, {
          isActive: toolbarState.isBoldActive,
        }),
        this.createToolbarButton(labels.italic, actions.toggleItalic, {
          isActive: toolbarState.isItalicActive,
        }),
        this.createToolbarButton(labels.bulletList, actions.toggleBulletList, {
          isActive: toolbarState.isBulletListActive,
        }),
        this.createToolbarButton(labels.orderedList, actions.toggleOrderedList, {
          isActive: toolbarState.isOrderedListActive,
        }),
        this.createToolbarButton(labels.blockquote, actions.toggleBlockquote, {
          isActive: toolbarState.isBlockquoteActive,
        }),
      ]),
      this.createToolbarGroup([
        this.createToolbarButton(labels.undo, actions.undo, {
          disabled: !toolbarState.canUndo,
        }),
        this.createToolbarButton(labels.redo, actions.redo, {
          disabled: !toolbarState.canRedo,
        }),
      ]),
      this.createToolbarGroup([
        this.createToolbarButton(labels.insertCitation, actions.insertCitation),
        this.createToolbarButton(labels.insertFigure, actions.insertFigure),
        this.createToolbarButton(labels.insertFigureRef, actions.insertFigureRef),
      ]),
    );
  }

  private createToolbarGroup(children: HTMLButtonElement[]) {
    const group = createElement('div', 'pm-toolbar-group');
    group.append(...children);
    return group;
  }

  private createToolbarButton(
    label: string,
    onClick: () => void,
    options: {
      isActive?: boolean;
      disabled?: boolean;
    } = {},
  ) {
    const button = createElement(
      'button',
      ['pm-toolbar-btn', options.isActive ? 'is-active' : '']
        .filter(Boolean)
        .join(' '),
    );
    button.type = 'button';
    button.disabled = Boolean(options.disabled);
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }
}

export function createDraftEditorToolbar(props: DraftEditorToolbarProps) {
  return new DraftEditorToolbar(props);
}

export default DraftEditorToolbar;
