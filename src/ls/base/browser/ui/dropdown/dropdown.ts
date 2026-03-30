import type {
  NativeMenuEvent,
  NativeMenuOpenPayload,
} from '../../../parts/sandbox/common/desktopTypes.js';
import './dropdown.css';

export type DropdownSize = 'sm' | 'md' | 'lg';

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
  disabled?: boolean;
  className?: string;
  title?: string;
  onChange?: (event: { target: { value: string } }) => void;
  onOpenChange?: (isOpen: boolean) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
};

const SVG_NS = 'http://www.w3.org/2000/svg';
let dropdownRequestId = 0;

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
  icon.setAttribute('width', '14');
  icon.setAttribute('height', '14');
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

function shouldUseNativeMenuOverlay() {
  if (typeof window === 'undefined') {
    return false;
  }

  const nativeOverlayKind = new URLSearchParams(window.location.search).get('nativeOverlay');
  if (nativeOverlayKind === 'menu' || nativeOverlayKind === 'toast') {
    return false;
  }

  return typeof window.electronAPI?.menu?.open === 'function';
}

function resolveNativeMenuCoverage(className: string) {
  return className.includes('titlebar-source-select')
    ? ('trigger-band' as const)
    : ('full-window' as const);
}

function resolveSelectedOption(props: DropdownProps) {
  return props.options.find((option) => option.value === props.value) ?? props.options[0] ?? null;
}

function composeClassName(parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(' ');
}

export class DropdownView {
  private props: DropdownProps;
  private isOpen = false;
  private isFocused = false;
  private menuPlacement: 'top' | 'bottom' = 'bottom';
  private menuMaxHeight: number | undefined;
  private readonly usesNativeMenuOverlay: boolean;
  private readonly requestId = `native-dropdown-${++dropdownRequestId}`;
  private readonly element = createElement('div');
  private readonly field = createElement('div', 'dropdown-field custom-dropdown-field');
  private readonly iconWrapper = createElement('div', 'dropdown-icon-wrapper');
  private readonly chevronIcon = createChevronIcon();
  private readonly menuApi = window.electronAPI?.menu;
  private menuView: HTMLDivElement | null = null;
  private removeDocumentMouseDown = () => {};
  private removeViewportListeners = () => {};
  private readonly removeNativeMenuEventListener: () => void;
  private disposed = false;

  constructor(props: DropdownProps) {
    this.props = this.normalizeProps(props);
    this.usesNativeMenuOverlay = shouldUseNativeMenuOverlay();
    this.iconWrapper.append(this.chevronIcon);
    this.element.append(this.field, this.iconWrapper);

    this.element.addEventListener('click', this.handleClick);
    this.element.addEventListener('keydown', this.handleKeyDown);
    this.element.addEventListener('focus', this.handleFocus);
    this.element.addEventListener('blur', this.handleBlur);

    this.removeNativeMenuEventListener =
      this.usesNativeMenuOverlay && typeof this.menuApi?.onEvent === 'function'
        ? this.menuApi.onEvent((event) => {
            const nativeEvent = event as NativeMenuEvent;
            if (nativeEvent.requestId !== this.requestId) {
              return;
            }
            this.setOpen(false, { closeNativeMenu: false });
            this.isFocused = false;
            if (nativeEvent.type === 'select' && typeof nativeEvent.value === 'string') {
              this.props.onChange?.({ target: { value: nativeEvent.value } });
            }
            this.render();
          })
        : () => {};

    this.render();
  }

  getElement() {
    return this.element;
  }

  setProps(props: DropdownProps) {
    this.props = this.normalizeProps(props);
    if (this.props.disabled && this.isOpen) {
      this.setOpen(false);
    } else if (this.isOpen && this.usesNativeMenuOverlay) {
      this.openNativeMenu();
    }
    this.render();
  }

  focus() {
    this.element.focus();
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
    this.removeNativeMenuEventListener();
    this.element.removeEventListener('click', this.handleClick);
    this.element.removeEventListener('keydown', this.handleKeyDown);
    this.element.removeEventListener('focus', this.handleFocus);
    this.element.removeEventListener('blur', this.handleBlur);
    this.element.replaceChildren();
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

    if (this.usesNativeMenuOverlay && this.isOpen) {
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
    if (this.usesNativeMenuOverlay) {
      this.openNativeMenu();
      return;
    }
    this.updateMenuPosition();
  };

  private setOpen(nextOpen: boolean, options?: { closeNativeMenu?: boolean }) {
    if (this.isOpen === nextOpen) {
      return;
    }

    this.isOpen = nextOpen;
    if (nextOpen) {
      this.attachOpenListeners();
      if (this.usesNativeMenuOverlay) {
        this.openNativeMenu();
      }
    } else {
      this.detachOpenListeners();
      const shouldCloseNativeMenu = options?.closeNativeMenu !== false;
      if (this.usesNativeMenuOverlay && shouldCloseNativeMenu) {
        this.menuApi?.close(this.requestId);
      }
    }

    this.props.onOpenChange?.(nextOpen);
    this.render();
    if (nextOpen && !this.usesNativeMenuOverlay) {
      this.updateMenuPosition();
    }
  }

  private attachOpenListeners() {
    if (!this.usesNativeMenuOverlay) {
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
    };
  }

  private openNativeMenu() {
    if (!this.usesNativeMenuOverlay || !this.menuApi) {
      return;
    }

    const triggerRect = this.element.getBoundingClientRect();
    const payload: NativeMenuOpenPayload = {
      requestId: this.requestId,
      triggerRect: {
        x: triggerRect.x,
        y: triggerRect.y,
        width: triggerRect.width,
        height: triggerRect.height,
      },
      options: this.props.options,
      value: this.props.value,
      align: 'start',
      coverage: resolveNativeMenuCoverage(this.props.className ?? ''),
    };
    this.menuApi.open(payload);
  }

  private updateMenuPosition() {
    if (!this.menuView) {
      return;
    }

    const viewportPadding = 8;
    const menuOffset = 4;
    const triggerRect = this.element.getBoundingClientRect();
    const menuHeight = this.menuView.offsetHeight;
    const spaceBelow = window.innerHeight - triggerRect.bottom - viewportPadding;
    const spaceAbove = triggerRect.top - viewportPadding;
    const shouldOpenUpwards = spaceBelow < menuHeight && spaceAbove > spaceBelow;
    const availableSpace = shouldOpenUpwards ? spaceAbove : spaceBelow;

    this.menuPlacement = shouldOpenUpwards ? 'top' : 'bottom';
    this.menuMaxHeight = Math.max(availableSpace - menuOffset, 120);
    this.renderMenu();
  }

  private renderMenu() {
    if (this.usesNativeMenuOverlay || !this.isOpen) {
      this.menuView?.remove();
      this.menuView = null;
      return;
    }

    const selectedValue = this.props.value;
    const menu = createElement('div', `dropdown-menu dropdown-menu-${this.menuPlacement}`);
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
        if (selectedValue === option.value) {
          item.append(createCheckIcon());
        }
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

    this.field.textContent = selectedOption?.label ?? '';
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
