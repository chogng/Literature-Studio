import type { ContextMenuAction } from 'ls/base/browser/contextmenu';
import { Menu } from 'ls/base/browser/ui/menu/menu';
import {
  resolveAnchoredHorizontalLeft,
  resolveAnchoredVerticalPlacement,
} from 'ls/base/browser/ui/contextview/anchoredLayout';
import type { NativeMenuState } from 'ls/base/parts/sandbox/common/desktopTypes';
import { nativeHostService } from 'ls/platform/native/electron-sandbox/nativeHostService';
import 'ls/base/parts/contextmenu/electron-sandbox/overlayMenu.css';

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

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

function normalizeMenuState(
  state: NativeMenuState | null | undefined,
): NativeMenuState | null {
  if (!state || !state.requestId) {
    return null;
  }

  return {
    ...state,
    options: Array.isArray(state.options) ? state.options : [],
    align:
      state.align === 'center'
        ? 'center'
        : state.align === 'end'
          ? 'end'
          : 'start',
  };
}

function resolveMenuLayout(
  state: NativeMenuState | null,
  measuredMenuWidth: number | null,
) {
  if (!state) {
    return null;
  }

  const viewportPadding = 8;
  const menuOffset = state.coverage === 'trigger-band' ? 8 : 4;
  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight || 0;
  const maxWidth = Math.max(160, viewportWidth - viewportPadding * 2);
  const optionHeight = 36;
  const verticalPadding = 8;
  const estimatedHeight = Math.min(
    Math.max(1, state.options.length) * optionHeight + verticalPadding,
    320,
  );
  const verticalPlacement = resolveAnchoredVerticalPlacement({
    anchorRect: state.triggerRect,
    overlayHeight: estimatedHeight,
    viewportHeight,
    viewportMargin: viewportPadding,
    offset: menuOffset,
    preference: 'auto',
  });
  const openUpwards = verticalPlacement.placement === 'above';
  const availableHeight = openUpwards
    ? verticalPlacement.spaceAbove
    : verticalPlacement.spaceBelow;
  const maxHeight = Math.max(120, availableHeight - menuOffset);
  const width = clamp(
    measuredMenuWidth ?? state.triggerRect.width,
    Math.max(120, state.triggerRect.width),
    maxWidth,
  );
  const left = resolveAnchoredHorizontalLeft({
    anchorRect: state.triggerRect,
    overlayWidth: width,
    viewportWidth,
    viewportMargin: viewportPadding,
    alignment: state.align,
  });

  return {
    width,
    left,
    maxHeight,
    placement: openUpwards ? 'top' as const : 'bottom' as const,
    top: openUpwards
      ? undefined
      : state.triggerRect.y + state.triggerRect.height + menuOffset,
    bottom: openUpwards
      ? viewportHeight - state.triggerRect.y + menuOffset
      : undefined,
  };
}

function toMenuActions(state: NativeMenuState): ContextMenuAction[] {
  return state.options.map((option) => ({
    value: option.value,
    label: option.label,
    title: option.title,
    disabled: option.disabled,
    checked: state.value === option.value,
  }));
}

export class OverlayMenuView {
  private readonly element = createElement('main', 'native-menu-overlay-page');
  private readonly menu = new Menu({
    items: [],
    className: 'native-menu-overlay-menu',
    onSelect: ({ value }) => {
      this.handleSelect(value);
    },
    onCancel: () => {
      this.handleCancel();
    },
  });
  private normalizedMenuState: NativeMenuState | null = null;
  private measuredMenuWidth: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private focusedRequestId: string | null = null;
  private readonly menuApi = nativeHostService.overlayMenu;
  private readonly handleWindowResize = () => {
    if (!this.normalizedMenuState) {
      return;
    }

    this.render();
  };
  private readonly disposeListener =
    typeof this.menuApi?.onStateChange === 'function'
      ? this.menuApi.onStateChange((state) => {
          this.normalizedMenuState = normalizeMenuState(state);
          this.measuredMenuWidth = null;
          this.render();
        })
      : () => {};

  constructor() {
    this.element.addEventListener('mousedown', (event) => {
      if (
        this.normalizedMenuState &&
        event.target === this.element
      ) {
        this.menuApi?.close(this.normalizedMenuState.requestId);
      }
    });
    this.element.append(this.menu.getElement());
    window.addEventListener('resize', this.handleWindowResize);

    if (typeof this.menuApi?.getState === 'function') {
      void this.menuApi
        .getState()
        .then((state) => {
          this.normalizedMenuState = normalizeMenuState(state);
          this.render();
        })
        .catch(() => {
          this.normalizedMenuState = null;
          this.render();
        });
    }

    this.render();
  }

  getElement() {
    return this.element;
  }

  dispose() {
    this.disposeListener();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener('resize', this.handleWindowResize);
    this.menu.dispose();
    this.element.replaceChildren();
  }

  private measureMenuWidth() {
    const nextWidth = Math.ceil(this.menu.getElement().getBoundingClientRect().width);
    if (nextWidth > 0 && nextWidth !== this.measuredMenuWidth) {
      this.measuredMenuWidth = nextWidth;
      this.render();
    }
  }

  private handleSelect(value: string) {
    const requestId = this.normalizedMenuState?.requestId;
    if (!requestId) {
      return;
    }

    this.menuApi?.select(requestId, value);
    this.menuApi?.close(requestId);
  }

  private handleCancel() {
    const requestId = this.normalizedMenuState?.requestId;
    if (!requestId) {
      return;
    }

    this.menuApi?.close(requestId);
  }

  private render() {
    const menuElement = this.menu.getElement();
    const layout = resolveMenuLayout(
      this.normalizedMenuState,
      this.measuredMenuWidth,
    );

    if (!this.normalizedMenuState || !layout) {
      this.focusedRequestId = null;
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
      menuElement.style.display = 'none';
      menuElement.style.removeProperty('left');
      menuElement.style.removeProperty('top');
      menuElement.style.removeProperty('bottom');
      menuElement.style.removeProperty('maxHeight');
      menuElement.style.removeProperty('--native-menu-min-width');
      return;
    }

    const shouldFocus = this.focusedRequestId !== this.normalizedMenuState.requestId;
    this.focusedRequestId = this.normalizedMenuState.requestId;

    this.menu.setOptions({
      items: toMenuActions(this.normalizedMenuState),
      className: 'native-menu-overlay-menu',
      placement: layout.placement,
      value: this.normalizedMenuState.value,
      onSelect: ({ value }) => {
        this.handleSelect(value);
      },
      onCancel: () => {
        this.handleCancel();
      },
    });

    menuElement.style.display = '';
    menuElement.style.left = `${layout.left}px`;
    menuElement.style.maxHeight = `${layout.maxHeight}px`;
    menuElement.style.setProperty(
      '--native-menu-min-width',
      `${Math.max(120, this.normalizedMenuState.triggerRect.width)}px`,
    );
    if (layout.top === undefined) {
      menuElement.style.removeProperty('top');
    } else {
      menuElement.style.top = `${layout.top}px`;
    }
    if (layout.bottom === undefined) {
      menuElement.style.removeProperty('bottom');
    } else {
      menuElement.style.bottom = `${layout.bottom}px`;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => {
      this.measureMenuWidth();
    });
    this.resizeObserver.observe(menuElement);
    queueMicrotask(() => {
      this.measureMenuWidth();
      if (shouldFocus) {
        this.menu.focusSelectedOrFirstEnabled();
      }
    });
  }
}

export function createOverlayMenuView() {
  return new OverlayMenuView();
}
