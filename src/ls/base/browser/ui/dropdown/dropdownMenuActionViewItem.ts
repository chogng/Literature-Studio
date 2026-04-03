import {
  ActionViewItem,
  BaseActionViewItem,
} from 'ls/base/browser/ui/actionbar/actionViewItems';
import {
  createDomDropdownMenuActionPresenter,
  type DropdownMenuActionAlignment,
  type DropdownMenuActionOverlayContext,
  type DropdownMenuActionPosition,
  type DropdownMenuActionPresenter,
  type DropdownMenuActionPresenterRequest,
} from 'ls/base/browser/ui/dropdown/dropdownMenuActionPresenter';
import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';
import type {
  ActionBarActionItem,
  ActionBarActionMode,
  ActionBarMenuItem,
  ActionBarRenderable,
} from 'ls/base/browser/ui/actionbar/actionbar';

export {
  createDomDropdownMenuActionPresenter,
} from 'ls/base/browser/ui/dropdown/dropdownMenuActionPresenter';
export type {
  DropdownMenuActionAlignment,
  DropdownMenuActionOverlayContext,
  DropdownMenuActionOption,
  DropdownMenuActionPosition,
  DropdownMenuActionPresenter,
  DropdownMenuActionPresenterRequest,
} from 'ls/base/browser/ui/dropdown/dropdownMenuActionPresenter';

export type DropdownMenuActionViewItemOptions = {
  id?: string;
  label: string;
  title?: string;
  content?: ActionBarRenderable;
  disabled?: boolean;
  active?: boolean;
  checked?: boolean;
  mode?: ActionBarActionMode;
  className?: string;
  buttonClassName?: string;
  buttonAttributes?: Record<string, string | null | undefined | false>;
  hover?: import('ls/base/browser/ui/hover/hover').HoverInput;
  menu?: readonly ActionBarMenuItem[];
  renderOverlay?: (context: DropdownMenuActionOverlayContext) => HTMLElement;
  overlayRole?: string;
  menuClassName?: string;
  minWidth?: number;
  menuPresenter?: DropdownMenuActionPresenter;
  overlayAlignment?: DropdownMenuActionAlignment;
  overlayPosition?: DropdownMenuActionPosition;
};

export type ActionWithDropdownMenuActionViewItemOptions = {
  primary: Omit<
    ActionBarActionItem,
    | 'menu'
    | 'renderOverlay'
    | 'overlayRole'
    | 'menuClassName'
    | 'minWidth'
    | 'menuPresenter'
    | 'overlayAlignment'
    | 'overlayPosition'
  >;
  dropdown: DropdownMenuActionViewItemOptions;
  className?: string;
};

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

function createMenuOptionValue(menuItem: ActionBarMenuItem, index: number) {
  return menuItem.id ?? `dropdown-menu-action-option-${index}`;
}

export class DropdownMenuActionViewItem extends ActionViewItem {
  private readonly defaultMenuPresenter = createDomDropdownMenuActionPresenter();
  private isOpen = false;

  private get options(): DropdownMenuActionViewItemOptions {
    return this.item as DropdownMenuActionViewItemOptions;
  }

  constructor(options: DropdownMenuActionViewItemOptions) {
    super(options);
    this.button.addEventListener('keydown', this.handleKeyDown);
    this.render();
  }

  setOptions(options: DropdownMenuActionViewItemOptions) {
    const previousPresenter = this.getMenuPresenter();
    this.setItem(options);
    const nextPresenter = this.getMenuPresenter();
    if (previousPresenter !== nextPresenter) {
      previousPresenter.hide();
    }
    this.render();
  }

  override render(container?: HTMLElement) {
    if (this.isDisposed()) {
      return;
    }

    super.render(container);
    this.button.setAttribute('aria-haspopup', this.options.overlayRole ?? 'menu');
    this.button.setAttribute('aria-expanded', String(this.isOpen));
  }

  show() {
    if (this.item.disabled || this.isDisposed() || this.isOpen) {
      return;
    }

    this.isOpen = true;
    this.button.setAttribute('aria-expanded', 'true');
    this.getMenuPresenter().show(this.createMenuRequest());
  }

  hide() {
    this.getMenuPresenter().hide();
  }

  override dispose() {
    if (this.isDisposed()) {
      return;
    }

    this.getMenuPresenter().hide();
    this.defaultMenuPresenter.dispose();
    this.button.removeEventListener('keydown', this.handleKeyDown);
    super.dispose();
  }

  toActionBarItem(): ActionBarActionItem {
    return createDropdownMenuActionViewItem(this.options);
  }

  private renderOverlay() {
    if (this.options.renderOverlay) {
      return this.options.renderOverlay({
        hide: () => this.hide(),
      });
    }

    return this.renderMenu();
  }

  private getMenuPresenter() {
    return this.options.menuPresenter ?? this.defaultMenuPresenter;
  }

  private createMenuRequest(): DropdownMenuActionPresenterRequest {
    const menuOptions = this.options.menu?.map((menuItem, index) => ({
      value: createMenuOptionValue(menuItem, index),
      label: menuItem.label,
      title: menuItem.title,
      icon: menuItem.icon,
      disabled: menuItem.disabled,
      checked: menuItem.checked,
    }));

    return {
      anchor: this.button,
      className: composeClassName(['actionbar-context-view', this.options.menuClassName]),
      minWidth: this.options.minWidth,
      alignment: this.options.overlayAlignment ?? 'end',
      position: this.options.overlayPosition ?? 'below',
      options: menuOptions,
      render: () => this.renderOverlay(),
      onHide: () => {
        this.isOpen = false;
        this.button.setAttribute('aria-expanded', 'false');
      },
      onSelectOption: (value: string) => {
        const menuItemIndex = menuOptions?.findIndex((option) => option.value === value) ?? -1;
        const menuItem = menuItemIndex >= 0 ? this.options.menu?.[menuItemIndex] : null;
        if (!menuItem || menuItem.disabled) {
          return;
        }
        menuItem.onClick?.(new MouseEvent('click'));
      },
    };
  }

  private renderMenu() {
    const menu = createElement('div', 'dropdown-menu dropdown-menu-bottom');
    menu.setAttribute('role', this.options.overlayRole ?? 'menu');
    menu.append(
      ...(this.options.menu ?? []).map((menuItem) => {
        const item = createElement(
          'div',
          composeClassName([
            'dropdown-menu-item',
            menuItem.checked ? 'selected' : '',
            menuItem.disabled ? 'disabled' : '',
          ]),
        );
        item.setAttribute('role', 'menuitem');
        item.setAttribute('aria-disabled', menuItem.disabled ? 'true' : 'false');
        if (menuItem.title) {
          item.title = menuItem.title;
        }

        const content = createElement('div', 'dropdown-option-content');
        if (menuItem.icon) {
          content.append(createLxIcon(menuItem.icon, 'dropdown-option-icon'));
        }
        content.append(createElement('div', 'dropdown-menu-item-content', menuItem.label));
        item.append(content);

        const checkSlot = createElement('span', 'dropdown-menu-item-check');
        checkSlot.setAttribute('aria-hidden', 'true');
        if (!menuItem.checked) {
          checkSlot.classList.add('placeholder');
        }
        item.append(checkSlot);

        item.addEventListener('click', (event) => {
          event.stopPropagation();
          if (menuItem.disabled) {
            return;
          }
          menuItem.onClick?.(event);
          this.hide();
        });
        return item;
      }),
    );
    return menu;
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.show();
  };

  protected override readonly handleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (this.isOpen) {
      this.hide();
      return;
    }
    this.show();
  };
}

export class ActionWithDropdownMenuActionViewItem extends BaseActionViewItem {
  private readonly primaryItem: ActionViewItem;
  protected readonly dropdownMenuActionViewItem: DropdownMenuActionViewItem;
  private readonly separator = createElement('div', 'action-dropdown-item-separator');

  constructor(options: ActionWithDropdownMenuActionViewItemOptions) {
    super(createElement('div', 'actionbar-item is-action action-dropdown-item'));
    this.primaryItem = new ActionViewItem(options.primary);
    this.dropdownMenuActionViewItem = new DropdownMenuActionViewItem(options.dropdown);
    if (options.className) {
      this.element.classList.add(...options.className.split(/\s+/).filter(Boolean));
    }
    this.separator.append(createElement('div'));
    this.primaryItem.render(this.element);
    this.element.append(this.separator);
    this.dropdownMenuActionViewItem.render(this.element);
    this.element.addEventListener('keydown', this.handleKeyDown);
  }

  override render(container?: HTMLElement) {
    if (this.isDisposed()) {
      return;
    }

    super.render(container);
    this.primaryItem.render(this.element);
    this.dropdownMenuActionViewItem.render(this.element);
  }

  override dispose() {
    if (this.isDisposed()) {
      return;
    }

    this.primaryItem.dispose();
    this.dropdownMenuActionViewItem.dispose();
    this.element.removeEventListener('keydown', this.handleKeyDown);
    super.dispose();
  }

  focus() {
    this.primaryItem.focus();
  }

  blur() {
    this.primaryItem.blur();
    this.dropdownMenuActionViewItem.blur();
  }

  getFocusableElement() {
    return this.primaryItem.getFocusableElement?.() ?? this.primaryItem.getElement();
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight' && document.activeElement === this.primaryItem.getFocusableElement?.()) {
      event.preventDefault();
      this.primaryItem.blur();
      this.dropdownMenuActionViewItem.focus();
      return;
    }

    if (
      event.key === 'ArrowLeft' &&
      document.activeElement === this.dropdownMenuActionViewItem.getFocusableElement?.()
    ) {
      event.preventDefault();
      this.dropdownMenuActionViewItem.blur();
      this.primaryItem.focus();
    }
  };
}

export function createDropdownMenuActionViewItem(
  options: DropdownMenuActionViewItemOptions,
): ActionBarActionItem {
  return {
    id: options.id,
    label: options.label,
    title: options.title,
    content: options.content,
    disabled: options.disabled,
    active: options.active,
    checked: options.checked,
    mode: options.mode,
    className: options.className,
    buttonClassName: options.buttonClassName,
    buttonAttributes: options.buttonAttributes,
    hover: options.hover,
    menu: [...(options.menu ?? [])],
    renderOverlay: options.renderOverlay,
    overlayRole: options.overlayRole,
    menuClassName: options.menuClassName,
    minWidth: options.minWidth,
    menuPresenter: options.menuPresenter,
    overlayAlignment: options.overlayAlignment,
    overlayPosition: options.overlayPosition,
  };
}

export function createActionWithDropdownMenuActionViewItem(
  options: ActionWithDropdownMenuActionViewItemOptions,
): ActionWithDropdownMenuActionViewItem {
  return new ActionWithDropdownMenuActionViewItem(options);
}
