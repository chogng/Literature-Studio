import 'ls/base/browser/ui/selectbox/selectBoxCustom.css';
import {
  createContextViewController,
  type ContextViewHandle,
} from 'ls/base/browser/ui/contextview/contextview';
import { LifecycleOwner, toDisposable } from 'ls/base/common/lifecycle';
import type {
  ISelectBoxStyles,
  ISelectOptionItem,
} from 'ls/base/browser/ui/selectbox/selectBox';

type SelectBoxCustomOptions = {
  selectElement: HTMLSelectElement;
  contextViewProvider: unknown;
  getOptions: () => readonly ISelectOptionItem[];
  getSelectedIndex: () => number;
  getStyles: () => ISelectBoxStyles;
  onSelectIndex: (index: number) => void;
};

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

export class SelectBoxCustom extends LifecycleOwner {
  private readonly selectElement: HTMLSelectElement;
  private readonly getOptions: () => readonly ISelectOptionItem[];
  private readonly getSelectedIndex: () => number;
  private readonly getStyles: () => ISelectBoxStyles;
  private readonly onSelectIndex: (index: number) => void;
  private readonly contextView: ContextViewHandle;
  private readonly ownsContextView: boolean;
  private menuView: HTMLDivElement | null = null;
  private isMenuVisible = false;
  private activeOptionIndex = -1;
  private disposed = false;

  constructor(options: SelectBoxCustomOptions) {
    super();
    this.selectElement = options.selectElement;
    this.getOptions = options.getOptions;
    this.getSelectedIndex = options.getSelectedIndex;
    this.getStyles = options.getStyles;
    this.onSelectIndex = options.onSelectIndex;

    if (isContextViewHandle(options.contextViewProvider)) {
      this.contextView = options.contextViewProvider;
      this.ownsContextView = false;
    } else {
      this.contextView = createContextViewController();
      this.ownsContextView = true;
    }

    this.register(addDisposableListener(this.selectElement, 'click', this.handleClick));
    this.register(addDisposableListener(this.selectElement, 'mousedown', this.handleMouseDown));
    this.register(addDisposableListener(this.selectElement, 'keydown', this.handleKeyDown));
  }

  onOptionsChanged() {
    if (!this.isMenuVisible) {
      return;
    }

    this.hideMenu();
  }

  onSelectionChanged() {
    this.activeOptionIndex = this.resolveInitialActiveOptionIndex();
    this.syncMenuState();
  }

  applyMenuStyles() {
    if (!this.menuView) {
      return;
    }

    const styles = this.getStyles();
    this.menuView.style.backgroundColor = styles.selectListBackground ?? '';
    this.menuView.style.borderColor = styles.selectListBorder ?? '';
    this.menuView.style.color = styles.selectForeground ?? '';
  }

  override dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.hideMenu();
    super.dispose();
    if (this.ownsContextView) {
      this.contextView.dispose();
    }
  }

  private readonly handleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    this.toggleMenu();
  };

  private readonly handleMouseDown = (event: MouseEvent) => {
    // Prevent the browser-native popup from opening in custom mode.
    event.preventDefault();
  };

  private readonly handleKeyDown = (event: KeyboardEvent) => {
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
      this.activeOptionIndex = this.findNextEnabledOptionIndex(this.getOptions().length, -1);
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
    if (this.disposed || this.isMenuVisible) {
      return;
    }

    this.activeOptionIndex = this.resolveInitialActiveOptionIndex();
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
    this.applyMenuStyles();
    this.syncMenuState();
  }

  private hideMenu() {
    if (!this.isMenuVisible) {
      return;
    }

    this.contextView.hide();
  }

  private resolveInitialActiveOptionIndex() {
    const selectedIndex = this.getSelectedIndex();
    const selectedOption = this.getOptions()[selectedIndex];
    if (selectedOption && !selectedOption.isDisabled) {
      return selectedIndex;
    }

    return this.findNextEnabledOptionIndex(-1, 1);
  }

  private findNextEnabledOptionIndex(startIndex: number, step: 1 | -1) {
    const options = this.getOptions();
    if (options.length === 0) {
      return -1;
    }

    let index = startIndex;
    for (let attempt = 0; attempt < options.length; attempt += 1) {
      index = (index + step + options.length) % options.length;
      if (!options[index]?.isDisabled) {
        return index;
      }
    }

    return -1;
  }

  private commitSelection(index: number) {
    const options = this.getOptions();
    if (index < 0 || index >= options.length) {
      return;
    }

    if (options[index]?.isDisabled) {
      return;
    }

    this.onSelectIndex(index);
    this.hideMenu();
    this.selectElement.focus();
  }

  private renderMenu() {
    const menu = document.createElement('div');
    menu.className = 'ls-select-box-dropdown';
    menu.setAttribute('role', 'listbox');
    menu.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });

    const options = this.getOptions();
    for (let index = 0; index < options.length; index += 1) {
      const option = options[index];
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

    const selectedIndex = this.getSelectedIndex();
    const items = this.menuView.querySelectorAll<HTMLElement>('.ls-select-box-option');
    for (const item of items) {
      const index = Number.parseInt(item.dataset.index ?? '-1', 10);
      const isSelected = index === selectedIndex;
      const isActive = index === this.activeOptionIndex;
      item.classList.toggle('selected', isSelected);
      item.classList.toggle('active', isActive);
      item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    }
  }
}
