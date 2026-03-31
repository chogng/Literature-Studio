import './dropdown.css';

export type DropdownSize = 'sm' | 'md' | 'lg';
export type DropdownMenuAlign = 'start' | 'center' | 'end';
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
  menuMode?: 'dom' | 'external';
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

export class DropdownView {
  private props: DropdownProps;
  private isOpen = false;
  private isFocused = false;
  private menuPlacement: 'top' | 'bottom' = 'bottom';
  private menuMaxHeight: number | undefined;
  private menuLeft = 0;
  private readonly element = createElement('div');
  private readonly field = createElement('div', 'dropdown-field custom-dropdown-field');
  private readonly iconWrapper = createElement('div', 'dropdown-icon-wrapper');
  private readonly chevronIcon = createChevronIcon();
  private menuView: HTMLDivElement | null = null;
  private removeDocumentMouseDown = () => {};
  private removeViewportListeners = () => {};
  private disposed = false;

  constructor(props: DropdownProps) {
    this.props = this.normalizeProps(props);
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
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.setOpen(!this.isOpen);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.setOpen(false);
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

    if (this.usesExternalMenu() && this.isOpen) {
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
    if (!this.element.contains(event.target)) {
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
    if (nextOpen) {
      this.attachOpenListeners();
      if (this.usesExternalMenu()) {
        this.emitExternalMenuChange('open');
      }
    } else {
      this.detachOpenListeners();
      this.emitExternalMenuChange();
    }

    this.props.onOpenChange?.(nextOpen);
    this.render();
    if (nextOpen && !this.usesExternalMenu()) {
      this.updateMenuPosition();
    }
  }

  private attachOpenListeners() {
    if (!this.usesExternalMenu()) {
      document.addEventListener('mousedown', this.handleDocumentMouseDown);
      this.removeDocumentMouseDown = () => {
        document.removeEventListener('mousedown', this.handleDocumentMouseDown);
      };
    }
    window.addEventListener('resize', this.handleViewportChange);
    window.addEventListener('scroll', this.handleViewportChange, true);
    this.removeViewportListeners = () => {
      window.removeEventListener('resize', this.handleViewportChange);
      window.removeEventListener('scroll', this.handleViewportChange, true);
    };
  }

  private detachOpenListeners() {
    this.removeDocumentMouseDown();
    this.removeViewportListeners();
    this.removeDocumentMouseDown = () => {};
    this.removeViewportListeners = () => {};
  }

  private normalizeProps(props: DropdownProps): DropdownProps {
    return {
      ...props,
      options: Array.isArray(props.options) ? props.options : [],
      size: props.size ?? 'md',
      className: props.className ?? '',
      menuMode: props.menuMode ?? 'dom',
      menuAlign: props.menuAlign ?? 'start',
    };
  }

  private usesExternalMenu() {
    return this.props.menuMode === 'external';
  }

  private emitExternalMenuChange(source?: DropdownExternalMenuChangeSource) {
    if (!this.usesExternalMenu()) {
      return;
    }

    if (!this.isOpen) {
      this.props.onExternalMenuChange?.(null);
      return;
    }

    const triggerRect = this.element.getBoundingClientRect();
    this.props.onExternalMenuChange?.({
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
    });
  }

  private updateMenuPosition() {
    if (!this.menuView) {
      return;
    }

    const viewportPadding = 8;
    const menuOffset = 4;
    const triggerRect = this.element.getBoundingClientRect();
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
    this.renderMenu();
  }

  private renderMenu() {
    if (this.usesExternalMenu() || !this.isOpen) {
      this.menuView?.remove();
      this.menuView = null;
      return;
    }

    const selectedValue = this.props.value;
    const menu = createElement('div', `dropdown-menu dropdown-menu-${this.menuPlacement}`);
    menu.style.left = `${this.menuLeft}px`;
    if (typeof this.menuMaxHeight === 'number') {
      menu.style.maxHeight = `${this.menuMaxHeight}px`;
    }

    menu.append(
      ...this.props.options.map((option) => {
        const item = createElement(
          'div',
          composeClassName([
            'dropdown-menu-item',
            selectedValue === option.value ? 'selected' : '',
            option.disabled ? 'disabled' : '',
          ]),
        );
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
    this.element.append(menu);
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
    this.element.tabIndex = this.props.disabled ? -1 : 0;
    this.element.title = this.props.title ?? selectedOption?.title ?? '';

    this.field.textContent = selectedOption?.label ?? this.props.placeholder ?? '';
    if (selectedOption?.title) {
      this.field.title = selectedOption.title;
    } else {
      this.field.removeAttribute('title');
    }

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
