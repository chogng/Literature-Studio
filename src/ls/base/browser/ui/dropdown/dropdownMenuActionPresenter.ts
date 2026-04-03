import { createContextViewController } from 'ls/base/browser/ui/contextview/contextview';
import type { LxIconName } from 'ls/base/browser/ui/lxicon/lxicon';

export type DropdownMenuActionAlignment = 'start' | 'end';
export type DropdownMenuActionPosition = 'auto' | 'above' | 'below';

export type DropdownMenuActionOverlayContext = {
  hide: () => void;
};

export type DropdownMenuActionOption = {
  value: string;
  label: string;
  title?: string;
  icon?: LxIconName;
  disabled?: boolean;
  checked?: boolean;
};

export type DropdownMenuActionPresenterRequest = {
  anchor: HTMLElement;
  className?: string;
  minWidth?: number;
  alignment?: DropdownMenuActionAlignment;
  position?: DropdownMenuActionPosition;
  options?: readonly DropdownMenuActionOption[];
  render: (context: DropdownMenuActionOverlayContext) => HTMLElement;
  onHide: () => void;
  onSelectOption?: (value: string) => void;
};

export type DropdownMenuActionPresenter = {
  readonly isDetached: boolean;
  show: (request: DropdownMenuActionPresenterRequest) => void;
  hide: () => void;
  isVisible: () => boolean;
  containsTarget: (target: Node) => boolean;
  dispose: () => void;
};

class DomDropdownMenuActionPresenter implements DropdownMenuActionPresenter {
  readonly isDetached = true;
  private readonly contextView = createContextViewController();
  private overlayView: HTMLElement | null = null;
  private currentRequest: DropdownMenuActionPresenterRequest | null = null;

  show = (request: DropdownMenuActionPresenterRequest) => {
    this.currentRequest = request;
    const overlay = request.render({ hide: () => this.hide() });
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
  };

  hide = () => {
    this.contextView.hide();
  };

  isVisible = () => this.contextView.isVisible();

  containsTarget = (target: Node) => this.overlayView?.contains(target) ?? false;

  dispose = () => {
    this.overlayView?.remove();
    this.overlayView = null;
    this.currentRequest = null;
    this.contextView.dispose();
  };

  private readonly handleHide = () => {
    const request = this.currentRequest;
    this.overlayView = null;
    this.currentRequest = null;
    request?.onHide();
  };
}

export function createDomDropdownMenuActionPresenter() {
  return new DomDropdownMenuActionPresenter();
}
