import type {
  NativeMenuAlign,
  NativeMenuCoverage,
  NativeMenuEvent,
  NativeMenuOption,
  NativeMenuRect,
} from 'ls/base/parts/sandbox/common/desktopTypes';
import { nativeHostService } from 'ls/platform/native/electron-sandbox/nativeHostService';

// This controller talks to the Electron-managed menu overlay renderer.
// It is menu-specific and is not a generic context view host.
export type ElectronOverlayMenuAnchor = HTMLElement | NativeMenuRect;

export type ElectronOverlayMenuControllerOptions = {
  anchor: ElectronOverlayMenuAnchor;
  options: NativeMenuOption[];
  value?: string;
  align?: NativeMenuAlign;
  coverage?: NativeMenuCoverage;
  requestId?: string;
  requestIdPrefix?: string;
  onSelect?: (event: { value: string }) => void;
  onHide?: () => void;
};

export type ElectronOverlayMenuControllerHandle = {
  show: (options: ElectronOverlayMenuControllerOptions) => void;
  hide: () => void;
  isVisible: () => boolean;
  dispose: () => void;
};

let electronOverlayMenuRequestId = 0;

export function canUseElectronOverlayContextMenus() {
  if (typeof window === 'undefined') {
    return false;
  }

  const nativeOverlayKind = new URLSearchParams(window.location.search).get(
    'nativeOverlay',
  );
  if (nativeOverlayKind === 'menu' || nativeOverlayKind === 'toast') {
    return false;
  }

  return typeof nativeHostService.menu?.open === 'function';
}

function resolveTriggerRect(anchor: ElectronOverlayMenuAnchor): NativeMenuRect {
  if (anchor instanceof HTMLElement) {
    const rect = anchor.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  }

  return anchor;
}

export class ElectronOverlayMenuController implements ElectronOverlayMenuControllerHandle {
  private readonly menuApi = nativeHostService.menu;
  private activeRequestId: string | null = null;
  private activeOptions: ElectronOverlayMenuControllerOptions | null = null;
  private disposed = false;
  private readonly removeMenuEventListener: () => void;

  constructor() {
    this.removeMenuEventListener =
      canUseElectronOverlayContextMenus() && typeof this.menuApi?.onEvent === 'function'
        ? this.menuApi.onEvent((event) => this.handleMenuEvent(event))
        : () => {};
  }

  show = (options: ElectronOverlayMenuControllerOptions) => {
    if (this.disposed || !canUseElectronOverlayContextMenus() || !this.menuApi) {
      return;
    }

    const requestId =
      options.requestId ??
      this.activeRequestId ??
      `${options.requestIdPrefix ?? 'electron-overlay-menu'}-${++electronOverlayMenuRequestId}`;

    this.activeRequestId = requestId;
    this.activeOptions = options;
    this.menuApi.open({
      requestId,
      triggerRect: resolveTriggerRect(options.anchor),
      options: options.options,
      value: options.value,
      align: options.align,
      coverage: options.coverage,
    });
  };

  hide = () => {
    if (this.disposed) {
      return;
    }

    const requestId = this.activeRequestId;
    const options = this.activeOptions;
    this.activeRequestId = null;
    this.activeOptions = null;
    if (requestId && this.menuApi) {
      this.menuApi.close(requestId);
    }
    options?.onHide?.();
  };

  isVisible = () => this.activeRequestId !== null;

  dispose = () => {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.hide();
    this.removeMenuEventListener();
  };

  private handleMenuEvent(event: NativeMenuEvent) {
    if (!this.activeRequestId || event.requestId !== this.activeRequestId) {
      return;
    }

    const options = this.activeOptions;
    this.activeRequestId = null;
    this.activeOptions = null;
    options?.onHide?.();

    if (event.type === 'select' && typeof event.value === 'string') {
      options?.onSelect?.({ value: event.value });
    }
  }
}

export function createElectronOverlayMenuController() {
  return new ElectronOverlayMenuController();
}
