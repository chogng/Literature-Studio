import type {
  ContextMenuAction,
  ContextMenuDelegate,
  ContextMenuService as BaseContextMenuService,
} from 'ls/base/browser/contextmenu';
import type {
  NativeMenuCoverage,
} from 'ls/base/parts/sandbox/common/desktopTypes';
import type {
  ContextMenuItem,
  PopupOptions,
} from 'ls/base/parts/contextmenu/common/contextmenu';
import { createPlatformContextMenuService } from 'ls/platform/contextview/browser/contextMenuService';
import {
  createElectronOverlayContextMenuHandler,
} from 'ls/base/parts/contextmenu/electron-sandbox/overlayContextmenu';
import {
  close as closeNativePopupContextMenu,
  popup as popupNativePopupContextMenu,
} from 'ls/base/parts/contextmenu/electron-sandbox/nativeContextmenu';
import {
  resolveWorkbenchContextMenuRouting,
  type WorkbenchContextMenuBackendPreference,
} from 'ls/workbench/services/contextmenu/electron-sandbox/contextmenuRouting';

export type WorkbenchContextMenuRouteOptions = {
  backend?: WorkbenchContextMenuBackendPreference;
  value?: string;
  coverage?: NativeMenuCoverage;
  requestIdPrefix?: string;
};

export type WorkbenchContextMenuDelegate =
  ContextMenuDelegate & WorkbenchContextMenuRouteOptions;

type WorkbenchContextMenuAlignment = ContextMenuDelegate['alignment'];

export type WorkbenchContextMenuService = {
  showContextMenu: (delegate: WorkbenchContextMenuDelegate) => void;
  hideContextMenu: () => void;
  isVisible: () => boolean;
  dispose: () => void;
} & BaseContextMenuService;

export type WorkbenchContextMenuServiceOptions = {
  backend?: WorkbenchContextMenuBackendPreference;
  coverage?: NativeMenuCoverage;
  requestIdPrefix?: string;
};

// DOM menus stay in platform/contextview. The only non-DOM backends surfaced to
// workbench code are:
// - `native-popup`: native popup menu semantics
// - `electron-overlay`: a dedicated WebContentsView overlay surface that can
//   cover other WebContentsView instances
// Only backend routing and workbench-specific preferences stay in this file.

function resolveDomAlignment(align?: WorkbenchContextMenuAlignment) {
  return align === 'end' ? 'end' : 'start';
}

function resolveNativePopupOptions(
  anchor: ReturnType<ContextMenuDelegate['getAnchor']>,
  align?: WorkbenchContextMenuAlignment,
): PopupOptions {
  if (anchor instanceof HTMLElement) {
    const rect = anchor.getBoundingClientRect();
    return {
      x: Math.round(align === 'end' ? rect.right : rect.left),
      y: Math.round(rect.bottom),
    };
  }

  return {
    x: Math.round((align === 'end' ? anchor.x + (anchor.width ?? 0) : anchor.x) + 1),
    y: Math.round(anchor.y + (anchor.height ?? 0)),
  };
}

function resolveNativePopupPositioningItem(
  options: readonly ContextMenuAction[],
  value?: string,
) {
  const selectedValue = value ?? options.find((option) => option.checked)?.value;
  if (!selectedValue) {
    return undefined;
  }

  const index = options.findIndex((option) => option.value === selectedValue);
  return index >= 0 ? index : undefined;
}

function createNativePopupContextMenuItems(
  options: readonly ContextMenuAction[],
  onSelect?: (value: string) => void,
): ContextMenuItem[] {
  return options.map((option) => ({
    label: option.label,
    enabled: !option.disabled,
    checked: option.checked,
    type: option.checked ? 'checkbox' : 'normal',
    click: () => {
      onSelect?.(option.value);
    },
  }));
}

class ContextMenuService implements WorkbenchContextMenuService {
  private readonly electronOverlayContextMenu = createElectronOverlayContextMenuHandler();
  private readonly domContextMenu = createPlatformContextMenuService();
  private activeDomDelegate: WorkbenchContextMenuDelegate | null = null;
  private activeNativePopupRequestId: string | null = null;
  private readonly nativePopupDelegates = new Map<string, WorkbenchContextMenuDelegate>();

  constructor(
    private readonly options: WorkbenchContextMenuServiceOptions = {},
  ) {}

  showContextMenu = (delegate: WorkbenchContextMenuDelegate) => {
    this.hideContextMenu();

    const backend = resolveWorkbenchContextMenuRouting({
      backend: delegate.backend ?? this.options.backend,
    });

    if (backend === 'electron-overlay') {
      this.electronOverlayContextMenu.show({
        anchor: delegate.getAnchor(),
        options: delegate.getActions(),
        value: delegate.value,
        align: delegate.alignment,
        coverage: delegate.coverage ?? this.options.coverage,
        requestIdPrefix: delegate.requestIdPrefix ?? this.options.requestIdPrefix,
        onSelect: delegate.onSelect,
        onHide: () => {
          delegate.onHide?.(true);
        },
      });
      return;
    }

    if (
      backend === 'native-popup' &&
      this.showNativePopupContextMenu(delegate)
    ) {
      return;
    }

    this.handleDomContextMenu(delegate);
  };

  hideContextMenu = () => {
    this.electronOverlayContextMenu.hide();
    this.hideNativePopupContextMenu();
    this.domContextMenu.hideContextMenu();
  };

  isVisible = () =>
    this.electronOverlayContextMenu.isVisible()
    || this.domContextMenu.isVisible()
    || this.activeNativePopupRequestId !== null;

  dispose = () => {
    this.hideContextMenu();
    this.electronOverlayContextMenu.dispose();
    this.domContextMenu.dispose();
  };

  private handleDomContextMenu(delegate: WorkbenchContextMenuDelegate) {
    this.activeDomDelegate = delegate;
    this.domContextMenu.showContextMenu({
      getAnchor: delegate.getAnchor,
      getActions: delegate.getActions,
      getMenuClassName: delegate.getMenuClassName,
      alignment: resolveDomAlignment(delegate.alignment),
      minWidth: delegate.minWidth,
      onHide: () => {
        const activeDelegate = this.activeDomDelegate;
        this.activeDomDelegate = null;
        activeDelegate?.onHide?.(true);
      },
      onSelect: (value: string) => {
        delegate.onSelect?.(value);
      },
    });
  }

  private showNativePopupContextMenu(delegate: WorkbenchContextMenuDelegate) {
    const actions = delegate.getActions();
    const requestId = popupNativePopupContextMenu(
      createNativePopupContextMenuItems(actions, delegate.onSelect),
      {
        ...resolveNativePopupOptions(delegate.getAnchor(), delegate.alignment),
        positioningItem: resolveNativePopupPositioningItem(actions, delegate.value),
      },
      () => {
        if (requestId) {
          this.handleNativePopupHide(requestId);
        }
      },
    );

    if (!requestId) {
      return false;
    }

    this.activeNativePopupRequestId = requestId;
    this.nativePopupDelegates.set(requestId, delegate);
    return true;
  }

  private hideNativePopupContextMenu() {
    if (!this.activeNativePopupRequestId) {
      return;
    }

    const requestId = this.activeNativePopupRequestId;
    this.activeNativePopupRequestId = null;
    closeNativePopupContextMenu(requestId);
  }

  private handleNativePopupHide(requestId: string) {
    const delegate = this.nativePopupDelegates.get(requestId);
    if (!delegate) {
      return;
    }

    this.nativePopupDelegates.delete(requestId);
    if (this.activeNativePopupRequestId === requestId) {
      this.activeNativePopupRequestId = null;
    }
    delegate.onHide?.(true);
  }
}

export function createContextMenuService(
  options?: WorkbenchContextMenuServiceOptions,
): WorkbenchContextMenuService {
  return new ContextMenuService(options);
}
