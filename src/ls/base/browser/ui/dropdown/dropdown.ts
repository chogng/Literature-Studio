import 'ls/base/browser/ui/dropdown/dropdown.css';
import {
  createDomDropdownMenuPresenter,
  type DropdownMenuChangeSource,
  type DropdownMenuPresenter,
  type DropdownMenuRequest,
} from 'ls/base/browser/ui/dropdown/dropdownMenuPresenter';
import {
  createHoverController,
  type HoverHandle,
  type HoverInput,
} from 'ls/base/browser/ui/hover/hover';
import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';
import type { LxIconName } from 'ls/base/browser/ui/lxicon/lxicon';

export {
  createDomDropdownMenuPresenter,
} from 'ls/base/browser/ui/dropdown/dropdownMenuPresenter';
export type {
  DropdownDomMenuLayer,
  DropdownMenuChangeSource,
  DropdownMenuPresenter,
  DropdownMenuRequest,
} from 'ls/base/browser/ui/dropdown/dropdownMenuPresenter';

export type DropdownSize = 'sm' | 'md' | 'lg';
export type DropdownMenuAlign = 'start' | 'center' | 'end';

export type DropdownOption = {
  value: string;
  label: string;
  title?: string;
  icon?: LxIconName;
  disabled?: boolean;
};

export type DropdownProps = {
  options: DropdownOption[];
  size?: DropdownSize;
  value?: string;
  placeholder?: string;
  matchTriggerWidth?: boolean;
  disabled?: boolean;
  className?: string;
  title?: string;
  hover?: HoverInput;
  menuPresenter?: DropdownMenuPresenter;
  menuAlign?: DropdownMenuAlign;
  onChange?: (event: { target: { value: string } }) => void;
  onOpenChange?: (isOpen: boolean) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
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

function createChevronIcon() {
  const icon = document.createElementNS(SVG_NS, 'svg');
  icon.setAttribute('viewBox', '0 0 16 16');
  icon.setAttribute('width', '14');
  icon.setAttribute('height', '14');
  icon.setAttribute('aria-hidden', 'true');
  icon.classList.add('dropdown-chevron');

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M4 6l4 4 4-4');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.8');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  icon.append(path);

  return icon;
}

function createOptionContent(option: DropdownOption) {
  const content = createElement('div', 'dropdown-option-content');
  if (option.icon) {
    content.append(createLxIcon(option.icon, 'dropdown-option-icon'));
  }
  content.append(createElement('div', 'dropdown-menu-item-content', option.label));
  return content;
}

function resolveSelectedOption(props: DropdownProps) {
  return props.options.find((option) => option.value === props.value) ?? null;
}

function composeClassName(parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(' ');
}

let dropdownViewIdSequence = 0;

export class DropdownView {
  private props: DropdownProps;
  private isOpen = false;
  private isFocused = false;
  private activeOptionIndex = -1;
  private readonly instanceId = ++dropdownViewIdSequence;
  private readonly menuId = `dropdown-menu-${this.instanceId}`;
  private readonly element = createElement('div');
  private readonly field = createElement('div', 'dropdown-field custom-dropdown-field');
  private readonly iconWrapper = createElement('div', 'dropdown-icon-wrapper');
  private readonly chevronIcon = createChevronIcon();
  private readonly hoverController: HoverHandle;
  private readonly defaultMenuPresenter = createDomDropdownMenuPresenter({ layer: 'inline' });
  private removeDocumentMouseDown = () => {};
  private removeDocumentFocusIn = () => {};
  private removeViewportListeners = () => {};
  private disposed = false;

  constructor(props: DropdownProps) {
    this.props = this.normalizeProps(props);
    this.hoverController = createHoverController(this.element, null);
    this.iconWrapper.append(this.chevronIcon);
    this.element.append(this.field, this.iconWrapper);

    this.element.addEventListener('click', this.handleClick);
    this.element.addEventListener('keydown', this.handleKeyDown);
    this.element.addEventListener('focus', this.handleFocus);
    this.element.addEventListener('blur', this.handleBlur);

    this.render();
  }

  getElement() {
    return this.element;
  }

  setProps(props: DropdownProps) {
    const previousPresenter = this.getMenuPresenter();
    this.props = this.normalizeProps(props);
    const nextPresenter = this.getMenuPresenter();
    if (previousPresenter !== nextPresenter) {
      previousPresenter.hide();
    }
    if (this.props.disabled && this.isOpen) {
      this.setOpen(false);
    } else if (
      this.isOpen &&
      (
        this.activeOptionIndex < 0 ||
        !this.props.options[this.activeOptionIndex] ||
        this.props.options[this.activeOptionIndex]?.disabled
      )
    ) {
      this.activeOptionIndex = this.getDefaultActiveOptionIndex();
    }
    this.render();
  }

  focus() {
    this.element.focus();
  }

  blur() {
    this.dismissInternal({ preserveMenuState: true });
  }

  dismiss() {
    this.dismissInternal();
  }

  open() {
    if (this.props.disabled) {
      return;
    }
    this.setOpen(true);
  }

  close() {
    this.setOpen(false);
  }

  dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.setOpen(false);
    this.element.removeEventListener('click', this.handleClick);
    this.element.removeEventListener('keydown', this.handleKeyDown);
    this.element.removeEventListener('focus', this.handleFocus);
    this.element.removeEventListener('blur', this.handleBlur);
    this.defaultMenuPresenter.dispose();
    this.hoverController.dispose();
    this.element.replaceChildren();
  }

  private dismissInternal(options?: { preserveMenuState?: boolean }) {
    const isActiveElement = document.activeElement === this.element;
    this.isFocused = false;

    if (!options?.preserveMenuState) {
      this.setOpen(false);
    }

    if (isActiveElement) {
      this.element.blur();
      return;
    }

    this.render();
  }

  private readonly handleClick = (event: MouseEvent) => {
    event.stopPropagation();
    if (this.props.disabled) {
      return;
    }
    this.setOpen(!this.isOpen);
  };

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (this.props.disabled) {
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.isOpen) {
        this.setOpen(true);
        if (this.getMenuPresenter().supportsActiveDescendant) {
          this.activeOptionIndex =
            event.key === 'ArrowUp'
              ? this.findNextEnabledOptionIndex(this.props.options.length, -1)
              : this.findNextEnabledOptionIndex(-1, 1);
          this.render();
        }
        return;
      }
      if (this.getMenuPresenter().supportsActiveDescendant) {
        this.activeOptionIndex = this.findNextEnabledOptionIndex(
          this.activeOptionIndex,
          event.key === 'ArrowUp' ? -1 : 1,
        );
        this.render();
      }
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (this.isOpen && this.getMenuPresenter().supportsActiveDescendant) {
        this.selectActiveOption();
        return;
      }
      this.setOpen(!this.isOpen);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.setOpen(false);
      this.element.focus();
      return;
    }
    if (event.key === 'Home' && this.isOpen && this.getMenuPresenter().supportsActiveDescendant) {
      event.preventDefault();
      this.activeOptionIndex = this.findNextEnabledOptionIndex(-1, 1);
      this.render();
      return;
    }
    if (event.key === 'End' && this.isOpen && this.getMenuPresenter().supportsActiveDescendant) {
      event.preventDefault();
      this.activeOptionIndex = this.findNextEnabledOptionIndex(this.props.options.length, -1);
      this.render();
    }
  };

  private readonly handleFocus = (event: FocusEvent) => {
    if (!(event.currentTarget instanceof HTMLDivElement)) {
      return;
    }
    this.isFocused = true;
    this.render();
    this.props.onFocus?.(event);
  };

  private readonly handleBlur = (event: FocusEvent) => {
    if (!(event.currentTarget instanceof HTMLDivElement)) {
      return;
    }

    if (this.usesDetachedMenu() && this.isOpen) {
      this.props.onBlur?.(event);
      return;
    }

    const relatedTarget = event.relatedTarget;
    if (!(relatedTarget instanceof Node) || !this.element.contains(relatedTarget)) {
      this.isFocused = false;
      this.setOpen(false);
    }
    this.render();
    this.props.onBlur?.(event);
  };

  private readonly handleDocumentMouseDown = (event: MouseEvent) => {
    if (!(event.target instanceof Node)) {
      return;
    }
    if (
      !this.element.contains(event.target) &&
      !this.getMenuPresenter().containsTarget(event.target)
    ) {
      this.isFocused = false;
      this.setOpen(false);
    }
  };

  private readonly handleDocumentFocusIn = (event: FocusEvent) => {
    if (!(event.target instanceof Node)) {
      return;
    }
    if (
      !this.element.contains(event.target) &&
      !this.getMenuPresenter().containsTarget(event.target)
    ) {
      this.isFocused = false;
      this.setOpen(false);
    }
  };

  private readonly handleViewportChange = () => {
    const presenter = this.getMenuPresenter();
    if (!this.isOpen || !presenter.respondsToViewportChanges) {
      return;
    }
    this.presentMenu('viewport');
  };

  private setOpen(nextOpen: boolean) {
    if (this.isOpen === nextOpen) {
      return;
    }

    this.isOpen = nextOpen;
    this.activeOptionIndex = nextOpen ? this.getDefaultActiveOptionIndex() : -1;
    if (nextOpen) {
      this.attachOpenListeners();
    } else {
      this.detachOpenListeners();
    }

    this.props.onOpenChange?.(nextOpen);
    this.render(nextOpen ? 'open' : 'props');
  }

  private attachOpenListeners() {
    document.addEventListener('mousedown', this.handleDocumentMouseDown);
    this.removeDocumentMouseDown = () => {
      document.removeEventListener('mousedown', this.handleDocumentMouseDown);
    };
    document.addEventListener('focusin', this.handleDocumentFocusIn);
    this.removeDocumentFocusIn = () => {
      document.removeEventListener('focusin', this.handleDocumentFocusIn);
    };
    window.addEventListener('resize', this.handleViewportChange);
    window.addEventListener('scroll', this.handleViewportChange, true);
    this.removeViewportListeners = () => {
      window.removeEventListener('resize', this.handleViewportChange);
      window.removeEventListener('scroll', this.handleViewportChange, true);
    };
  }

  private detachOpenListeners() {
    this.removeDocumentMouseDown();
    this.removeDocumentFocusIn();
    this.removeViewportListeners();
    this.removeDocumentMouseDown = () => {};
    this.removeDocumentFocusIn = () => {};
    this.removeViewportListeners = () => {};
  }

  private normalizeProps(props: DropdownProps): DropdownProps {
    return {
      ...props,
      options: Array.isArray(props.options) ? props.options : [],
      size: props.size ?? 'md',
      className: props.className ?? '',
      matchTriggerWidth: props.matchTriggerWidth ?? true,
      menuAlign: props.menuAlign ?? 'start',
    };
  }

  private usesDetachedMenu() {
    return this.getMenuPresenter().isDetached;
  }

  private getMenuItemId(index: number) {
    return `${this.menuId}-option-${index}`;
  }

  private getDefaultActiveOptionIndex() {
    const selectedIndex = this.props.options.findIndex(
      (option) => option.value === this.props.value && !option.disabled,
    );
    if (selectedIndex >= 0) {
      return selectedIndex;
    }

    return this.findNextEnabledOptionIndex(-1, 1);
  }

  private findNextEnabledOptionIndex(startIndex: number, step: 1 | -1) {
    const { options } = this.props;
    if (options.length === 0) {
      return -1;
    }

    let index = startIndex;
    for (let attempt = 0; attempt < options.length; attempt += 1) {
      index = (index + step + options.length) % options.length;
      if (!options[index]?.disabled) {
        return index;
      }
    }

    return -1;
  }

  private selectActiveOption() {
    const option = this.props.options[this.activeOptionIndex];
    if (!option || option.disabled) {
      return;
    }

    this.props.onChange?.({ target: { value: option.value } });
    this.setOpen(false);
  }

  private getMenuPresenter() {
    return this.props.menuPresenter ?? this.defaultMenuPresenter;
  }

  private createMenuRequest(source: DropdownMenuChangeSource): DropdownMenuRequest {
    const triggerRect = this.element.getBoundingClientRect();
    return {
      source,
      anchor: this.element,
      triggerRect: {
        x: triggerRect.x,
        y: triggerRect.y,
        width: triggerRect.width,
        height: triggerRect.height,
      },
      align: this.props.menuAlign ?? 'start',
      options: this.props.options,
      value: this.props.value,
      activeOptionIndex: this.activeOptionIndex,
      matchTriggerWidth: this.props.matchTriggerWidth ?? true,
      menuId: this.menuId,
      getMenuItemId: (index) => this.getMenuItemId(index),
      onSelect: (value: string) => {
        this.props.onChange?.({ target: { value } });
        this.setOpen(false);
      },
      onHide: () => {
        this.isFocused = false;
        this.setOpen(false);
      },
    };
  }

  private presentMenu(source: DropdownMenuChangeSource = 'props') {
    const presenter = this.getMenuPresenter();
    if (!this.isOpen) {
      presenter.hide();
      return;
    }

    presenter.show(this.createMenuRequest(source));
  }

  private render(menuSource: DropdownMenuChangeSource = 'props') {
    const presenter = this.getMenuPresenter();
    const selectedOption = resolveSelectedOption(this.props);
    this.element.className = composeClassName([
      'dropdown-wrapper',
      `dropdown-${this.props.size ?? 'md'}`,
      this.isOpen || this.isFocused ? 'dropdown-focused' : '',
      this.props.disabled ? 'dropdown-disabled' : '',
      this.props.className,
    ]);
    this.element.setAttribute('role', 'combobox');
    this.element.setAttribute('aria-haspopup', 'listbox');
    this.element.setAttribute('aria-expanded', String(this.isOpen));
    this.element.setAttribute('aria-disabled', String(Boolean(this.props.disabled)));
    this.element.tabIndex = this.props.disabled ? -1 : 0;
    if (this.isOpen && presenter.supportsActiveDescendant) {
      this.element.setAttribute('aria-controls', this.menuId);
    } else {
      this.element.removeAttribute('aria-controls');
    }
    if (this.isOpen && presenter.supportsActiveDescendant && this.activeOptionIndex >= 0) {
      this.element.setAttribute('aria-activedescendant', this.getMenuItemId(this.activeOptionIndex));
    } else {
      this.element.removeAttribute('aria-activedescendant');
    }
    const resolvedHover =
      this.props.hover === undefined
        ? this.props.title ?? selectedOption?.title ?? null
        : this.props.hover;
    this.hoverController.update(resolvedHover);
    this.element.removeAttribute('title');

    this.field.replaceChildren();
    this.field.removeAttribute('title');
    if (selectedOption) {
      this.field.append(createOptionContent(selectedOption));
    } else if (this.props.placeholder) {
      this.field.textContent = this.props.placeholder;
    }

    if (this.isOpen) {
      this.chevronIcon.classList.add('open');
    } else {
      this.chevronIcon.classList.remove('open');
    }

    this.presentMenu(menuSource);
  }
}

export function createDropdownView(props: DropdownProps) {
  return new DropdownView(props);
}
