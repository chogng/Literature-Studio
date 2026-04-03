import {
  createHoverController,
  type HoverHandle,
  type HoverInput,
} from 'ls/base/browser/ui/hover/hover';
import type {
  ActionBarActionItem,
  ActionBarActionMode,
  ActionBarRenderable,
} from 'ls/base/browser/ui/actionbar/actionbar';

export type ActionViewItemLike = {
  render: (container?: HTMLElement) => void;
  getElement: () => HTMLElement;
  dispose: () => void;
  focus?: () => void;
  blur?: () => void;
  getFocusableElement?: () => HTMLElement | null;
};

export abstract class BaseActionViewItem implements ActionViewItemLike {
  protected readonly element: HTMLElement;
  private disposed = false;

  constructor(element?: HTMLElement) {
    this.element = element ?? document.createElement('div');
  }

  getElement() {
    return this.element;
  }

  render(container?: HTMLElement) {
    if (this.disposed) {
      return;
    }

    if (container && this.element.parentElement !== container) {
      container.append(this.element);
    }
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.element.remove();
  }

  isDisposed() {
    return this.disposed;
  }

  focus?(): void;

  blur?(): void;

  getFocusableElement?(): HTMLElement | null;
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  return element;
}

function composeClassName(parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(' ');
}

function resolveRenderable(renderable: ActionBarRenderable): Node {
  const resolved = typeof renderable === 'function' ? renderable() : renderable;
  if (typeof resolved === 'string') {
    return document.createTextNode(resolved);
  }
  return resolved.cloneNode(true);
}

function resolveMode(item: ActionBarActionItem): ActionBarActionMode {
  if (item.mode) {
    return item.mode;
  }
  return 'icon';
}

export class ActionViewItem extends BaseActionViewItem {
  protected readonly button = createElement('button', 'actionbar-action');
  protected readonly content = createElement('span', 'actionbar-content');
  protected item: ActionBarActionItem;
  protected readonly hoverController: HoverHandle;

  constructor(item: ActionBarActionItem) {
    super(createElement('div', 'actionbar-item is-action'));
    this.item = item;
    this.button.type = 'button';
    this.button.append(this.content);
    this.element.append(this.button);
    this.hoverController = createHoverController(this.button, null);
    this.button.addEventListener('click', this.handleButtonClick);
    this.render();
  }

  setItem(item: ActionBarActionItem) {
    this.item = item;
    this.render();
  }

  override render(container?: HTMLElement) {
    if (this.isDisposed()) {
      return;
    }

    super.render(container);
    this.element.className = composeClassName([
      'actionbar-item',
      'is-action',
      this.item.disabled ? 'is-disabled' : '',
      this.item.active ? 'is-active' : '',
      this.item.checked ? 'is-checked' : '',
      this.item.className,
    ]);

    const mode = resolveMode(this.item);
    this.button.className = composeClassName([
      'actionbar-action',
      `is-${mode}`,
      this.item.buttonClassName,
    ]);
    this.button.disabled = Boolean(this.item.disabled);
    this.button.setAttribute('aria-label', this.item.label);
    if (this.item.checked !== undefined) {
      this.button.setAttribute('aria-pressed', String(Boolean(this.item.checked)));
    } else {
      this.button.removeAttribute('aria-pressed');
    }

    for (const [name, value] of Object.entries(this.item.buttonAttributes ?? {})) {
      if (value === false || value === null || value === undefined) {
        this.button.removeAttribute(name);
        continue;
      }
      this.button.setAttribute(name, value);
    }

    const hoverInput: HoverInput =
      this.item.hover === undefined ? this.item.title ?? this.item.label : this.item.hover;
    this.hoverController.update(hoverInput);

    this.content.replaceChildren(
      resolveRenderable(this.item.content ?? this.item.label),
    );
  }

  override dispose() {
    if (this.isDisposed()) {
      return;
    }

    this.hoverController.dispose();
    this.button.removeEventListener('click', this.handleButtonClick);
    super.dispose();
  }

  focus() {
    this.button.focus();
  }

  blur() {
    this.button.blur();
  }

  getFocusableElement() {
    return this.button;
  }

  private readonly handleButtonClick = (event: MouseEvent) => {
    this.handleClick(event);
  };

  protected readonly handleClick = (event: MouseEvent) => {
    this.item.onClick?.(event);
  };
}
