import 'ls/base/browser/ui/actionbar/actionbar.css';
import {
  createHoverController,
  type HoverInput,
} from 'ls/base/browser/ui/hover/hover';

export type ActionBarOrientation = 'horizontal' | 'vertical';
export type ActionBarActionMode = 'icon' | 'text' | 'custom';
export type ActionBarRenderable = string | Node | (() => string | Node);

export type ActionBarActionItem = {
  type?: 'action';
  id?: string;
  label: string;
  content?: ActionBarRenderable;
  title?: string;
  hover?: HoverInput;
  disabled?: boolean;
  active?: boolean;
  checked?: boolean;
  mode?: ActionBarActionMode;
  className?: string;
  buttonClassName?: string;
  buttonAttributes?: Record<string, string | null | undefined | false>;
  onClick?: (event: MouseEvent) => void;
};

export type ActionBarSeparatorItem = {
  type: 'separator';
  id?: string;
  className?: string;
};

export type ActionBarItem = ActionBarActionItem | ActionBarSeparatorItem;

export type ActionBarProps = {
  items?: readonly ActionBarItem[];
  className?: string;
  orientation?: ActionBarOrientation;
  ariaLabel?: string;
  ariaRole?: string;
};

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

function isActionItem(item: ActionBarItem): item is ActionBarActionItem {
  return item.type !== 'separator';
}

function resolveRenderable(renderable: ActionBarRenderable): Node {
  const resolved = typeof renderable === 'function' ? renderable() : renderable;
  if (typeof resolved === 'string') {
    return document.createTextNode(resolved);
  }
  return resolved.cloneNode(true);
}

type RenderedAction = {
  button: HTMLButtonElement;
  dispose: () => void;
};

export class ActionBarView {
  private props: ActionBarProps;
  private readonly element = createElement('div');
  private readonly actionsContainer = createElement('div', 'actionbar-actions-container');
  private readonly renderedActions: RenderedAction[] = [];
  private disposed = false;

  constructor(props: ActionBarProps = {}) {
    this.props = this.normalizeProps(props);
    this.element.append(this.actionsContainer);
    this.element.addEventListener('keydown', this.handleKeyDown);
    this.render();
  }

  getElement() {
    return this.element;
  }

  setProps(props: ActionBarProps = {}) {
    if (this.disposed) {
      return;
    }
    this.props = this.normalizeProps(props);
    this.render();
  }

  focusFirst() {
    this.getFocusableButtons().at(0)?.focus();
  }

  focusLast() {
    this.getFocusableButtons().at(-1)?.focus();
  }

  dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.clearRenderedActions();
    this.element.removeEventListener('keydown', this.handleKeyDown);
    this.element.replaceChildren();
  }

  private normalizeProps(props: ActionBarProps): ActionBarProps {
    return {
      items: props.items ?? [],
      className: props.className ?? '',
      orientation: props.orientation ?? 'horizontal',
      ariaLabel: props.ariaLabel,
      ariaRole: props.ariaRole ?? 'toolbar',
    };
  }

  private render() {
    this.clearRenderedActions();
    this.element.className = composeClassName([
      'actionbar',
      this.props.orientation === 'vertical' ? 'is-vertical' : 'is-horizontal',
      this.props.className,
    ]);
    const role = this.props.ariaRole ?? 'toolbar';
    this.element.setAttribute('role', role);
    if (role === 'toolbar') {
      this.element.setAttribute('aria-orientation', this.props.orientation ?? 'horizontal');
    } else {
      this.element.removeAttribute('aria-orientation');
    }

    if (this.props.ariaLabel) {
      this.element.setAttribute('aria-label', this.props.ariaLabel);
    } else {
      this.element.removeAttribute('aria-label');
    }

    const nodes = (this.props.items ?? []).map((item) => this.renderItem(item));
    this.actionsContainer.replaceChildren(...nodes);
  }

  private clearRenderedActions() {
    while (this.renderedActions.length) {
      this.renderedActions.pop()?.dispose();
    }
    this.actionsContainer.replaceChildren();
  }

  private renderItem(item: ActionBarItem) {
    const itemElement = createElement(
        'div',
      composeClassName([
        'actionbar-item',
        isActionItem(item) ? 'is-action' : 'is-separator',
        isActionItem(item) && item.disabled ? 'is-disabled' : '',
        isActionItem(item) && item.active ? 'is-active' : '',
        isActionItem(item) && item.checked ? 'is-checked' : '',
        item.className,
      ]),
    );

    if (item.id) {
      itemElement.dataset.actionbarItemId = item.id;
    }

    if (!isActionItem(item)) {
      const separator = createElement('div', 'actionbar-separator');
      separator.setAttribute('aria-hidden', 'true');
      itemElement.append(separator);
      return itemElement;
    }

    const mode = item.mode ?? 'icon';
    const button = createElement(
      'button',
      composeClassName([
        'actionbar-action',
        `is-${mode}`,
        item.buttonClassName,
      ]),
    );
    button.type = 'button';
    button.disabled = Boolean(item.disabled);
    button.setAttribute('aria-label', item.label);
    if (item.checked !== undefined) {
      button.setAttribute('aria-pressed', String(Boolean(item.checked)));
    } else {
      button.removeAttribute('aria-pressed');
    }

    for (const [name, value] of Object.entries(item.buttonAttributes ?? {})) {
      if (value === false || value === null || value === undefined) {
        button.removeAttribute(name);
        continue;
      }
      button.setAttribute(name, value);
    }

    const content = createElement('span', 'actionbar-content');
    content.append(
      resolveRenderable(item.content ?? item.label),
    );
    button.append(content);

    const hoverInput =
      item.hover === undefined ? item.title ?? item.label : item.hover;
    const hoverController = createHoverController(button, hoverInput);

    const handleClick = (event: MouseEvent) => {
      item.onClick?.(event);
    };
    button.addEventListener('click', handleClick);

    this.renderedActions.push({
      button,
      dispose: () => {
        button.removeEventListener('click', handleClick);
        hoverController.dispose();
      },
    });

    itemElement.append(button);
    return itemElement;
  }

  private getFocusableButtons() {
    return this.renderedActions
      .map((action) => action.button)
      .filter((button) => !button.disabled);
  }

  private moveFocus(direction: -1 | 1) {
    const buttons = this.getFocusableButtons();
    if (buttons.length === 0) {
      return;
    }

    const currentIndex = buttons.findIndex((button) => button === document.activeElement);
    const fallbackIndex = direction > 0 ? 0 : buttons.length - 1;
    const nextIndex =
      currentIndex === -1
        ? fallbackIndex
        : (currentIndex + direction + buttons.length) % buttons.length;
    buttons[nextIndex]?.focus();
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (!(event.target instanceof HTMLButtonElement)) {
      return;
    }

    const orientation = this.props.orientation ?? 'horizontal';
    const isHorizontal = orientation === 'horizontal';
    const key = event.key;

    if (
      (isHorizontal && key === 'ArrowRight') ||
      (!isHorizontal && key === 'ArrowDown')
    ) {
      event.preventDefault();
      this.moveFocus(1);
      return;
    }

    if (
      (isHorizontal && key === 'ArrowLeft') ||
      (!isHorizontal && key === 'ArrowUp')
    ) {
      event.preventDefault();
      this.moveFocus(-1);
      return;
    }

    if (key === 'Home') {
      event.preventDefault();
      this.focusFirst();
      return;
    }

    if (key === 'End') {
      event.preventDefault();
      this.focusLast();
    }
  };
}

export function createActionBarView(props: ActionBarProps = {}) {
  return new ActionBarView(props);
}
