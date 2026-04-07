import 'ls/base/browser/ui/selectbox/selectBox.css';
import {
  createContextViewController,
  type ContextViewHandle,
} from 'ls/base/browser/ui/contextview/contextview';
import { EventEmitter, type Event as LsEvent } from 'ls/base/common/event';
import { LifecycleOwner, toDisposable } from 'ls/base/common/lifecycle';

export interface ISelectBoxOptions {
  useCustomDrawn?: boolean;
  ariaLabel?: string;
  ariaDescription?: string;
  className?: string;
}

export interface ISelectOptionItem {
  text: string;
  value?: string;
  title?: string;
  detail?: string;
  decoratorRight?: string;
  description?: string;
  descriptionIsMarkdown?: boolean;
  isDisabled?: boolean;
}

export interface ISelectBoxStyles {
  selectBackground?: string;
  selectListBackground?: string;
  selectForeground?: string;
  decoratorRightForeground?: string;
  selectBorder?: string;
  selectListBorder?: string;
  focusBorder?: string;
}

export interface ISelectData {
  selected: string;
  index: number;
}

function addDisposableListener<K extends keyof HTMLElementEventMap>(
  target: HTMLElement,
  type: K,
  listener: (event: HTMLElementEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
) {
  target.addEventListener(type, listener, options);
  return toDisposable(() => {
    target.removeEventListener(type, listener, options);
  });
}

function clampSelectedIndex(index: number, optionCount: number) {
  if (optionCount <= 0) {
    return -1;
  }

  if (index < 0) {
    return 0;
  }

  if (index >= optionCount) {
    return optionCount - 1;
  }

  return index;
}

function isContextViewHandle(value: unknown): value is ContextViewHandle {
  return (
    typeof value === 'object'
    && value !== null
    && 'show' in value
    && typeof (value as { show?: unknown }).show === 'function'
    && 'hide' in value
    && typeof (value as { hide?: unknown }).hide === 'function'
    && 'isVisible' in value
    && typeof (value as { isVisible?: unknown }).isVisible === 'function'
    && 'getViewElement' in value
    && typeof (value as { getViewElement?: unknown }).getViewElement === 'function'
  );
}

export class SelectBox extends LifecycleOwner {
  private options: ISelectOptionItem[] = [];
  private selected = 0;
  private activeOptionIndex = -1;
  private styles: ISelectBoxStyles;
  private readonly useCustomDrawn: boolean;
  private readonly selectBoxOptions: ISelectBoxOptions;
  private readonly selectElement = document.createElement('select');
  private readonly contextView: ContextViewHandle | null;
  private readonly ownsContextView: boolean;
  private menuView: HTMLDivElement | null = null;
  private isMenuVisible = false;
  private readonly selectEmitter = new EventEmitter<ISelectData>();
  private disposed = false;

  readonly onDidSelect: LsEvent<ISelectData> = this.selectEmitter.event;

  constructor(
    options: ISelectOptionItem[],
    selected: number,
    contextViewProvider: unknown,
    styles: ISelectBoxStyles = {},
    selectBoxOptions: ISelectBoxOptions = {},
  ) {
    super();
    this.styles = styles;
    this.selectBoxOptions = selectBoxOptions;
    this.useCustomDrawn = Boolean(selectBoxOptions.useCustomDrawn);

    if (this.useCustomDrawn) {
      if (isContextViewHandle(contextViewProvider)) {
        this.contextView = contextViewProvider;
        this.ownsContextView = false;
      } else {
        this.contextView = createContextViewController();
        this.ownsContextView = true;
      }
    } else {
      this.contextView = null;
      this.ownsContextView = false;
    }

    this.selectElement.className = ['ls-select-box', selectBoxOptions.className ?? '']
      .filter(Boolean)
      .join(' ');
    this.selectElement.classList.toggle('ls-select-box-custom', this.useCustomDrawn);

    if (typeof this.selectBoxOptions.ariaLabel === 'string') {
      this.selectElement.setAttribute('aria-label', this.selectBoxOptions.ariaLabel);
    }

    if (typeof this.selectBoxOptions.ariaDescription === 'string') {
      this.selectElement.setAttribute('aria-description', this.selectBoxOptions.ariaDescription);
    }

    this.register(this.selectEmitter);
    this.register(addDisposableListener(this.selectElement, 'change', this.handleChange));
    this.register(addDisposableListener(this.selectElement, 'click', this.handleClick));
    this.register(addDisposableListener(this.selectElement, 'keydown', this.handleKeyDown));
    this.register(addDisposableListener(this.selectElement, 'mousedown', this.handleMouseDown));
    this.setOptions(options, selected);
  }

  get domNode() {
    return this.selectElement;
  }

  get value() {
    return this.selectElement.value;
  }

  setOptions(options: ISelectOptionItem[], selected?: number): void {
    if (this.disposed) {
      return;
    }

    if (this.useCustomDrawn && this.isMenuVisible) {
      this.hideMenu();
    }

    this.options = [...options];
    this.selectElement.options.length = 0;
    for (const option of this.options) {
      this.selectElement.add(this.createOption(option));
    }

    if (selected !== undefined) {
      this.select(selected);
      return;
    }

    this.select(this.selected);
  }

  select(index: number): void {
    if (this.disposed) {
      return;
    }

    this.selected = clampSelectedIndex(index, this.options.length);
    this.activeOptionIndex = this.selected;
    this.selectElement.selectedIndex = this.selected;
    this.syncTitle();
    this.syncMenuState();
  }

  setAriaLabel(label: string): void {
    if (this.disposed) {
      return;
    }

    this.selectBoxOptions.ariaLabel = label;
    this.selectElement.setAttribute('aria-label', label);
  }

  focus(): void {
    if (this.disposed) {
      return;
    }

    this.selectElement.tabIndex = 0;
    this.selectElement.focus();
  }

  blur(): void {
    if (this.disposed) {
      return;
    }

    this.selectElement.tabIndex = -1;
    this.selectElement.blur();
  }

  setFocusable(focusable: boolean): void {
    if (this.disposed) {
      return;
    }

    this.selectElement.tabIndex = focusable ? 0 : -1;
  }

  render(container: HTMLElement): void {
    if (this.disposed) {
      return;
    }

    container.classList.add('ls-select-container');
    container.append(this.selectElement);
    this.applyStyles();
  }

  style(styles: ISelectBoxStyles): void {
    if (this.disposed) {
      return;
    }

    this.styles = styles;
    this.applyStyles();
  }

  applyStyles(): void {
    if (this.disposed) {
      return;
    }

    this.selectElement.style.backgroundColor = this.styles.selectBackground ?? '';
    this.selectElement.style.color = this.styles.selectForeground ?? '';
    this.selectElement.style.borderColor = this.styles.selectBorder ?? '';
    if (this.styles.focusBorder) {
      this.selectElement.style.setProperty('--monaco-select-focusBorder', this.styles.focusBorder);
    } else {
      this.selectElement.style.removeProperty('--monaco-select-focusBorder');
    }

    if (!this.menuView) {
      return;
    }

    this.menuView.style.backgroundColor = this.styles.selectListBackground ?? '';
    this.menuView.style.borderColor = this.styles.selectListBorder ?? '';
    this.menuView.style.color = this.styles.selectForeground ?? '';
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.hideMenu();
    this.disposed = true;
    super.dispose();
    if (this.ownsContextView) {
      this.contextView?.dispose();
    }
    this.selectElement.remove();
  }

  private readonly handleClick = (event: MouseEvent) => {
    if (this.useCustomDrawn) {
      event.preventDefault();
      event.stopPropagation();
      this.toggleMenu();
      return;
    }

    event.stopPropagation();
  };

  private readonly handleMouseDown = (event: MouseEvent) => {
    if (!this.useCustomDrawn) {
      return;
    }

    // Prevent the browser-native popup from opening when using custom drawn mode.
    event.preventDefault();
  };

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (!this.useCustomDrawn) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      if (!this.isMenuVisible) {
        this.showMenu();
        return;
      }
      this.activeOptionIndex = this.findNextEnabledOptionIndex(this.activeOptionIndex, 1);
      this.syncMenuState();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      if (!this.isMenuVisible) {
        this.showMenu();
        return;
      }
      this.activeOptionIndex = this.findNextEnabledOptionIndex(this.activeOptionIndex, -1);
      this.syncMenuState();
      return;
    }

    if (event.key === 'Home' && this.isMenuVisible) {
      event.preventDefault();
      event.stopPropagation();
      this.activeOptionIndex = this.findNextEnabledOptionIndex(-1, 1);
      this.syncMenuState();
      return;
    }

    if (event.key === 'End' && this.isMenuVisible) {
      event.preventDefault();
      event.stopPropagation();
      this.activeOptionIndex = this.findNextEnabledOptionIndex(this.options.length, -1);
      this.syncMenuState();
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      if (!this.isMenuVisible) {
        this.showMenu();
        return;
      }

      this.commitSelection(this.activeOptionIndex);
      return;
    }

    if (event.key === 'Escape' && this.isMenuVisible) {
      event.preventDefault();
      event.stopPropagation();
      this.hideMenu();
      this.selectElement.focus();
    }
  };

  private readonly handleChange = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.tagName !== 'SELECT') {
      return;
    }
    const selectElement = target as HTMLSelectElement;

    this.selected = clampSelectedIndex(selectElement.selectedIndex, this.options.length);
    this.syncTitle();
    this.selectEmitter.fire({
      index: this.selected,
      selected: selectElement.value,
    });
  };

  private readonly handleMenuHide = () => {
    this.isMenuVisible = false;
    this.menuView = null;
  };

  private toggleMenu() {
    if (this.isMenuVisible) {
      this.hideMenu();
      return;
    }
    this.showMenu();
  }

  private showMenu() {
    if (!this.useCustomDrawn || this.disposed || this.isMenuVisible || !this.contextView) {
      return;
    }

    this.activeOptionIndex = this.getInitialActiveOptionIndex();
    const menu = this.renderMenu();
    this.menuView = menu;
    this.isMenuVisible = true;
    this.contextView.show({
      anchor: this.selectElement,
      className: 'ls-select-box-context-view',
      render: () => menu,
      onHide: this.handleMenuHide,
      alignment: 'start',
      offset: 4,
      matchAnchorWidth: true,
    });
    this.applyStyles();
    this.syncMenuState();
  }

  private hideMenu() {
    if (!this.useCustomDrawn || !this.isMenuVisible) {
      return;
    }

    this.contextView?.hide();
  }

  private getInitialActiveOptionIndex() {
    const selected = this.options[this.selected];
    if (selected && !selected.isDisabled) {
      return this.selected;
    }

    return this.findNextEnabledOptionIndex(-1, 1);
  }

  private findNextEnabledOptionIndex(startIndex: number, step: 1 | -1) {
    if (this.options.length === 0) {
      return -1;
    }

    let index = startIndex;
    for (let attempt = 0; attempt < this.options.length; attempt += 1) {
      index = (index + step + this.options.length) % this.options.length;
      if (!this.options[index]?.isDisabled) {
        return index;
      }
    }

    return -1;
  }

  private commitSelection(index: number) {
    if (index < 0 || index >= this.options.length) {
      return;
    }

    if (this.options[index]?.isDisabled) {
      return;
    }

    this.select(index);
    this.hideMenu();
    this.selectEmitter.fire({
      index: this.selected,
      selected: this.selectElement.value,
    });
    this.selectElement.focus();
  }

  private renderMenu() {
    const menu = document.createElement('div');
    menu.className = 'ls-select-box-dropdown';
    menu.setAttribute('role', 'listbox');
    menu.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });

    for (let index = 0; index < this.options.length; index += 1) {
      const option = this.options[index];
      const optionElement = document.createElement('div');
      optionElement.className = 'ls-select-box-option';
      optionElement.dataset.index = String(index);
      optionElement.textContent = option.text;
      optionElement.setAttribute('role', 'option');
      optionElement.setAttribute('aria-disabled', option.isDisabled ? 'true' : 'false');
      optionElement.setAttribute('aria-selected', 'false');
      if (option.title) {
        optionElement.title = option.title;
      }

      if (option.isDisabled) {
        optionElement.classList.add('disabled');
      } else {
        optionElement.addEventListener('mouseenter', () => {
          this.activeOptionIndex = index;
          this.syncMenuState();
        });
        optionElement.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.commitSelection(index);
        });
      }

      menu.append(optionElement);
    }

    return menu;
  }

  private syncMenuState() {
    if (!this.menuView) {
      return;
    }

    const items = this.menuView.querySelectorAll<HTMLElement>('.ls-select-box-option');
    for (const item of items) {
      const index = Number.parseInt(item.dataset.index ?? '-1', 10);
      const isSelected = index === this.selected;
      const isActive = index === this.activeOptionIndex;
      item.classList.toggle('selected', isSelected);
      item.classList.toggle('active', isActive);
      item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    }
  }

  private syncTitle() {
    const option = this.options[this.selected];
    this.selectElement.title = option?.title ?? option?.text ?? '';
  }

  private createOption(option: ISelectOptionItem) {
    const optionElement = document.createElement('option');
    optionElement.value = option.value ?? option.text;
    optionElement.text = option.text;
    optionElement.disabled = Boolean(option.isDisabled);
    optionElement.title = option.title ?? option.text;
    return optionElement;
  }
}
