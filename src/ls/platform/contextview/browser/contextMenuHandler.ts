import type { ContextMenuAction } from 'ls/base/browser/contextmenu';
import { Menu } from 'ls/base/browser/ui/menu/menu';
import type {
  ContextMenuDelegate,
  ContextViewService,
} from 'ls/platform/contextview/browser/contextView';

function composeClassName(parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(' ');
}

type ContextMenuHidePayload = {
  didCancel: boolean;
  value?: string;
};

export class ContextMenuHandler {
  private focusToReturn: HTMLElement | null = null;

  constructor(private readonly contextViewService: ContextViewService) {}

  showContextMenu(delegate: ContextMenuDelegate) {
    const options = [...delegate.getActions()];
    if (options.length === 0) {
      return;
    }

    this.focusToReturn =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    this.contextViewService.showContextView({
      getAnchor: delegate.getAnchor,
      canRelayout: false,
      className: composeClassName([
        'actionbar-context-view',
        delegate.getMenuClassName?.(),
      ]),
      alignment: delegate.alignment ?? 'end',
      position: delegate.position ?? 'below',
      minWidth: delegate.minWidth ?? 180,
      render: (container) => {
        const menu = this.renderMenu(options, delegate);
        container.append(menu.getElement());
        queueMicrotask(() => {
          menu.focusSelectedOrFirstEnabled();
        });
        return () => {
          menu.dispose();
        };
      },
      onHide: (data) => {
        const payload = data as ContextMenuHidePayload | undefined;
        delegate.onHide?.(payload?.didCancel ?? true);
        this.focusToReturn?.focus();
        this.focusToReturn = null;
      },
    });
  }

  hideContextMenu(didCancel = true) {
    this.contextViewService.hideContextView({ didCancel });
  }

  isVisible = () => this.contextViewService.isVisible();

  dispose = () => {
    this.hideContextMenu();
  };

  private renderMenu(
    options: readonly ContextMenuAction[],
    delegate: ContextMenuDelegate,
  ) {
    return new Menu({
      items: options,
      role: 'menu',
      value: options.find((option) => option.checked)?.value,
      onSelect: ({ value }) => {
        delegate.onSelect?.(value);
        this.contextViewService.hideContextView({
          didCancel: false,
          value,
        });
      },
      onCancel: () => {
        this.contextViewService.hideContextView({ didCancel: true });
      },
    });
  }
}
