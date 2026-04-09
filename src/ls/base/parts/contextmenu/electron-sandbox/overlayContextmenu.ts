import type {
  ContextMenuAction,
  ContextMenuAlignment,
  ContextMenuAnchor,
} from 'ls/base/browser/contextmenu';
import { LifecycleOwner } from 'ls/base/common/lifecycle';
import type {
  NativeMenuAlign,
  NativeMenuCoverage,
  NativeMenuEvent,
  NativeMenuOption,
  NativeMenuRect,
} from 'ls/base/parts/sandbox/common/desktopTypes';
import type {
  DropdownMenuPresenter,
  DropdownMenuRequest,
} from 'ls/base/browser/ui/dropdown/dropdown';
import { shouldRefreshDropdownMenuRequest } from 'ls/base/browser/ui/dropdown/dropdown';
import { nativeHostService } from 'ls/platform/native/electron-sandbox/nativeHostService';

// Renderer-side wrapper for the Electron-managed menu overlay backend.
// This is separate from the Electron `Menu.popup` bridge because it uses the
// native overlay window/menu surface API exposed through
// `nativeHostService.overlayMenu`.

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

type OverlayMenuOption = {
  value: string;
  label: string;
  title?: string;
  disabled?: boolean;
};

let electronOverlayMenuRequestId = 0;

function toOverlayMenuOptions<T extends OverlayMenuOption>(options: readonly T[]) {
  return options.map((option) => ({
    value: option.value,
    label: option.label,
    title: option.title,
    disabled: option.disabled,
  }));
}

function resolveSelectedOptionValue<T extends { value: string; checked?: boolean }>(
  options: readonly T[],
  value?: string,
) {
  return value ?? options.find((option) => option.checked)?.value;
}

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

  return typeof nativeHostService.overlayMenu?.open === 'function';
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

export class ElectronOverlayMenuController
  extends LifecycleOwner
  implements ElectronOverlayMenuControllerHandle
{
  private readonly menuApi = nativeHostService.overlayMenu;
  private activeRequestId: string | null = null;
  private activeOptions: ElectronOverlayMenuControllerOptions | null = null;
  private disposed = false;

  constructor() {
    super();
    if (canUseElectronOverlayContextMenus() && typeof this.menuApi?.onEvent === 'function') {
      this.register(this.menuApi.onEvent((event) => this.handleMenuEvent(event)));
    }
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

    this.hide();
    this.disposed = true;
    super.dispose();
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

export type ElectronOverlayDropdownMenuPresenterOptions = {
  coverage?: NativeMenuCoverage;
  requestIdPrefix?: string;
};

export class ElectronOverlayDropdownMenuPresenter
  extends LifecycleOwner
  implements DropdownMenuPresenter
{
  readonly isDetached = true;
  readonly supportsActiveDescendant = false;
  readonly respondsToViewportChanges = true;
  private readonly electronOverlayMenuController = createElectronOverlayMenuController();
  private activeRequest: DropdownMenuRequest | null = null;
  private closingRequest: DropdownMenuRequest | null = null;
  private activeTriggerRect: DropdownMenuRequest['triggerRect'] | null = null;
  private disposed = false;

  constructor(
    private readonly options: ElectronOverlayDropdownMenuPresenterOptions = {},
  ) {
    super();
    this.register(this.electronOverlayMenuController);
  }

  show = (request: DropdownMenuRequest) => {
    if (this.disposed) {
      return;
    }

    if (
      request.source === 'props' &&
      this.activeRequest &&
      !shouldRefreshDropdownMenuRequest(this.activeRequest, request)
    ) {
      this.activeRequest = request;
      return;
    }

    if (!this.activeTriggerRect || request.source === 'open' || request.source === 'viewport') {
      this.activeTriggerRect = request.triggerRect;
    }

    this.activeRequest = request;
    this.electronOverlayMenuController.show({
      anchor: this.activeTriggerRect ?? request.triggerRect,
      options: toOverlayMenuOptions(request.options),
      value: request.value,
      align: request.align,
      coverage: this.options.coverage,
      requestIdPrefix: this.options.requestIdPrefix,
      onHide: this.handleHide,
      onSelect: this.handleSelect,
    });
  };

  hide = () => {
    if (this.disposed) {
      return;
    }

    this.activeTriggerRect = null;
    this.electronOverlayMenuController.hide();
  };

  isVisible = () => this.electronOverlayMenuController.isVisible();

  containsTarget = () => false;

  dispose = () => {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.activeRequest = null;
    this.closingRequest = null;
    this.activeTriggerRect = null;
    super.dispose();
  };

  private readonly handleHide = () => {
    const request = this.activeRequest;
    this.activeRequest = null;
    this.activeTriggerRect = null;
    this.closingRequest = request;
    queueMicrotask(() => {
      if (this.closingRequest === request) {
        this.closingRequest = null;
      }
    });
    request?.onHide();
  };

  private readonly handleSelect = ({ value }: { value: string }) => {
    const request = this.closingRequest;
    this.closingRequest = null;
    request?.onSelect(value);
  };
}

export function createElectronOverlayDropdownMenuPresenter(
  options?: ElectronOverlayDropdownMenuPresenterOptions,
) {
  return new ElectronOverlayDropdownMenuPresenter(options);
}

export type ShowElectronOverlayContextMenuRequest = {
  anchor: ContextMenuAnchor;
  options: readonly ContextMenuAction[];
  value?: string;
  align?: ContextMenuAlignment;
  coverage?: NativeMenuCoverage;
  requestIdPrefix?: string;
  onSelect?: (value: string) => void;
  onHide?: () => void;
};

export type ElectronOverlayContextMenuHandler = {
  show: (request: ShowElectronOverlayContextMenuRequest) => void;
  hide: () => void;
  isVisible: () => boolean;
  dispose: () => void;
};

function resolveOverlayAnchor(anchor: ContextMenuAnchor) {
  if (anchor instanceof HTMLElement) {
    return anchor;
  }

  return {
    x: anchor.x,
    y: anchor.y,
    width: anchor.width ?? 0,
    height: anchor.height ?? 0,
  };
}

export class ElectronOverlayContextMenuHandlerImpl
  extends LifecycleOwner
  implements ElectronOverlayContextMenuHandler
{
  private readonly electronOverlayMenuController = createElectronOverlayMenuController();
  private activeRequest: ShowElectronOverlayContextMenuRequest | null = null;
  private closingRequest: ShowElectronOverlayContextMenuRequest | null = null;
  private disposed = false;

  constructor() {
    super();
    this.register(this.electronOverlayMenuController);
  }

  show = (request: ShowElectronOverlayContextMenuRequest) => {
    if (this.disposed) {
      return;
    }

    this.activeRequest = request;
    this.electronOverlayMenuController.show({
      anchor: resolveOverlayAnchor(request.anchor),
      options: toOverlayMenuOptions(request.options),
      value: resolveSelectedOptionValue(request.options, request.value),
      align: request.align,
      coverage: request.coverage,
      requestIdPrefix: request.requestIdPrefix,
      onHide: this.handleHide,
      onSelect: this.handleSelect,
    });
  };

  hide = () => {
    if (this.disposed) {
      return;
    }

    this.electronOverlayMenuController.hide();
  };

  isVisible = () => this.electronOverlayMenuController.isVisible();

  dispose = () => {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.activeRequest = null;
    this.closingRequest = null;
    super.dispose();
  };

  private readonly handleHide = () => {
    const request = this.activeRequest;
    this.activeRequest = null;
    this.closingRequest = request;
    queueMicrotask(() => {
      if (this.closingRequest === request) {
        this.closingRequest = null;
      }
    });
    request?.onHide?.();
  };

  private readonly handleSelect = ({ value }: { value: string }) => {
    const request = this.closingRequest;
    this.closingRequest = null;
    request?.onSelect?.(value);
  };
}

export function createElectronOverlayContextMenuHandler() {
  return new ElectronOverlayContextMenuHandlerImpl();
}
