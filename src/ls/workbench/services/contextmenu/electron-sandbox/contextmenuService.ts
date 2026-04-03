import type {
  NativeMenuCoverage,
  NativeMenuRect,
} from 'ls/base/parts/sandbox/common/desktopTypes';
import {
  createDomDropdownMenuPresenter,
  type DropdownDomMenuLayer,
  type DropdownMenuPresenter,
} from 'ls/base/browser/ui/dropdown/dropdown';
import {
  createDomDropdownMenuActionPresenter,
  type DropdownMenuActionOption,
  type DropdownMenuActionOverlayContext,
  type DropdownMenuActionPresenter,
} from 'ls/base/browser/ui/dropdown/dropdownMenuActionViewItem';
import { createLxIcon } from 'ls/base/browser/ui/lxicon/lxicon';
import {
  createElectronOverlayMenuController,
} from 'ls/workbench/browser/contextmenu/electronOverlayMenuController';
import {
  createElectronOverlayDropdownMenuActionPresenter,
  type ElectronOverlayDropdownMenuActionPresenterOptions,
} from 'ls/workbench/browser/contextmenu/electronOverlayDropdownMenuActionPresenter';
import {
  createElectronOverlayDropdownMenuPresenter,
  type ElectronOverlayDropdownMenuPresenterOptions,
} from 'ls/workbench/browser/contextmenu/electronOverlayDropdownMenuPresenter';
import {
  resolveWorkbenchContextMenuBackend,
  type WorkbenchContextMenuBackendPreference,
} from 'ls/workbench/services/contextmenu/electron-sandbox/contextmenuBackend';

export type ContextMenuAnchor = HTMLElement | NativeMenuRect;
export type ContextMenuAlignment = 'start' | 'center' | 'end';

export type ContextMenuRequest = {
  anchor: ContextMenuAnchor;
  options: readonly DropdownMenuActionOption[];
  backend?: WorkbenchContextMenuBackendPreference;
  value?: string;
  align?: ContextMenuAlignment;
  coverage?: NativeMenuCoverage;
  requestIdPrefix?: string;
  className?: string;
  minWidth?: number;
  onSelect?: (value: string) => void;
  onHide?: () => void;
};

export type WorkbenchContextMenuService = {
  showContextMenu: (request: ContextMenuRequest) => void;
  hideContextMenu: () => void;
  isVisible: () => boolean;
  dispose: () => void;
};

export type WorkbenchContextMenuServiceOptions = {
  backend?: WorkbenchContextMenuBackendPreference;
};

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
  textContent?: string,
) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (textContent !== undefined) {
    element.textContent = textContent;
  }
  return element;
}

function composeClassName(parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(' ');
}

function createCheckSlot(isSelected: boolean) {
  const slot = createElement('span', 'dropdown-menu-item-check');
  slot.setAttribute('aria-hidden', 'true');
  if (!isSelected) {
    slot.classList.add('placeholder');
  }
  return slot;
}

function createMenuContent(option: DropdownMenuActionOption) {
  const content = createElement('div', 'dropdown-option-content');
  if (option.icon) {
    content.append(createLxIcon(option.icon, 'dropdown-option-icon'));
  }
  content.append(createElement('div', 'dropdown-menu-item-content', option.label));
  return content;
}

function resolveDomAlignment(align?: ContextMenuAlignment) {
  return align === 'end' ? 'end' : 'start';
}

function createTransientAnchor(anchor: NativeMenuRect) {
  const element = createElement('div');
  element.setAttribute('aria-hidden', 'true');
  element.style.position = 'fixed';
  element.style.left = `${anchor.x}px`;
  element.style.top = `${anchor.y}px`;
  element.style.width = `${anchor.width}px`;
  element.style.height = `${anchor.height}px`;
  element.style.pointerEvents = 'none';
  element.style.opacity = '0';
  document.body.append(element);
  return element;
}

function isNativeMenuRect(anchor: ContextMenuAnchor): anchor is NativeMenuRect {
  return !(anchor instanceof HTMLElement);
}

class ContextMenuService implements WorkbenchContextMenuService {
  private readonly electronOverlayMenuController = createElectronOverlayMenuController();
  private readonly domContextMenu = createDomDropdownMenuActionPresenter();
  private transientAnchor: HTMLElement | null = null;
  private activeRequest: ContextMenuRequest | null = null;
  private closingRequest: ContextMenuRequest | null = null;

  constructor(
    private readonly options: WorkbenchContextMenuServiceOptions = {},
  ) {}

  showContextMenu = (request: ContextMenuRequest) => {
    this.hideContextMenu();

    const backend = resolveWorkbenchContextMenuBackend({
      backend: request.backend ?? this.options.backend,
    });

    if (backend === 'electron-overlay') {
      this.activeRequest = request;
      this.electronOverlayMenuController.show({
        anchor: request.anchor,
        options: request.options.map((option) => ({
          value: option.value,
          label: option.label,
          title: option.title,
          disabled: option.disabled,
        })),
        value: request.value ?? request.options.find((option) => option.checked)?.value,
        align: request.align,
        coverage: request.coverage,
        requestIdPrefix: request.requestIdPrefix,
        onHide: this.handleElectronOverlayHide,
        onSelect: this.handleElectronOverlaySelect,
      });
      return;
    }

    const anchor = isNativeMenuRect(request.anchor)
      ? (this.transientAnchor = createTransientAnchor(request.anchor))
      : request.anchor;
    this.activeRequest = request;
    this.domContextMenu.show({
      anchor,
      className: composeClassName(['actionbar-context-view', request.className]),
      minWidth: request.minWidth,
      alignment: resolveDomAlignment(request.align),
      options: request.options,
      render: ({ hide }) => this.renderDomMenu(request.options, hide),
      onHide: () => {
        const activeRequest = this.activeRequest;
        this.activeRequest = null;
        this.disposeTransientAnchor();
        activeRequest?.onHide?.();
      },
      onSelectOption: (value: string) => {
        request.onSelect?.(value);
      },
    });
  };

  hideContextMenu = () => {
    this.electronOverlayMenuController.hide();
    this.domContextMenu.hide();
    this.disposeTransientAnchor();
    this.activeRequest = null;
    this.closingRequest = null;
  };

  isVisible = () =>
    this.electronOverlayMenuController.isVisible() || this.domContextMenu.isVisible();

  dispose = () => {
    this.hideContextMenu();
    this.electronOverlayMenuController.dispose();
    this.domContextMenu.dispose();
  };

  private renderDomMenu(
    options: readonly DropdownMenuActionOption[],
    hide: DropdownMenuActionOverlayContext['hide'],
  ) {
    const menu = createElement('div', 'dropdown-menu dropdown-menu-bottom');
    menu.setAttribute('role', 'menu');
    menu.append(
      ...options.map((option) => {
        const item = createElement(
          'div',
          composeClassName([
            'dropdown-menu-item',
            option.checked ? 'selected' : '',
            option.disabled ? 'disabled' : '',
          ]),
        );
        item.setAttribute('role', 'menuitem');
        item.setAttribute('aria-disabled', option.disabled ? 'true' : 'false');
        if (option.title) {
          item.title = option.title;
        }
        item.append(createMenuContent(option), createCheckSlot(Boolean(option.checked)));
        item.addEventListener('click', (event) => {
          event.stopPropagation();
          if (option.disabled) {
            return;
          }
          this.activeRequest?.onSelect?.(option.value);
          hide();
        });
        return item;
      }),
    );
    return menu;
  }

  private disposeTransientAnchor() {
    this.transientAnchor?.remove();
    this.transientAnchor = null;
  }

  private readonly handleElectronOverlayHide = () => {
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

  private readonly handleElectronOverlaySelect = ({ value }: { value: string }) => {
    const request = this.closingRequest;
    this.closingRequest = null;
    request?.onSelect?.(value);
  };
}

export function canUseElectronOverlayContextMenus() {
  return resolveWorkbenchContextMenuBackend({
    backend: 'electron-overlay',
  }) === 'electron-overlay';
}

export function createContextMenuService(
  options?: WorkbenchContextMenuServiceOptions,
): WorkbenchContextMenuService {
  return new ContextMenuService(options);
}

export function createWorkbenchDropdownMenuPresenter(options?: {
  backend?: WorkbenchContextMenuBackendPreference;
  domLayer?: DropdownDomMenuLayer;
  electronOverlay?: ElectronOverlayDropdownMenuPresenterOptions;
}): DropdownMenuPresenter {
  if (
    resolveWorkbenchContextMenuBackend({
      backend: options?.backend,
    }) === 'electron-overlay'
  ) {
    return createElectronOverlayDropdownMenuPresenter(options?.electronOverlay);
  }

  return createDomDropdownMenuPresenter({
    layer: options?.domLayer ?? 'inline',
  });
}

export function createWorkbenchDropdownMenuActionPresenter(options?: {
  backend?: WorkbenchContextMenuBackendPreference;
  electronOverlay?: ElectronOverlayDropdownMenuActionPresenterOptions;
  supportsCustomOverlay?: boolean;
}): DropdownMenuActionPresenter {
  if (
    resolveWorkbenchContextMenuBackend({
      backend: options?.backend,
      supportsCustomOverlay: options?.supportsCustomOverlay,
    }) === 'electron-overlay'
  ) {
    return createElectronOverlayDropdownMenuActionPresenter(options?.electronOverlay);
  }

  return createDomDropdownMenuActionPresenter();
}
