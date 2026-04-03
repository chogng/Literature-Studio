import 'ls/base/browser/ui/menu/menu.css';

import type { ContextMenuAction } from 'ls/base/browser/contextmenu';
import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';

export type MenuSelectionSource = 'keyboard' | 'pointer';

export type MenuSelectEvent = {
  value: string;
  index: number;
  item: ContextMenuAction;
  source: MenuSelectionSource;
};

export interface MenuOptions {
  items: readonly ContextMenuAction[];
  className?: string;
  placement?: 'top' | 'bottom';
  role?: string;
  value?: string;
  onSelect?: (event: MenuSelectEvent) => void;
  onCancel?: () => void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

let menuIdPool = 0;

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
  textContent?: string,
) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (textContent !== undefined) {
    element.textContent = textContent;
  }
  return element;
}

function composeClassName(parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(' ');
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createCheckIcon() {
  const icon = document.createElementNS(SVG_NS, 'svg');
  icon.setAttribute('viewBox', '0 0 16 16');
  icon.setAttribute('width', '12');
  icon.setAttribute('height', '12');
  icon.setAttribute('aria-hidden', 'true');
  icon.classList.add('dropdown-menu-item-check');

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M3.5 8.2l2.4 2.4 6-6');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.8');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  icon.append(path);

  return icon;
}

function createCheckSlot(isSelected: boolean) {
  const slot = createElement('span', 'dropdown-menu-item-check');
  slot.setAttribute('aria-hidden', 'true');

  if (isSelected) {
    slot.append(createCheckIcon());
  } else {
    slot.classList.add('placeholder');
  }

  return slot;
}

function createMenuItemContent(item: ContextMenuAction) {
  const content = createElement('div', 'dropdown-option-content');
  if (item.icon) {
    content.append(createLxIcon(item.icon, 'dropdown-option-icon'));
  }
  content.append(createElement('div', 'dropdown-menu-item-content', item.label));
  return content;
}

function resolveSelectedValue(options: MenuOptions) {
  if (options.value !== undefined) {
    return options.value;
  }

  const selectedItem = options.items.find((item) => item.checked);
  return selectedItem?.value;
}

function resolvePlacement(options: MenuOptions) {
  return options.placement ?? 'bottom';
}

export class Menu {
  private readonly id = `ls-menu-${menuIdPool += 1}`;
  private readonly element = createElement('div');
  private options: MenuOptions;
  private itemElements: HTMLDivElement[] = [];
  private activeIndex = -1;
  private disposed = false;

  constructor(options: MenuOptions) {
    this.options = options;
    this.element.id = this.id;
    this.element.addEventListener('keydown', this.handleKeyDown);
    this.render();
  }

  getElement() {
    return this.element;
  }

  setOptions(options: MenuOptions) {
    if (this.disposed) {
      return;
    }

    this.options = options;
    this.render();
  }

  focus() {
    if (this.disposed) {
      return;
    }

    this.element.focus();
  }

  focusFirst() {
    if (this.disposed) {
      return;
    }

    const firstEnabled = this.findNextEnabledIndex(-1, 1, false);
    this.setActiveIndex(firstEnabled);
    this.focus();
  }

  focusSelectedOrFirstEnabled() {
    if (this.disposed) {
      return;
    }

    const selectedValue = resolveSelectedValue(this.options);
    if (selectedValue !== undefined) {
      const selectedIndex = this.options.items.findIndex((item) => (
        item.value === selectedValue && !item.disabled
      ));
      if (selectedIndex >= 0) {
        this.setActiveIndex(selectedIndex);
        this.focus();
        return;
      }
    }

    this.focusFirst();
  }

  focusLast() {
    if (this.disposed) {
      return;
    }

    const lastEnabled = this.findNextEnabledIndex(this.options.items.length, -1, false);
    this.setActiveIndex(lastEnabled);
    this.focus();
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.element.removeEventListener('keydown', this.handleKeyDown);
    this.element.replaceChildren();
    this.itemElements = [];
    this.activeIndex = -1;
    this.element.remove();
  }

  private render() {
    const selectedValue = resolveSelectedValue(this.options);
    this.element.className = composeClassName([
      'ls-menu',
      'dropdown-menu',
      `dropdown-menu-${resolvePlacement(this.options)}`,
      this.options.className,
    ]);
    this.element.setAttribute('role', this.options.role ?? 'menu');
    this.element.tabIndex = 0;

    const nodes: HTMLDivElement[] = [];
    for (let index = 0; index < this.options.items.length; index += 1) {
      const item = this.options.items[index];
      const selected = item.checked || (selectedValue !== undefined && item.value === selectedValue);
      const node = createElement(
        'div',
        composeClassName([
          'dropdown-menu-item',
          selected ? 'selected' : '',
          item.disabled ? 'disabled' : '',
        ]),
      );
      node.id = `${this.id}-item-${index}`;
      node.dataset.index = String(index);
      node.setAttribute('role', 'menuitem');
      node.setAttribute('aria-disabled', item.disabled ? 'true' : 'false');
      if (item.title) {
        node.title = item.title;
      }
      node.append(createMenuItemContent(item), createCheckSlot(selected));
      node.addEventListener('mouseenter', () => {
        if (item.disabled) {
          return;
        }
        this.setActiveIndex(index, false);
      });
      node.addEventListener('click', (event) => {
        event.stopPropagation();
        this.selectByIndex(index, 'pointer');
      });
      nodes.push(node);
    }

    this.itemElements = nodes;
    this.element.replaceChildren(...nodes);
    this.syncInitialActiveIndex();
  }

  private syncInitialActiveIndex() {
    const selectedValue = resolveSelectedValue(this.options);
    if (selectedValue !== undefined) {
      const selectedIndex = this.options.items.findIndex((item) => (
        item.value === selectedValue && !item.disabled
      ));
      if (selectedIndex >= 0) {
        this.setActiveIndex(selectedIndex, false);
        return;
      }
    }

    this.setActiveIndex(this.findNextEnabledIndex(-1, 1, false), false);
  }

  private setActiveIndex(index: number, reveal = true) {
    const normalizedIndex =
      index < 0 || index >= this.itemElements.length ? -1 : index;
    if (normalizedIndex === this.activeIndex) {
      return;
    }

    if (this.activeIndex >= 0) {
      this.itemElements[this.activeIndex]?.classList.remove('hovered');
    }

    this.activeIndex = normalizedIndex;

    if (this.activeIndex >= 0) {
      const activeElement = this.itemElements[this.activeIndex];
      activeElement.classList.add('hovered');
      this.element.setAttribute('aria-activedescendant', activeElement.id);
      if (reveal) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
      return;
    }

    this.element.removeAttribute('aria-activedescendant');
  }

  private findNextEnabledIndex(
    fromIndex: number,
    direction: 1 | -1,
    wrap = true,
  ) {
    const size = this.options.items.length;
    if (size === 0) {
      return -1;
    }

    let candidate = fromIndex;
    for (let step = 0; step < size; step += 1) {
      if (wrap) {
        candidate = (candidate + direction + size) % size;
      } else {
        candidate += direction;
      }

      if (candidate < 0 || candidate >= size) {
        break;
      }

      if (!this.options.items[candidate]?.disabled) {
        return candidate;
      }
    }

    return -1;
  }

  private selectByIndex(index: number, source: MenuSelectionSource) {
    const item = this.options.items[index];
    if (!item || item.disabled) {
      return;
    }

    this.options.onSelect?.({
      value: item.value,
      index,
      item,
      source,
    });
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = this.findNextEnabledIndex(
        clamp(this.activeIndex, -1, this.options.items.length - 1),
        1,
      );
      this.setActiveIndex(nextIndex);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const startIndex =
        this.activeIndex === -1 ? this.options.items.length : this.activeIndex;
      const nextIndex = this.findNextEnabledIndex(
        clamp(startIndex, 0, this.options.items.length),
        -1,
      );
      this.setActiveIndex(nextIndex);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      this.setActiveIndex(this.findNextEnabledIndex(-1, 1, false));
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      this.setActiveIndex(this.findNextEnabledIndex(this.options.items.length, -1, false));
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (this.activeIndex >= 0) {
        this.selectByIndex(this.activeIndex, 'keyboard');
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.options.onCancel?.();
    }
  };
}
