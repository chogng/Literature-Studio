import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';
import { lxIconSemanticMap } from 'ls/base/browser/ui/lxicon/lxiconSemantic';
import { TitleControl } from 'ls/workbench/browser/parts/editor/titleControl';

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

function getTabKindLabel(kind: 'draft' | 'web' | 'pdf') {
  if (kind === 'draft') {
    return 'D';
  }

  if (kind === 'pdf') {
    return 'P';
  }

  return 'W';
}

export class TabsTitleControl extends TitleControl {
  override render() {
    const { group, labels, onActivateTab, onCloseTab } = this.props;
    const container = createElement('div', 'editor-tabs-container');
    container.setAttribute('role', 'tablist');

    for (const tab of group.tabs) {
      const tabElement = createElement(
        'div',
        ['editor-tab', tab.isActive ? 'is-active' : ''].filter(Boolean).join(' '),
      );
      const mainButton = createElement(
        'button',
        'editor-tab-main btn-base btn-ghost btn-md',
      );
      mainButton.type = 'button';
      mainButton.setAttribute('role', 'tab');
      mainButton.setAttribute('aria-selected', String(tab.isActive));
      mainButton.title = tab.title;
      mainButton.addEventListener('click', () => onActivateTab(tab.id));

      const label = createElement('span', 'editor-tab-label');
      const kind = createElement('span', 'editor-tab-kind');
      kind.textContent = getTabKindLabel(tab.kind);
      const text = createElement('span', 'editor-tab-label-text');
      text.textContent = tab.label;
      label.append(kind, text);
      mainButton.append(label);

      const closeButton = createElement(
        'button',
        'editor-tab-close btn-base btn-ghost btn-mode-icon btn-sm',
      );
      closeButton.type = 'button';
      closeButton.title = labels.close;
      closeButton.setAttribute('aria-label', labels.close);
      closeButton.append(createLxIcon(lxIconSemanticMap.editor.closeTab));
      closeButton.addEventListener('click', (event) => {
        event.stopPropagation();
        onCloseTab(tab.id);
      });

      tabElement.append(mainButton, closeButton);
      container.append(tabElement);
    }

    return container;
  }
}
