import 'ls/base/browser/ui/dropdown/dropdown.css';
import {
  createHoverController,
  type HoverHandle,
  type HoverInput,
} from 'ls/base/browser/ui/hover/hover';

export type DropdownSize = 'sm' | 'md' | 'lg';
export type DropdownMenuAlign = 'start' | 'center' | 'end';
export type DropdownDomMenuLayer = 'inline' | 'portal';
export type DropdownExternalMenuChangeSource = 'open' | 'props' | 'viewport';

export type DropdownOption = {
  value: string;
  label: string;
  title?: string;
  disabled?: boolean;
};

export type DropdownProps = {
  options: DropdownOption[];
  size?: DropdownSize;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  title?: string;
  hover?: HoverInput;
  menuMode?: 'dom' | 'external';
  domMenuLayer?: DropdownDomMenuLayer;
  menuAlign?: DropdownMenuAlign;
  onExternalMenuChange?: (request: DropdownExternalMenuRequest | null) => void;
  onChange?: (event: { target: { value: string } }) => void;
  onOpenChange?: (isOpen: boolean) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
};

export type DropdownExternalMenuRequest = {
  source: DropdownExternalMenuChangeSource;
  triggerRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  align: DropdownMenuAlign;
  options: DropdownOption[];
  value?: string;
};

function areTriggerRectsEqual(
  left: DropdownExternalMenuRequest['triggerRect'],
  right: DropdownExternalMenuRequest['triggerRect'],
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
      Boolean(option.disabled) === Boolean(nextOption?.disabled)
    );
  });
}

function shouldRefreshExternalMenu(
  current: DropdownExternalMenuRequest,
  next: DropdownExternalMenuRequest,
) {
  return (
    current.align !== next.align ||
    current.value !== next.value ||
    !areTriggerRectsEqual(current.triggerRect, next.triggerRect) ||
    !areDropdownOptionsEqual(current.options, next.options)
  );
}

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

function resolveSelectedOption(props: DropdownProps) {
  return props.options.find((option) => option.value === props.value) ?? null;
}

function composeClassName(parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(' ');
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

let dropdownViewIdSequence = 0;

export class DropdownView {
  private props: DropdownProps;
  private isOpen = false;
  private isFocused = false;
  private activeOptionIndex = -1;
  private menuPlacement: 'top' | 'bottom' = 'bottom';
  private menuMaxHeight: number | undefined;
  private menuLeft = 0;
  private readonly instanceId = ++dropdownViewIdSequence;
  private readonly menuId = `dropdown-menu-${this.instanceId}`;
  private readonly element = createElement('div');
  private readonly field = createElement('div', 'dropdown-field custom-dropdown-field');
  private readonly iconWrapper = createElement('div', 'dropdown-icon-wrapper');
  private readonly chevronIcon = createChevronIcon();
  private readonly hoverController: HoverHandle;
  private menuView: HTMLDivElement | null = null;
  private activeExternalMenuRequest: DropdownExternalMenuRequest | null = null;
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
    this.props = this.normalizeProps(props);
    if (this.props.disabled && this.isOpen) {
      this.setOpen(false);
    } else if (this.isOpen && this.usesExternalMenu()) {
      this.emitExternalMenuChange('props');
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
        if (!this.usesExternalMenu()) {
          this.activeOptionIndex =
            event.key === 'ArrowUp'
              ? this.findNextEnabledOptionIndex(this.props.options.length, -1)
              : this.findNextEnabledOptionIndex(-1, 1);
          this.render();
        }
        return;
      }
      if (!this.usesExternalMenu()) {
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
      if (this.isOpen && !this.usesExternalMenu()) {
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
    if (event.key === 'Home' && this.isOpen && !this.usesExternalMenu()) {
      event.preventDefault();
      this.activeOptionIndex = this.findNextEnabledOptionIndex(-1, 1);
      this.render();
      return;
    }
    if (event.key === 'End' && this.isOpen && !this.usesExternalMenu()) {
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
    if (!this.element.contains(event.target) && !this.menuView?.contains(event.target)) {
      this.isFocused = false;
      this.setOpen(false);
    }
  };

  private readonly handleDocumentFocusIn = (event: FocusEvent) => {
    if (!(event.target instanceof Node)) {
      return;
    }
    if (!this.element.contains(event.target) && !this.menuView?.contains(event.target)) {
      this.isFocused = false;
      this.setOpen(false);
    }
  };

  private readonly handleViewportChange = () => {
    if (!this.isOpen) {
      return;
    }
    if (this.usesExternalMenu()) {
      this.emitExternalMenuChange('viewport');
      return;
    }
    this.updateMenuPosition();
  };

  private setOpen(nextOpen: boolean) {
    if (this.isOpen === nextOpen) {
      return;
    }

    this.isOpen = nextOpen;
    this.activeOptionIndex = nextOpen ? this.getDefaultActiveOptionIndex() : -1;
    if (nextOpen) {
      this.attachOpenListeners();
      if (this.usesExternalMenu()) {
        this.emitExternalMenuChange('open');
      }
    } else {
      this.detachOpenListeners();
      if (this.usesExternalMenu()) {
        this.emitExternalMenuChange();
      }
    }

    this.props.onOpenChange?.(nextOpen);
    this.render();
    if (nextOpen && !this.usesExternalMenu()) {
      this.updateMenuPosition();
    }
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
      menuMode: props.menuMode ?? 'dom',
      domMenuLayer: props.domMenuLayer ?? 'inline',
      menuAlign: props.menuAlign ?? 'start',
    };
  }

  private usesExternalMenu() {
    return (
      this.props.menuMode === 'external' &&
      typeof this.props.onExternalMenuChange === 'function'
    );
  }

  private usesPortalDomMenu() {
    return this.props.menuMode === 'dom' && this.props.domMenuLayer === 'portal';
  }

  private usesDetachedMenu() {
    return this.usesPortalDomMenu() || this.usesExternalMenu();
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

  private emitExternalMenuChange(source?: DropdownExternalMenuChangeSource) {
    if (!this.usesExternalMenu()) {
      return;
    }

    if (!this.isOpen) {
      this.activeExternalMenuRequest = null;
      this.props.onExternalMenuChange?.(null);
      return;
    }

    const triggerRect = this.element.getBoundingClientRect();
    const nextRequest: DropdownExternalMenuRequest = {
      source: source ?? 'props',
      triggerRect: {
        x: triggerRect.x,
        y: triggerRect.y,
        width: triggerRect.width,
        height: triggerRect.height,
      },
      align: this.props.menuAlign ?? 'start',
      options: this.props.options,
      value: this.props.value,
    };

    if (
      nextRequest.source === 'props' &&
      this.activeExternalMenuRequest &&
      !shouldRefreshExternalMenu(this.activeExternalMenuRequest, nextRequest)
    ) {
      return;
    }

    this.activeExternalMenuRequest = nextRequest;
    this.props.onExternalMenuChange?.(nextRequest);
  }

  private updateMenuPosition() {
    if (!this.menuView) {
      return;
    }

    const viewportPadding = 8;
    const menuOffset = 4;
    const triggerRect = this.element.getBoundingClientRect();
    if (this.usesPortalDomMenu()) {
      this.menuView.style.minWidth = `${triggerRect.width}px`;
      this.menuView.style.top = '0px';
      this.menuView.style.bottom = 'auto';
      this.menuView.style.left = '0px';
    }
    const menuWidth = this.menuView.offsetWidth;
    const menuHeight = this.menuView.offsetHeight;
    const spaceBelow = window.innerHeight - triggerRect.bottom - viewportPadding;
    const spaceAbove = triggerRect.top - viewportPadding;
    const shouldOpenUpwards = spaceBelow < menuHeight && spaceAbove > spaceBelow;
    const availableSpace = shouldOpenUpwards ? spaceAbove : spaceBelow;
    const preferredLeft =
      this.props.menuAlign === 'center'
        ? (triggerRect.width - menuWidth) / 2
        : this.props.menuAlign === 'end'
          ? triggerRect.width - menuWidth
          : 0;
    const minLeft = viewportPadding - triggerRect.left;
    const maxLeft = window.innerWidth - viewportPadding - triggerRect.left - menuWidth;

    this.menuPlacement = shouldOpenUpwards ? 'top' : 'bottom';
    this.menuMaxHeight = Math.max(availableSpace - menuOffset, 120);
    this.menuLeft = clamp(preferredLeft, minLeft, Math.max(minLeft, maxLeft));
    this.applyMenuLayout();
  }

  private applyMenuLayout() {
    if (!this.menuView) {
      return;
    }

    this.menuView.classList.toggle('dropdown-menu-top', this.menuPlacement === 'top');
    this.menuView.classList.toggle('dropdown-menu-bottom', this.menuPlacement === 'bottom');

    if (typeof this.menuMaxHeight === 'number') {
      this.menuView.style.maxHeight = `${this.menuMaxHeight}px`;
    } else {
      this.menuView.style.removeProperty('max-height');
    }

    if (this.usesPortalDomMenu()) {
      const triggerRect = this.element.getBoundingClientRect();
      const menuOffset = 4;
      const top =
        this.menuPlacement === 'top'
          ? triggerRect.top - this.menuView.offsetHeight - menuOffset
          : triggerRect.bottom + menuOffset;
      this.menuView.style.left = `${triggerRect.left + this.menuLeft}px`;
      this.menuView.style.top = `${top}px`;
      this.menuView.style.bottom = 'auto';
      this.menuView.style.minWidth = `${triggerRect.width}px`;
      return;
    }

    this.menuView.style.left = `${this.menuLeft}px`;
    this.menuView.style.removeProperty('top');
    this.menuView.style.removeProperty('bottom');
    this.menuView.style.removeProperty('min-width');
  }

  private renderMenu() {
    if (!this.isOpen) {
      this.menuView?.remove();
      this.menuView = null;
      return;
    }

    if (this.usesExternalMenu()) {
      this.menuView?.remove();
      this.menuView = null;
      return;
    }

    const selectedValue = this.props.value;
    const menu = createElement(
      'div',
      composeClassName([
        'dropdown-menu',
        `dropdown-menu-${this.menuPlacement}`,
        this.usesPortalDomMenu() ? 'dropdown-menu-portal' : '',
      ]),
    );
    menu.id = this.menuId;
    menu.setAttribute('role', 'listbox');
    if (this.usesPortalDomMenu()) {
      menu.style.position = 'fixed';
    }

    menu.append(
      ...this.props.options.map((option, index) => {
        const item = createElement(
          'div',
          composeClassName([
            'dropdown-menu-item',
            selectedValue === option.value ? 'selected' : '',
            this.activeOptionIndex === index ? 'hovered' : '',
            option.disabled ? 'disabled' : '',
          ]),
        );
        item.id = this.getMenuItemId(index);
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', String(selectedValue === option.value));
        item.setAttribute('aria-disabled', option.disabled ? 'true' : 'false');
        if (option.title) {
          item.title = option.title;
        }
        const content = createElement('div', 'dropdown-menu-item-content', option.label);
        item.append(content);
        item.append(createCheckSlot(selectedValue === option.value));
        item.addEventListener('click', (event) => {
          event.stopPropagation();
          if (option.disabled) {
            return;
          }
          this.props.onChange?.({ target: { value: option.value } });
          this.setOpen(false);
        });
        return item;
      }),
    );

    this.menuView?.remove();
    this.menuView = menu;
    if (this.usesPortalDomMenu()) {
      document.body.append(menu);
      this.updateMenuPosition();
      return;
    }

    this.element.append(menu);
    this.applyMenuLayout();
  }

  private render() {
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
    if (this.isOpen && !this.usesExternalMenu()) {
      this.element.setAttribute('aria-controls', this.menuId);
    } else {
      this.element.removeAttribute('aria-controls');
    }
    if (this.isOpen && !this.usesExternalMenu() && this.activeOptionIndex >= 0) {
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

    this.field.textContent = selectedOption?.label ?? this.props.placeholder ?? '';
    this.field.removeAttribute('title');

    if (this.isOpen) {
      this.chevronIcon.classList.add('open');
    } else {
      this.chevronIcon.classList.remove('open');
    }

    this.renderMenu();
  }
}

export function createDropdownView(props: DropdownProps) {
  return new DropdownView(props);
}
