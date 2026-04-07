import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';
import type { LxIconName } from 'ls/base/browser/ui/lxicon/lxicon';
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
  private pendingFocusItemId: string | null = null;

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
    const entries: Array<
      | {
          kind: 'item';
          itemId: string;
          pageId: SettingsPageId;
          label: string;
          icon?: LxIconName;
        }
      | {
          kind: 'spacer';
          itemId: string;
          height: number;
        }
    > = [];

    for (const item of items) {
      entries.push({
        kind: 'item',
        itemId: item.id,
        pageId: item.id,
        label: item.label,
        icon: item.icon,
      });

      if (item.id === 'general') {
        entries.push({
          kind: 'item',
          itemId: 'appearance',
          pageId: 'general',
          label: 'Appearance',
          icon: 'appearance',
        });
        entries.push({
          kind: 'spacer',
          itemId: 'general-spacer',
          height: 12,
        });
      }
    }

    const navigationItems = entries.filter(
      (entry): entry is Extract<(typeof entries)[number], { kind: 'item' }> =>
        entry.kind === 'item',
    );
    const itemOrder = navigationItems.map((entry) => entry.itemId);
    const pageIdByItemId = new Map(
      navigationItems.map((entry) => [entry.itemId, entry.pageId] as const),
    );
    const focusedItemBeforeRender = this.getFocusedItemId();
    const focusTargetItemId = this.pendingFocusItemId ?? focusedItemBeforeRender;
    this.pendingFocusItemId = null;

    const nav = el('nav', 'settings-navigation-nav');
    nav.ariaLabel = this.props.title;
    const list = el('ul', 'settings-navigation-list');
    list.replaceChildren(
      ...entries.map((entryData) => {
        if (entryData.kind === 'spacer') {
          const spacer = el('li', 'settings-navigation-spacer');
          spacer.style.height = `${entryData.height}px`;
          spacer.setAttribute('aria-hidden', 'true');
          return spacer;
        }

        const entryDataItem = entryData;
        const entry = el('li', 'settings-navigation-item-entry');
        const button = el('button', 'settings-navigation-item');
        const label = el('span', 'settings-navigation-label');
        const isActive = entryDataItem.itemId === this.props.activePageId;
        button.type = 'button';
        if (entryDataItem.icon) {
          label.append(createLxIcon(entryDataItem.icon, 'settings-navigation-icon'));
        }
        label.append(document.createTextNode(entryDataItem.label));
        button.append(label);
        button.dataset.pageTarget = entryDataItem.pageId;
        button.dataset.navigationItemId = entryDataItem.itemId;
        button.classList.toggle('active', isActive);
        if (isActive) {
          button.setAttribute('aria-current', 'page');
        } else {
          button.removeAttribute('aria-current');
        }
        button.addEventListener('keydown', (event) => {
          this.handleItemKeyDown(
            event,
            entryDataItem.itemId,
            itemOrder,
            pageIdByItemId,
          );
        });
        button.addEventListener('click', () => {
          this.selectPage(entryDataItem.pageId, true, entryDataItem.itemId);
        });
        entry.append(button);
        return entry;
      }),
    );
    nav.append(list);
    this.element.replaceChildren(nav);
    if (focusTargetItemId) {
      this.focusNavigationItemButton(focusTargetItemId);
    }
  }

  private handleItemKeyDown(
    event: KeyboardEvent,
    itemId: string,
    itemOrder: readonly string[],
    pageIdByItemId: Map<string, SettingsPageId>,
  ) {
    if (itemOrder.length === 0) {
      return;
    }

    const currentIndex = itemOrder.indexOf(itemId);
    if (currentIndex < 0) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight': {
        const nextIndex = (currentIndex + 1) % itemOrder.length;
        const nextItemId = itemOrder[nextIndex];
        const nextPageId = nextItemId
          ? (pageIdByItemId.get(nextItemId) ?? this.props.activePageId)
          : this.props.activePageId;
        this.selectPage(nextPageId, true, nextItemId);
        event.preventDefault();
        break;
      }
      case 'ArrowUp':
      case 'ArrowLeft': {
        const previousIndex =
          (currentIndex - 1 + itemOrder.length) % itemOrder.length;
        const previousItemId = itemOrder[previousIndex];
        const previousPageId = previousItemId
          ? (pageIdByItemId.get(previousItemId) ?? this.props.activePageId)
          : this.props.activePageId;
        this.selectPage(previousPageId, true, previousItemId);
        event.preventDefault();
        break;
      }
      case 'Home': {
        const firstItemId = itemOrder[0];
        const firstPageId = firstItemId
          ? (pageIdByItemId.get(firstItemId) ?? this.props.activePageId)
          : this.props.activePageId;
        this.selectPage(firstPageId, true, firstItemId);
        event.preventDefault();
        break;
      }
      case 'End': {
        const lastItemId = itemOrder[itemOrder.length - 1];
        const lastPageId = lastItemId
          ? (pageIdByItemId.get(lastItemId) ?? this.props.activePageId)
          : this.props.activePageId;
        this.selectPage(lastPageId, true, lastItemId);
        event.preventDefault();
        break;
      }
      case 'Enter':
      case ' ': {
        const pageId = pageIdByItemId.get(itemId) ?? this.props.activePageId;
        this.selectPage(pageId, true, itemId);
        event.preventDefault();
        break;
      }
    }
  }

  private selectPage(
    pageId: SettingsPageId,
    restoreFocus: boolean,
    focusItemId: string,
  ) {
    if (restoreFocus) {
      this.pendingFocusItemId = focusItemId;
    }
    if (pageId === this.props.activePageId) {
      this.focusNavigationItemButton(focusItemId);
      return;
    }
    this.props.onDidSelectPage(pageId);
  }

  private focusNavigationItemButton(itemId: string) {
    const buttons = this.element.querySelectorAll<HTMLButtonElement>(
      '.settings-navigation-item',
    );
    for (const button of buttons) {
      if (button.dataset.navigationItemId === itemId) {
        button.focus({ preventScroll: true });
        return;
      }
    }
  }

  private getFocusedItemId() {
    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLElement) || !this.element.contains(activeElement)) {
      return null;
    }

    const activeButton = activeElement.closest<HTMLButtonElement>(
      '.settings-navigation-item',
    );
    const navigationItemId = activeButton?.dataset.navigationItemId;
    return navigationItemId ?? null;
  }
}

export function createSettingsNavigationView(props: SettingsNavigationViewProps) {
  return new SettingsNavigationView(props);
}
