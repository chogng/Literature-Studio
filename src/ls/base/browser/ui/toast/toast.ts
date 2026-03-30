import './toast.css';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
  isExiting?: boolean;
}

type ToastObserver = (toasts: ToastItem[]) => void;

type ToastContainerOptions = {
  closeLabel?: string;
};

let toastId = 0;
let observers: ToastObserver[] = [];
let toasts: ToastItem[] = [];
const TOAST_EXIT_DURATION = 200;

function notify() {
  for (const observer of observers) {
    observer([...toasts]);
  }
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

function createToastOptions(options: ToastOptions | string): ToastOptions {
  return {
    message: typeof options === 'string' ? options : options.message,
    type: typeof options === 'string' ? 'info' : options.type || 'info',
    duration: typeof options === 'string' ? 3000 : options.duration || 3000,
  };
}

function shouldUseNativeToastOverlay() {
  if (typeof window === 'undefined') {
    return false;
  }

  if (
    new URLSearchParams(window.location.search).get('nativeOverlay') === 'toast'
  ) {
    return false;
  }

  return typeof window.electronAPI?.toast?.show === 'function';
}

function getToastIconText(type: ToastType) {
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

function dismissToast(id: number) {
  const target = toasts.find((item) => item.id === id);
  if (!target || target.isExiting) {
    return;
  }

  toasts = toasts.map((item) =>
    item.id === id ? { ...item, isExiting: true } : item,
  );
  notify();

  setTimeout(() => {
    toasts = toasts.filter((item) => item.id !== id);
    notify();
  }, TOAST_EXIT_DURATION);
}

export const toast = {
  show: (options: ToastOptions | string) => {
    const defaultOptions = createToastOptions(options);
    if (shouldUseNativeToastOverlay()) {
      window.electronAPI?.toast?.show(defaultOptions);
      return -1;
    }

    const id = ++toastId;
    const newToast: ToastItem = { ...defaultOptions, id, isExiting: false };
    toasts.push(newToast);
    notify();

    if (defaultOptions.duration !== Infinity) {
      setTimeout(() => {
        dismissToast(id);
      }, defaultOptions.duration);
    }

    return id;
  },
  dismiss: dismissToast,
  success: (message: string, duration?: number) =>
    toast.show({ message, type: 'success', duration }),
  error: (message: string, duration?: number) =>
    toast.show({ message, type: 'error', duration }),
  info: (message: string, duration?: number) =>
    toast.show({ message, type: 'info', duration }),
  warning: (message: string, duration?: number) =>
    toast.show({ message, type: 'warning', duration }),
};

function renderToastItem(item: ToastItem, closeLabel: string) {
  const toastElement = createElement(
    'div',
    `toast-item toast-${item.type}${item.isExiting ? ' exit' : ''}`,
  );
  const icon = createElement('div', 'toast-icon', getToastIconText(item.type || 'info'));
  const content = createElement('div', 'toast-content', item.message);
  const closeButton = createElement(
    'button',
    'toast-close btn-base btn-ghost btn-mode-icon btn-sm',
    'x',
  );
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', closeLabel);
  closeButton.addEventListener('click', () => dismissToast(item.id));
  toastElement.append(icon, content, closeButton);
  return toastElement;
}

export class ToastContainerView {
  private readonly element = createElement('div', 'toast-container');
  private closeLabel: string;
  private readonly observer: ToastObserver;

  constructor({ closeLabel = 'Close' }: ToastContainerOptions = {}) {
    this.closeLabel = closeLabel;
    this.observer = (updatedToasts) => {
      this.render(updatedToasts);
    };
    observers.push(this.observer);
    this.render(toasts);
  }

  getElement() {
    return this.element;
  }

  setCloseLabel(closeLabel: string) {
    if (this.closeLabel === closeLabel) {
      return;
    }
    this.closeLabel = closeLabel;
    this.render(toasts);
  }

  dispose() {
    observers = observers.filter((item) => item !== this.observer);
    this.element.replaceChildren();
  }

  private render(currentToasts: ToastItem[]) {
    this.element.replaceChildren(
      ...currentToasts.map((item) => renderToastItem(item, this.closeLabel)),
    );
  }
}

export function createToastContainerView(options?: ToastContainerOptions) {
  return new ToastContainerView(options);
}
