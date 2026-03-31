import type {
  NativeMenuOption,
  NativeMenuState,
} from '../../base/parts/sandbox/common/desktopTypes.js';
import { nativeHostService } from '../../platform/native/electron-sandbox/nativeHostService';
import '../../base/browser/ui/dropdown/dropdown.css';
import './media/menuOverlayWindow.css';

const SVG_NS = 'http://www.w3.org/2000/svg';

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

function createCheckIcon() {
  const icon = document.createElementNS(SVG_NS, 'svg');
  icon.setAttribute('viewBox', '0 0 16 16');
  icon.setAttribute('width', '12');
  icon.setAttribute('height', '12');
  icon.setAttribute('aria-hidden', 'true');
  icon.classList.add('dropdown-menu-item-check');

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M3.5 8.2l2.4 2.4 6-6');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.6');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  icon.append(path);

  return icon;
}

function createCheckSlot(isSelected: boolean) {
  const slot = createElement('span', 'dropdown-menu-item-check');
  slot.setAttribute('aria-hidden', 'true');

  if (isSelected) {
    slot.append(createCheckIcon());
  } else {
    slot.classList.add('placeholder');
  }

  return slot;
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
  const maxWidth = Math.max(160, window.innerWidth - viewportPadding * 2);
  const optionHeight = 36;
  const verticalPadding = 8;
  const estimatedHeight = Math.min(
    Math.max(1, state.options.length) * optionHeight + verticalPadding,
    320,
  );
  const spaceBelow =
    window.innerHeight - state.triggerRect.y - state.triggerRect.height - viewportPadding;
  const spaceAbove = state.triggerRect.y - viewportPadding;
  const openUpwards = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
  const availableHeight = openUpwards ? spaceAbove : spaceBelow;
  const maxHeight = Math.max(120, availableHeight - menuOffset);
  const width = clamp(
    measuredMenuWidth ?? state.triggerRect.width,
    Math.max(120, state.triggerRect.width),
    maxWidth,
  );
  const preferredLeft =
    state.align === 'center'
      ? state.triggerRect.x + (state.triggerRect.width - width) / 2
      : state.align === 'end'
        ? state.triggerRect.x + state.triggerRect.width - width
        : state.triggerRect.x;
  const left = clamp(
    preferredLeft,
    viewportPadding,
    Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
  );

  return {
    width,
    left,
    maxHeight,
    placement: openUpwards ? 'top' : 'bottom',
    top: openUpwards
      ? undefined
      : state.triggerRect.y + state.triggerRect.height + menuOffset,
    bottom: openUpwards
      ? window.innerHeight - state.triggerRect.y + menuOffset
      : undefined,
  };
}

export class MenuOverlayWindowView {
  private readonly element = createElement('main', 'native-menu-overlay-page');
  private readonly menuSurface = createElement('div');
  private normalizedMenuState: NativeMenuState | null = null;
  private measuredMenuWidth: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private readonly menuApi = nativeHostService.menu;
  private readonly handleWindowResize = () => {
    if (!this.normalizedMenuState) {
      return;
    }

    this.render();
  };
  private readonly handleWindowKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.normalizedMenuState) {
      event.preventDefault();
      this.menuApi?.close(this.normalizedMenuState.requestId);
    }
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
    this.menuSurface.addEventListener('mousedown', (event) => {
      event.stopPropagation();
    });
    this.element.append(this.menuSurface);
    window.addEventListener('resize', this.handleWindowResize);
    window.addEventListener('keydown', this.handleWindowKeydown);

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
    window.removeEventListener('keydown', this.handleWindowKeydown);
    this.element.replaceChildren();
  }

  private measureMenuWidth() {
    const nextWidth = Math.ceil(this.menuSurface.getBoundingClientRect().width);
    if (nextWidth > 0 && nextWidth !== this.measuredMenuWidth) {
      this.measuredMenuWidth = nextWidth;
      this.render();
    }
  }

  private renderMenuItem(
    item: NativeMenuOption,
    isSelected: boolean,
    requestId: string,
  ) {
    const itemElement = createElement(
      'div',
      `dropdown-menu-item${isSelected ? ' selected' : ''}${
        item.disabled ? ' disabled' : ''
      }`,
    );
    if (item.title) {
      itemElement.title = item.title;
    }
    itemElement.append(
      createElement('div', 'dropdown-menu-item-content', item.label),
    );
    itemElement.append(createCheckSlot(isSelected));
    itemElement.addEventListener('click', () => {
      if (item.disabled) {
        return;
      }
      this.menuApi?.select(requestId, item.value);
      this.menuApi?.close(requestId);
    });
    return itemElement;
  }

  private render() {
    const layout = resolveMenuLayout(
      this.normalizedMenuState,
      this.measuredMenuWidth,
    );

    if (!this.normalizedMenuState || !layout) {
      this.menuSurface.className = '';
      this.menuSurface.replaceChildren();
      this.menuSurface.removeAttribute('style');
      return;
    }

    this.menuSurface.className = `dropdown-menu dropdown-menu-${layout.placement} native-menu-overlay-surface`;
    this.menuSurface.style.left = `${layout.left}px`;
    this.menuSurface.style.maxHeight = `${layout.maxHeight}px`;
    this.menuSurface.style.setProperty(
      '--native-menu-min-width',
      `${Math.max(120, this.normalizedMenuState.triggerRect.width)}px`,
    );
    if (layout.top === undefined) {
      this.menuSurface.style.removeProperty('top');
    } else {
      this.menuSurface.style.top = `${layout.top}px`;
    }
    if (layout.bottom === undefined) {
      this.menuSurface.style.removeProperty('bottom');
    } else {
      this.menuSurface.style.bottom = `${layout.bottom}px`;
    }

    this.menuSurface.replaceChildren(
      ...this.normalizedMenuState.options.map((option) =>
        this.renderMenuItem(
          option,
          this.normalizedMenuState?.value === option.value,
          this.normalizedMenuState!.requestId,
        ),
      ),
    );

    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => {
      this.measureMenuWidth();
    });
    this.resizeObserver.observe(this.menuSurface);
    queueMicrotask(() => {
      this.measureMenuWidth();
    });
  }
}

export function createMenuOverlayWindowView() {
  return new MenuOverlayWindowView();
}
