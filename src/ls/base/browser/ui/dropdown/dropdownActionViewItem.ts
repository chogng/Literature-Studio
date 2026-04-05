import * as DOM from 'ls/base/browser/dom';
import type {
  ContextMenuAction,
  ContextMenuService,
} from 'ls/base/browser/contextmenu';
import {
  ActionViewItem,
  BaseActionViewItem,
} from 'ls/base/browser/ui/actionbar/actionViewItems';
import { createContextViewController } from 'ls/base/browser/ui/contextview/contextview';
import type {
  ActionBarActionItem,
  ActionBarActionMode,
  ActionView,
  ActionBarMenuItem,
  ActionBarRenderable,
} from 'ls/base/browser/ui/actionbar/actionbar';
import type { HoverService } from 'ls/base/browser/ui/hover/hover';
import { createPlatformContextMenuService } from 'ls/platform/contextview/browser/contextMenuService';

export type DropdownMenuActionAlignment = 'start' | 'end';
export type DropdownMenuActionPosition = 'auto' | 'above' | 'below';

export type DropdownMenuActionOverlayContext = {
  hide: () => void;
};

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
  hoverService?: HoverService;
  contextMenuService?: ContextMenuService;
  overlayAlignment?: DropdownMenuActionAlignment;
  overlayPosition?: DropdownMenuActionPosition;
};

export type ActionWithDropdownActionViewItemOptions = {
  primary: Omit<
    ActionBarActionItem,
    | 'menu'
    | 'renderOverlay'
    | 'overlayRole'
    | 'menuClassName'
    | 'minWidth'
    | 'contextMenuService'
    | 'overlayAlignment'
    | 'overlayPosition'
  >;
  dropdown: DropdownMenuActionViewItemOptions;
  className?: string;
};

type DropdownActionOverlayRequest = {
  anchor: HTMLElement;
  className?: string;
  minWidth?: number;
  alignment?: DropdownMenuActionAlignment;
  position?: DropdownMenuActionPosition;
  render: (context: DropdownMenuActionOverlayContext) => HTMLElement;
  onHide: () => void;
};

function createContextMenuValue(action: Pick<ActionBarMenuItem, 'id'>, index: number) {
  return action.id ?? `dropdown-menu-action-option-${index}`;
}

function toContextMenuActions(menuItems: readonly ActionBarMenuItem[]): ContextMenuAction[] {
  return menuItems.map((menuItem, index) => ({
    value: createContextMenuValue(menuItem, index),
    label: menuItem.label,
    title: menuItem.title,
    icon: menuItem.icon,
    disabled: menuItem.disabled,
    checked: menuItem.checked,
    run: menuItem.run,
  }));
}

function runContextMenuAction(
  menuItems: readonly ActionBarMenuItem[] | undefined,
  menuActions: readonly ContextMenuAction[],
  value: string,
) {
  const menuItemIndex = menuActions.findIndex((option) => option.value === value);
  const menuItem = menuItemIndex >= 0 ? menuItems?.[menuItemIndex] : null;
  if (!menuItem || menuItem.disabled) {
    return;
  }

  if (menuItem.onClick) {
    menuItem.onClick(new MouseEvent('click'));
    return;
  }

  menuItem.run?.();
}

class DomDropdownActionOverlayPresenter {
  private readonly contextView = createContextViewController();
  private overlayView: HTMLElement | null = null;
  private currentRequest: DropdownActionOverlayRequest | null = null;

  show(request: DropdownActionOverlayRequest) {
    this.currentRequest = request;
    const overlay = request.render({
      hide: () => this.hide(),
    });
    this.overlayView?.remove();
    this.overlayView = overlay;
    this.contextView.show({
      anchor: request.anchor,
      className: request.className,
      render: () => overlay,
      onHide: this.handleHide,
      position: request.position ?? 'below',
      alignment: request.alignment ?? 'end',
      minWidth: request.minWidth ?? 180,
    });
  }

  hide = () => {
    this.contextView.hide();
  };

  dispose() {
    this.overlayView?.remove();
    this.overlayView = null;
    this.currentRequest = null;
    this.contextView.dispose();
  }

  private readonly handleHide = () => {
    const request = this.currentRequest;
    this.overlayView = null;
    this.currentRequest = null;
    request?.onHide();
  };
}

class ContextMenuDropdownActionPresenter {
  private defaultContextMenuService: ContextMenuService | null = null;

  constructor(
    private readonly getOptions: () => DropdownMenuActionViewItemOptions,
    private readonly getAnchor: () => HTMLElement,
    private readonly onHide: () => void,
  ) {}

  show = () => {
    const options = this.getOptions();
    const menuItems = options.menu ?? [];
    const menuActions = toContextMenuActions(menuItems);
    if (menuActions.length === 0) {
      return;
    }

    this.getOrCreateContextMenuService().showContextMenu({
      getAnchor: this.getAnchor,
      getActions: () => menuActions,
      getMenuClassName: options.menuClassName ? () => options.menuClassName! : undefined,
      alignment: options.overlayAlignment ?? 'end',
      minWidth: options.minWidth,
      onHide: this.onHide,
      onSelect: (value: string) => {
        runContextMenuAction(options.menu, menuActions, value);
      },
    });
  };

  hide = () => {
    this.resolveContextMenuService(this.getOptions())?.hideContextMenu();
  };

  dispose = () => {
    this.hide();
    this.defaultContextMenuService?.dispose?.();
    this.defaultContextMenuService = null;
  };

  syncOptions(previousOptions: DropdownMenuActionViewItemOptions) {
    const previousContextMenuService = this.resolveContextMenuService(previousOptions);
    const nextContextMenuService = this.resolveContextMenuService(this.getOptions());
    if (previousContextMenuService && previousContextMenuService !== nextContextMenuService) {
      previousContextMenuService.hideContextMenu();
    }
  }

  private getOrCreateContextMenuService() {
    const options = this.getOptions();
    if (options.contextMenuService) {
      return options.contextMenuService;
    }

    this.defaultContextMenuService ??= createPlatformContextMenuService();
    return this.defaultContextMenuService;
  }

  private resolveContextMenuService(options: DropdownMenuActionViewItemOptions) {
    return options.contextMenuService ?? this.defaultContextMenuService;
  }
}

export class DropdownMenuActionViewItem extends ActionViewItem {
  private readonly overlayPresenter = new DomDropdownActionOverlayPresenter();
  private readonly menuPresenter = new ContextMenuDropdownActionPresenter(
    () => this.options,
    () => this.button,
    () => {
      this.isOpen = false;
      this.button.setAttribute('aria-expanded', 'false');
    },
  );
  private isOpen = false;

  private get options(): DropdownMenuActionViewItemOptions {
    return this.item as DropdownMenuActionViewItemOptions;
  }

  constructor(options: DropdownMenuActionViewItemOptions) {
    super(options, options.hoverService);
    this.register(DOM.addDisposableListener(this.button, 'keydown', this.handleKeyDown));
    this.render();
  }

  setOptions(options: DropdownMenuActionViewItemOptions) {
    const previousOptions = this.options;
    const usedCustomOverlay = Boolean(previousOptions.renderOverlay);
    this.setItem(options);
    this.menuPresenter.syncOptions(previousOptions);
    if (usedCustomOverlay || this.options.renderOverlay) {
      this.overlayPresenter.hide();
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

    if (this.options.renderOverlay) {
      this.isOpen = true;
      this.button.setAttribute('aria-expanded', 'true');
      this.overlayPresenter.show(this.createOverlayRequest());
      return;
    }

    if ((this.options.menu?.length ?? 0) === 0) {
      return;
    }

    this.isOpen = true;
    this.button.setAttribute('aria-expanded', 'true');
    this.menuPresenter.show();
  }

  hide() {
    if (this.options.renderOverlay) {
      this.overlayPresenter.hide();
      return;
    }

    this.menuPresenter.hide();
  }

  override dispose() {
    if (this.isDisposed()) {
      return;
    }

    this.hide();
    this.overlayPresenter.dispose();
    this.menuPresenter.dispose();
    super.dispose();
  }

  private createOverlayRequest(): DropdownActionOverlayRequest {
    return {
      anchor: this.button,
      className: DOM.composeClassName(['actionbar-context-view', this.options.menuClassName]),
      minWidth: this.options.minWidth,
      alignment: this.options.overlayAlignment ?? 'end',
      position: this.options.overlayPosition ?? 'below',
      render: (context) => this.options.renderOverlay?.(context) ?? DOM.createElement('div'),
      onHide: () => {
        this.isOpen = false;
        this.button.setAttribute('aria-expanded', 'false');
      },
    };
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

export class ActionWithDropdownActionViewItem extends BaseActionViewItem {
  private readonly primaryItem: ActionViewItem;
  protected readonly dropdownMenuActionViewItem: DropdownMenuActionViewItem;
  private readonly separator = DOM.createElement('div', 'action-dropdown-item-separator');

  constructor(options: ActionWithDropdownActionViewItemOptions) {
    super(DOM.createElement('div', 'actionbar-item is-action action-dropdown-item'));
    const hoverService = options.primary.hoverService ?? options.dropdown.hoverService;
    this.primaryItem = new ActionViewItem(options.primary, hoverService);
    this.dropdownMenuActionViewItem = new DropdownMenuActionViewItem({
      ...options.dropdown,
      hoverService: options.dropdown.hoverService ?? hoverService,
    });
    if (options.className) {
      this.element.classList.add(...options.className.split(/\s+/).filter(Boolean));
    }
    this.separator.append(DOM.createElement('div'));
    this.primaryItem.render(this.element);
    this.element.append(this.separator);
    this.dropdownMenuActionViewItem.render(this.element);
    this.register(DOM.addDisposableListener(this.element, 'keydown', this.handleKeyDown));
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
): ActionView {
  return new DropdownMenuActionViewItem({
    ...options,
    menu: options.menu ? [...options.menu] : undefined,
  });
}

export function createActionWithDropdownActionViewItem(
  options: ActionWithDropdownActionViewItemOptions,
): ActionWithDropdownActionViewItem {
  return new ActionWithDropdownActionViewItem(options);
}
