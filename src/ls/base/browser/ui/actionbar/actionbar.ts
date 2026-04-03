import 'ls/base/browser/ui/actionbar/actionbar.css';
import type { ContextMenuService } from 'ls/base/browser/contextmenu';
import {
  ActionViewItem,
  type ActionViewItemLike,
} from 'ls/base/browser/ui/actionbar/actionViewItems';
import {
  DropdownMenuActionViewItem,
  type DropdownMenuActionAlignment,
  type DropdownMenuActionOverlayContext,
  type DropdownMenuActionPosition,
} from 'ls/base/browser/ui/dropdown/dropdownActionViewItem';
import type { HoverInput } from 'ls/base/browser/ui/hover/hover';
import type { LxIconName } from 'ls/base/browser/ui/lxicon/lxicon';
import { createPlatformContextMenuService } from 'ls/platform/contextview/browser/contextMenuService';

export type ActionBarOrientation = 'horizontal' | 'vertical';
export type ActionBarActionMode = 'icon' | 'text' | 'custom';
export type ActionBarRenderable = string | Node | (() => string | Node);
export type ActionBarMenuItem = {
  id?: string;
  label: string;
  title?: string;
  icon?: LxIconName;
  disabled?: boolean;
  checked?: boolean;
  onClick?: (event: MouseEvent) => void;
};

export type ActionBarViewItem = ActionViewItemLike;

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
  menu?: readonly ActionBarMenuItem[];
  renderOverlay?: (context: DropdownMenuActionOverlayContext) => HTMLElement;
  overlayRole?: string;
  menuClassName?: string;
  minWidth?: number;
  contextMenuService?: ContextMenuService;
  overlayAlignment?: DropdownMenuActionAlignment;
  overlayPosition?: DropdownMenuActionPosition;
};

export type ActionBarSeparatorItem = {
  type: 'separator';
  id?: string;
  className?: string;
};

export type ActionBarItem = ActionBarActionItem | ActionBarSeparatorItem | ActionBarViewItem;

export type ActionBarProps = {
  items?: readonly ActionBarItem[];
  className?: string;
  orientation?: ActionBarOrientation;
  ariaLabel?: string;
  ariaRole?: string;
  contextMenuService?: ContextMenuService;
};

function composeClassName(parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(' ');
}

function isActionItem(item: ActionBarItem): item is ActionBarActionItem {
  return !isActionBarViewItem(item) && item.type !== 'separator';
}

function isActionBarViewItem(item: ActionBarItem): item is ActionBarViewItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    'render' in item &&
    typeof item.render === 'function' &&
    'getElement' in item &&
    typeof item.getElement === 'function' &&
    'dispose' in item &&
    typeof item.dispose === 'function'
  );
}

function createActionViewItem(
  item: ActionBarActionItem,
  contextMenuService?: ContextMenuService,
): ActionBarViewItem {
  if (item.menu || item.renderOverlay) {
    return new DropdownMenuActionViewItem({
      id: item.id,
      label: item.label,
      title: item.title,
      content: item.content,
      disabled: item.disabled,
      active: item.active,
      checked: item.checked,
      mode: item.mode,
      className: item.className,
      buttonClassName: item.buttonClassName,
      buttonAttributes: item.buttonAttributes,
      hover: item.hover,
      menu: item.menu,
      renderOverlay: item.renderOverlay,
      overlayRole: item.overlayRole,
      menuClassName: item.menuClassName,
      minWidth: item.minWidth,
      contextMenuService: item.contextMenuService ?? contextMenuService,
      overlayAlignment: item.overlayAlignment,
      overlayPosition: item.overlayPosition,
    });
  }

  return new ActionViewItem(item);
}

type RenderedAction = {
  button: HTMLElement;
  dispose: () => void;
};

export class ActionBarView {
  private props: ActionBarProps;
  private readonly element = document.createElement('div');
  private readonly actionsContainer = document.createElement('div');
  private readonly renderedActions: RenderedAction[] = [];
  private fallbackContextMenuService: ContextMenuService | null = null;
  private disposed = false;

  constructor(props: ActionBarProps = {}) {
    this.props = this.normalizeProps(props);
    this.actionsContainer.className = 'actionbar-actions-container';
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
    this.fallbackContextMenuService?.dispose?.();
    this.fallbackContextMenuService = null;
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
      contextMenuService: props.contextMenuService,
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
    if (isActionBarViewItem(item)) {
      item.render();
      const element = item.getElement();
      this.renderedActions.push({
        button: item.getFocusableElement?.() ?? element,
        dispose: () => {
          item.dispose();
        },
      });
      return element;
    }

    if (!isActionItem(item)) {
      const itemElement = document.createElement('div');
      itemElement.className = composeClassName([
        'actionbar-item',
        'is-separator',
        item.className,
      ]);
      if (item.id) {
        itemElement.dataset.actionbarItemId = item.id;
      }
      const separator = document.createElement('div');
      separator.className = 'actionbar-separator';
      separator.setAttribute('aria-hidden', 'true');
      itemElement.append(separator);
      return itemElement;
    }

    const viewItem = createActionViewItem(
      item,
      item.menu ? this.getContextMenuService() : undefined,
    );
    viewItem.render();
    const element = viewItem.getElement();
    if (item.id) {
      element.dataset.actionbarItemId = item.id;
    }
    this.renderedActions.push({
      button: viewItem.getFocusableElement?.() ?? element,
      dispose: () => {
        viewItem.dispose();
      },
    });
    return element;
  }

  private getContextMenuService() {
    if (this.props.contextMenuService) {
      return this.props.contextMenuService;
    }

    this.fallbackContextMenuService ??= createPlatformContextMenuService();
    return this.fallbackContextMenuService;
  }

  private getFocusableButtons() {
    return this.renderedActions
      .map((action) => action.button)
      .filter((button) => {
        if (!(button instanceof HTMLElement)) {
          return false;
        }
        if (button instanceof HTMLButtonElement) {
          return !button.disabled;
        }
        return button.tabIndex >= 0 || typeof (button as HTMLElement).focus === 'function';
      });
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
    if (!(event.target instanceof HTMLElement)) {
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
