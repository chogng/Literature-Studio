import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';
import {
  getSettingsPageNavigationItems,
  type SettingsPageId,
} from 'ls/workbench/contrib/preferences/browser/settingsLayout';
import type { SettingsPartLabels } from 'ls/workbench/contrib/preferences/browser/settingsTypes';

export type SettingsNavigationViewProps = {
  labels: SettingsPartLabels;
  title: string;
  activePageId: SettingsPageId;
  onDidSelectPage: (pageId: SettingsPageId) => void;
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  return node;
}

export class SettingsNavigationView {
  private props: SettingsNavigationViewProps;
  private readonly element = el('aside', 'settings-navigation');
  private pendingFocusPageId: SettingsPageId | null = null;

  constructor(props: SettingsNavigationViewProps) {
    this.props = props;
    this.render();
  }

  getElement() {
    return this.element;
  }

  setProps(props: SettingsNavigationViewProps) {
    this.props = props;
    this.render();
  }

  dispose() {
    this.element.replaceChildren();
  }

  private render() {
    const items = getSettingsPageNavigationItems(this.props.labels);
    const pageOrder = items.map((item) => item.id);
    const focusedPageBeforeRender = this.getFocusedPageId();
    const focusTargetPageId = this.pendingFocusPageId ?? focusedPageBeforeRender;
    this.pendingFocusPageId = null;

    const nav = el('nav', 'settings-navigation-nav');
    nav.ariaLabel = this.props.title;
    const list = el('ul', 'settings-navigation-list');
    list.replaceChildren(
      ...items.map((item) => {
        const entry = el('li', 'settings-navigation-item-entry');
        const button = el('button', 'settings-navigation-item');
        const label = el('span', 'settings-navigation-label');
        const isActive = item.id === this.props.activePageId;
        button.type = 'button';
        if (item.icon) {
          label.append(createLxIcon(item.icon, 'settings-navigation-icon'));
        }
        label.append(document.createTextNode(item.label));
        button.append(label);
        button.dataset.pageTarget = item.id;
        button.classList.toggle('active', isActive);
        if (isActive) {
          button.setAttribute('aria-current', 'page');
        } else {
          button.removeAttribute('aria-current');
        }
        button.addEventListener('keydown', (event) => {
          this.handleItemKeyDown(event, item.id, pageOrder);
        });
        button.addEventListener('click', () => {
          this.selectPage(item.id, true);
        });
        entry.append(button);
        return entry;
      }),
    );
    nav.append(list);
    this.element.replaceChildren(nav);
    if (focusTargetPageId) {
      this.focusPageButton(focusTargetPageId);
    }
  }

  private handleItemKeyDown(
    event: KeyboardEvent,
    pageId: SettingsPageId,
    pageOrder: readonly SettingsPageId[],
  ) {
    if (pageOrder.length === 0) {
      return;
    }

    const currentIndex = pageOrder.indexOf(pageId);
    if (currentIndex < 0) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight': {
        const nextIndex = (currentIndex + 1) % pageOrder.length;
        this.selectPage(pageOrder[nextIndex], true);
        event.preventDefault();
        break;
      }
      case 'ArrowUp':
      case 'ArrowLeft': {
        const previousIndex =
          (currentIndex - 1 + pageOrder.length) % pageOrder.length;
        this.selectPage(pageOrder[previousIndex], true);
        event.preventDefault();
        break;
      }
      case 'Home': {
        this.selectPage(pageOrder[0], true);
        event.preventDefault();
        break;
      }
      case 'End': {
        this.selectPage(pageOrder[pageOrder.length - 1], true);
        event.preventDefault();
        break;
      }
      case 'Enter':
      case ' ': {
        this.selectPage(pageId, true);
        event.preventDefault();
        break;
      }
    }
  }

  private selectPage(pageId: SettingsPageId, restoreFocus: boolean) {
    if (restoreFocus) {
      this.pendingFocusPageId = pageId;
    }
    if (pageId === this.props.activePageId) {
      this.focusPageButton(pageId);
      return;
    }
    this.props.onDidSelectPage(pageId);
  }

  private focusPageButton(pageId: SettingsPageId) {
    const buttons = this.element.querySelectorAll<HTMLButtonElement>(
      '.settings-navigation-item',
    );
    for (const button of buttons) {
      if (button.dataset.pageTarget === pageId) {
        button.focus({ preventScroll: true });
        return;
      }
    }
  }

  private getFocusedPageId(): SettingsPageId | null {
    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLElement) || !this.element.contains(activeElement)) {
      return null;
    }

    const activeButton = activeElement.closest<HTMLButtonElement>(
      '.settings-navigation-item',
    );
    const pageTarget = activeButton?.dataset.pageTarget;
    return pageTarget ? (pageTarget as SettingsPageId) : null;
  }
}

export function createSettingsNavigationView(props: SettingsNavigationViewProps) {
  return new SettingsNavigationView(props);
}
