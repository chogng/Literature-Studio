import { createContextViewController } from 'ls/base/browser/ui/contextview/contextview';
import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';
import type {
  DropdownMenuAlign,
  DropdownOption,
} from 'ls/base/browser/ui/dropdown/dropdown';

export type DropdownDomMenuLayer = 'inline' | 'portal';
export type DropdownMenuChangeSource = 'open' | 'props' | 'viewport';

export type DropdownMenuRequest = {
  source: DropdownMenuChangeSource;
  anchor: HTMLElement;
  triggerRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  align: DropdownMenuAlign;
  options: DropdownOption[];
  value?: string;
  activeOptionIndex: number;
  matchTriggerWidth: boolean;
  menuId: string;
  getMenuItemId: (index: number) => string;
  onSelect: (value: string) => void;
  onHide: () => void;
};

export type DropdownMenuPresenter = {
  readonly isDetached: boolean;
  readonly supportsActiveDescendant: boolean;
  readonly respondsToViewportChanges: boolean;
  show: (request: DropdownMenuRequest) => void;
  hide: () => void;
  isVisible: () => boolean;
  containsTarget: (target: Node) => boolean;
  dispose: () => void;
};

const SVG_NS = 'http://www.w3.org/2000/svg';

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

function createOptionContent(option: DropdownOption) {
  const content = createElement('div', 'dropdown-option-content');
  if (option.icon) {
    content.append(createLxIcon(option.icon, 'dropdown-option-icon'));
  }
  content.append(createElement('div', 'dropdown-menu-item-content', option.label));
  return content;
}

function areTriggerRectsEqual(
  left: DropdownMenuRequest['triggerRect'],
  right: DropdownMenuRequest['triggerRect'],
) {
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  );
}

function areDropdownOptionsEqual(left: DropdownOption[], right: DropdownOption[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((option, index) => {
    const nextOption = right[index];
    return (
      option.value === nextOption?.value &&
      option.label === nextOption?.label &&
      option.title === nextOption?.title &&
      option.icon === nextOption?.icon &&
      Boolean(option.disabled) === Boolean(nextOption?.disabled)
    );
  });
}

export function shouldRefreshDropdownMenuRequest(
  current: Pick<DropdownMenuRequest, 'align' | 'value' | 'triggerRect' | 'options'>,
  next: Pick<DropdownMenuRequest, 'align' | 'value' | 'triggerRect' | 'options'>,
) {
  return (
    current.align !== next.align ||
    current.value !== next.value ||
    !areTriggerRectsEqual(current.triggerRect, next.triggerRect) ||
    !areDropdownOptionsEqual(current.options, next.options)
  );
}

class DomDropdownMenuPresenter implements DropdownMenuPresenter {
  readonly isDetached: boolean;
  readonly supportsActiveDescendant = true;
  readonly respondsToViewportChanges: boolean;
  private readonly contextView = createContextViewController();
  private menuView: HTMLDivElement | null = null;
  private currentRequest: DropdownMenuRequest | null = null;

  constructor(private readonly layer: DropdownDomMenuLayer) {
    this.isDetached = layer === 'portal';
    this.respondsToViewportChanges = layer === 'portal';
  }

  show = (request: DropdownMenuRequest) => {
    this.currentRequest = request;
    const menu = this.renderMenu(request);
    this.menuView?.remove();
    this.menuView = menu;

    if (this.layer === 'portal') {
      this.contextView.show({
        anchor: request.anchor,
        className: 'dropdown-context-view',
        render: () => menu,
        onHide: this.handlePortalHide,
      });
      this.updateMenuLayout(menu, request);
      return;
    }

    request.anchor.append(menu);
    this.updateMenuLayout(menu, request);
  };

  hide = () => {
    if (this.layer === 'portal') {
      this.contextView.hide();
      return;
    }

    this.menuView?.remove();
    this.menuView = null;
    this.currentRequest = null;
  };

  isVisible = () =>
    this.layer === 'portal'
      ? this.contextView.isVisible()
      : this.menuView !== null;

  containsTarget = (target: Node) => this.menuView?.contains(target) ?? false;

  dispose = () => {
    this.menuView?.remove();
    this.menuView = null;
    this.currentRequest = null;
    this.contextView.dispose();
  };

  private readonly handlePortalHide = () => {
    const request = this.currentRequest;
    this.menuView = null;
    this.currentRequest = null;
    request?.onHide();
  };

  private renderMenu(request: DropdownMenuRequest) {
    const menu = createElement(
      'div',
      composeClassName([
        'dropdown-menu',
        this.layer === 'portal' ? 'dropdown-menu-portal' : '',
      ]),
    );
    menu.id = request.menuId;
    menu.setAttribute('role', 'listbox');
    if (this.layer === 'portal') {
      menu.style.position = 'fixed';
    }

    const selectedValue = request.value;
    menu.append(
      ...request.options.map((option, index) => {
        const item = createElement(
          'div',
          composeClassName([
            'dropdown-menu-item',
            selectedValue === option.value ? 'selected' : '',
            request.activeOptionIndex === index ? 'hovered' : '',
            option.disabled ? 'disabled' : '',
          ]),
        );
        item.id = request.getMenuItemId(index);
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', String(selectedValue === option.value));
        item.setAttribute('aria-disabled', option.disabled ? 'true' : 'false');
        if (option.title) {
          item.title = option.title;
        }
        item.append(createOptionContent(option), createCheckSlot(selectedValue === option.value));
        item.addEventListener('click', (event) => {
          event.stopPropagation();
          if (option.disabled) {
            return;
          }
          request.onSelect(option.value);
        });
        return item;
      }),
    );

    return menu;
  }

  private updateMenuLayout(menu: HTMLDivElement, request: DropdownMenuRequest) {
    const viewportPadding = 8;
    const menuOffset = 4;
    const triggerRect = request.triggerRect;

    if (this.layer === 'portal') {
      menu.style.minWidth = request.matchTriggerWidth
        ? `${triggerRect.width}px`
        : '0px';
      menu.style.left = '0px';
      menu.style.top = '0px';
      menu.style.bottom = 'auto';
    }

    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const spaceBelow = window.innerHeight - triggerRect.y - triggerRect.height - viewportPadding;
    const spaceAbove = triggerRect.y - viewportPadding;
    const shouldOpenUpwards = spaceBelow < menuHeight && spaceAbove > spaceBelow;
    const availableSpace = shouldOpenUpwards ? spaceAbove : spaceBelow;
    const preferredLeft =
      request.align === 'center'
        ? (triggerRect.width - menuWidth) / 2
        : request.align === 'end'
          ? triggerRect.width - menuWidth
          : 0;
    const minLeft = viewportPadding - triggerRect.x;
    const maxLeft =
      window.innerWidth - viewportPadding - triggerRect.x - menuWidth;
    const menuLeft = clamp(preferredLeft, minLeft, Math.max(minLeft, maxLeft));

    menu.classList.toggle('dropdown-menu-top', shouldOpenUpwards);
    menu.classList.toggle('dropdown-menu-bottom', !shouldOpenUpwards);
    menu.style.maxHeight = `${Math.max(availableSpace - menuOffset, 120)}px`;

    if (this.layer === 'portal') {
      const top = shouldOpenUpwards
        ? triggerRect.y - menu.offsetHeight - menuOffset
        : triggerRect.y + triggerRect.height + menuOffset;
      menu.style.left = `${triggerRect.x + menuLeft}px`;
      menu.style.top = `${top}px`;
      menu.style.bottom = 'auto';
      menu.style.minWidth = request.matchTriggerWidth
        ? `${triggerRect.width}px`
        : '0px';
      return;
    }

    menu.style.left = `${menuLeft}px`;
    menu.style.removeProperty('top');
    menu.style.removeProperty('bottom');
    menu.style.removeProperty('min-width');
  }
}

export function createDomDropdownMenuPresenter(options?: {
  layer?: DropdownDomMenuLayer;
}): DropdownMenuPresenter {
  return new DomDropdownMenuPresenter(options?.layer ?? 'inline');
}
