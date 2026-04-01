import 'ls/base/browser/ui/button/button.css';
import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';
import type { LxIconName } from 'ls/base/browser/ui/lxicon/lxicon';

import type { WritingEditorToolbarState } from 'ls/editor/browser/text/commands';
import type { WritingEditorSurfaceLabels } from 'ls/editor/browser/text/editor';

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

type ToolbarButtonConfig = {
  label: string;
  onClick: () => void;
  icon?: LxIconName;
  glyph?: string;
  isActive?: boolean;
  disabled?: boolean;
  isToggle?: boolean;
};

type ToolbarGroupConfig = {
  title: string;
  buttons: readonly ToolbarButtonConfig[];
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
    const fragment = document.createDocumentFragment();
    for (const group of this.createToolbarGroups()) {
      fragment.append(this.createToolbarGroup(group));
    }
    this.element.replaceChildren(fragment);
  }

  private createToolbarGroups(): readonly ToolbarGroupConfig[] {
    const { labels, toolbarState, actions } = this.props;

    return [
      {
        title: labels.textGroup,
        buttons: [
          {
            label: labels.paragraph,
            glyph: 'Tx',
            onClick: actions.setParagraph,
            isActive: toolbarState.isParagraphActive,
            isToggle: true,
          },
          {
            label: labels.heading1,
            glyph: 'H1',
            onClick: () => actions.toggleHeading(1),
            isActive: toolbarState.activeHeadingLevel === 1,
            isToggle: true,
          },
          {
            label: labels.heading2,
            glyph: 'H2',
            onClick: () => actions.toggleHeading(2),
            isActive: toolbarState.activeHeadingLevel === 2,
            isToggle: true,
          },
          {
            label: labels.heading3,
            glyph: 'H3',
            onClick: () => actions.toggleHeading(3),
            isActive: toolbarState.activeHeadingLevel === 3,
            isToggle: true,
          },
        ],
      },
      {
        title: labels.formatGroup,
        buttons: [
          {
            label: labels.bold,
            icon: 'bold',
            onClick: actions.toggleBold,
            isActive: toolbarState.isBoldActive,
            isToggle: true,
          },
          {
            label: labels.italic,
            icon: 'italics',
            onClick: actions.toggleItalic,
            isActive: toolbarState.isItalicActive,
            isToggle: true,
          },
          {
            label: labels.bulletList,
            icon: 'list-unordered',
            onClick: actions.toggleBulletList,
            isActive: toolbarState.isBulletListActive,
            isToggle: true,
          },
          {
            label: labels.orderedList,
            icon: 'list-ordered',
            onClick: actions.toggleOrderedList,
            isActive: toolbarState.isOrderedListActive,
            isToggle: true,
          },
          {
            label: labels.blockquote,
            icon: 'quote',
            onClick: actions.toggleBlockquote,
            isActive: toolbarState.isBlockquoteActive,
            isToggle: true,
          },
        ],
      },
      {
        title: labels.insertGroup,
        buttons: [
          {
            label: labels.insertCitation,
            icon: 'quotes',
            onClick: actions.insertCitation,
          },
          {
            label: labels.insertFigure,
            icon: 'image',
            onClick: actions.insertFigure,
          },
          {
            label: labels.insertFigureRef,
            icon: 'mention',
            onClick: actions.insertFigureRef,
          },
        ],
      },
      {
        title: labels.historyGroup,
        buttons: [
          {
            label: labels.undo,
            icon: 'arrow-left',
            onClick: actions.undo,
            disabled: !toolbarState.canUndo,
          },
          {
            label: labels.redo,
            icon: 'arrow-right',
            onClick: actions.redo,
            disabled: !toolbarState.canRedo,
          },
        ],
      },
    ];
  }

  private createToolbarGroup(groupConfig: ToolbarGroupConfig) {
    const group = createElement('section', 'pm-toolbar-group');
    const actions = createElement('div', 'pm-toolbar-group-actions');
    const title = createElement('div', 'pm-toolbar-group-title');

    title.textContent = groupConfig.title;

    for (const buttonConfig of groupConfig.buttons) {
      actions.append(this.createToolbarButton(buttonConfig));
    }

    group.append(actions, title);
    return group;
  }

  private createToolbarButton(buttonConfig: ToolbarButtonConfig) {
    const button = createElement(
      'button',
      [
        'pm-toolbar-btn',
        'btn-base',
        'btn-ghost',
        'btn-mode-icon',
        'btn-sm',
        buttonConfig.isActive ? 'is-active' : '',
      ]
        .filter(Boolean)
        .join(' '),
    );
    const iconSlot = createElement('span', 'pm-toolbar-btn-icon');

    button.type = 'button';
    button.disabled = Boolean(buttonConfig.disabled);
    button.title = buttonConfig.label;
    button.setAttribute('aria-label', buttonConfig.label);
    if (buttonConfig.isToggle) {
      button.setAttribute('aria-pressed', String(Boolean(buttonConfig.isActive)));
    }
    button.addEventListener('mousedown', (event) => {
      // Keep the ProseMirror selection alive while toolbar commands run.
      event.preventDefault();
    });
    button.addEventListener('click', buttonConfig.onClick);

    if (buttonConfig.icon) {
      iconSlot.append(createLxIcon(buttonConfig.icon));
    } else if (buttonConfig.glyph) {
      const glyph = createElement('span', 'pm-toolbar-btn-glyph');
      glyph.textContent = buttonConfig.glyph;
      iconSlot.append(glyph);
    }

    button.append(iconSlot);
    return button;
  }
}

export function createDraftEditorToolbar(props: DraftEditorToolbarProps) {
  return new DraftEditorToolbar(props);
}

export default DraftEditorToolbar;
