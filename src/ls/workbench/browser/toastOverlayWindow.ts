import type {
  NativeToastState,
  NativeToastType,
} from 'ls/base/parts/sandbox/common/desktopTypes';
import { detectInitialLocale, getLocaleMessages } from 'language/i18n';
import { nativeHostService } from 'ls/platform/native/electron-sandbox/nativeHostService';
import 'ls/base/browser/ui/toast/toast.css';
import 'ls/workbench/browser/media/toastOverlayWindow.css';

const fallbackToastState: NativeToastState = {
  items: [],
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

function normalizeToastState(
  state: NativeToastState | null | undefined,
): NativeToastState {
  if (!state || !Array.isArray(state.items)) {
    return fallbackToastState;
  }

  return {
    items: state.items
      .filter(
        (item) =>
          typeof item?.id === 'number' && typeof item?.message === 'string',
      )
      .map((item) => ({
        id: item.id,
        message: item.message,
        type:
          item.type === 'success' ||
          item.type === 'error' ||
          item.type === 'warning'
            ? item.type
            : ('info' as const),
      })),
  };
}

function getToastIconText(type: NativeToastType) {
  switch (type) {
    case 'success':
      return 'OK';
    case 'error':
      return '!';
    case 'warning':
      return '!';
    default:
      return 'i';
  }
}

export class ToastOverlayWindowView {
  private readonly element = createElement('main', 'native-toast-overlay-page');
  private readonly stackElement = createElement(
    'div',
    'native-toast-overlay-stack native-toast-overlay-stack-empty',
  );
  private readonly ui = getLocaleMessages(detectInitialLocale());
  private readonly toastApi = nativeHostService.toast;
  private toastState: NativeToastState = fallbackToastState;
  private resizeObserver: ResizeObserver | null = null;
  private readonly handleResize = () => {
    this.reportLayout();
  };
  private readonly disposeListener =
    typeof this.toastApi?.onStateChange === 'function'
      ? this.toastApi.onStateChange((state) => {
          this.toastState = normalizeToastState(state);
          this.render();
        })
      : () => {};

  constructor() {
    this.stackElement.addEventListener('mouseenter', () => {
      this.toastApi?.setHovering(true);
    });
    this.stackElement.addEventListener('mouseleave', () => {
      this.toastApi?.setHovering(false);
    });
    this.element.append(this.stackElement);

    if (typeof this.toastApi?.getState === 'function') {
      void this.toastApi
        .getState()
        .then((state) => {
          this.toastState = normalizeToastState(state);
          this.render();
        })
        .catch(() => {
          this.toastState = fallbackToastState;
          this.render();
        });
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.reportLayout();
    });
    this.resizeObserver.observe(this.stackElement);
    window.addEventListener('resize', this.handleResize);
    this.render();
  }

  getElement() {
    return this.element;
  }

  dispose() {
    this.disposeListener();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener('resize', this.handleResize);
    this.toastApi?.setHovering(false);
    this.element.replaceChildren();
  }

  private reportLayout() {
    if (typeof this.toastApi?.reportLayout !== 'function') {
      return;
    }

    const toastItems = Array.from(
      this.stackElement.querySelectorAll<HTMLElement>('.native-toast-item'),
    );
    if (toastItems.length === 0) {
      this.toastApi.reportLayout({
        width: 0,
        height: 0,
      });
      return;
    }

    let minLeft = Number.POSITIVE_INFINITY;
    let minTop = Number.POSITIVE_INFINITY;
    let maxRight = Number.NEGATIVE_INFINITY;
    let maxBottom = Number.NEGATIVE_INFINITY;

    for (const item of toastItems) {
      const rect = item.getBoundingClientRect();
      minLeft = Math.min(minLeft, rect.left);
      minTop = Math.min(minTop, rect.top);
      maxRight = Math.max(maxRight, rect.right);
      maxBottom = Math.max(maxBottom, rect.bottom);
    }

    this.toastApi.reportLayout({
      width: Math.ceil(maxRight - minLeft),
      height: Math.ceil(maxBottom - minTop),
    });
  }

  private render() {
    this.stackElement.className = `native-toast-overlay-stack${
      this.toastState.items.length === 0 ? ' native-toast-overlay-stack-empty' : ''
    }`;

    if (this.toastState.items.length === 0) {
      this.toastApi?.setHovering(false);
    }

    this.stackElement.replaceChildren(
      ...this.toastState.items.map((item) => {
        const section = createElement(
          'section',
          `toast-item toast-${item.type} native-toast-item`,
        );
        const icon = createElement(
          'div',
          'toast-icon',
          getToastIconText(item.type),
        );
        const content = createElement('div', 'toast-content', item.message);
        const close = createElement(
          'button',
          'toast-close native-toast-close',
          'x',
        );
        close.type = 'button';
        close.setAttribute('aria-label', this.ui.toastClose);
        close.addEventListener('click', () => {
          this.toastApi?.dismiss(item.id);
        });
        section.append(icon, content, close);
        return section;
      }),
    );

    this.reportLayout();
  }
}

export function createToastOverlayWindowView() {
  return new ToastOverlayWindowView();
}
