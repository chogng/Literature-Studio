import { jsx, jsxs } from 'react/jsx-runtime';
import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { Button } from '../button/button';
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

type ToastContainerProps = {
  closeLabel?: string;
};

let toastId = 0;
let observers: ToastObserver[] = [];
let toasts: ToastItem[] = [];
const TOAST_EXIT_DURATION = 200;

function notify() {
  observers.forEach((observer) => observer([...toasts]));
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

  if (new URLSearchParams(window.location.search).get('nativeOverlay') === 'toast') {
    return false;
  }

  return typeof window.electronAPI?.toast?.show === 'function';
}

function getToastIcon(type: ToastType) {
  const iconProps = {
    size: 18,
    strokeWidth: 2,
  } as const;

  switch (type) {
    case 'success':
      return jsx(CheckCircle2, { ...iconProps, color: '#10b981' });
    case 'error':
      return jsx(AlertCircle, { ...iconProps, color: '#ef4444' });
    case 'warning':
      return jsx(AlertTriangle, { ...iconProps, color: '#f59e0b' });
    default:
      return jsx(Info, { ...iconProps, color: '#0a5fbf' });
  }
}

function dismissToast(id: number) {
  const target = toasts.find((item) => item.id === id);
  if (!target || target.isExiting) {
    return;
  }

  toasts = toasts.map((item) => (item.id === id ? { ...item, isExiting: true } : item));
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
  return jsxs(
    'div',
    {
      className: `toast-item toast-${item.type}${item.isExiting ? ' exit' : ''}`,
      children: [
        jsx('div', {
          className: 'toast-icon',
          children: getToastIcon(item.type || 'info'),
        }),
        jsx('div', { className: 'toast-content', children: item.message }),
        jsx(Button, {
          className: 'toast-close',
          variant: 'ghost',
          size: 'sm',
          mode: 'icon',
          iconMode: 'with',
          textMode: 'without',
          onClick: () => dismissToast(item.id),
          'aria-label': closeLabel,
          children: jsx(X, { size: 14 }),
        }),
      ],
    },
    item.id,
  );
}

export function ToastContainer({ closeLabel = 'Close' }: ToastContainerProps) {
  const [currentToasts, setCurrentToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const observer = (updatedToasts: ToastItem[]) => {
      setCurrentToasts(updatedToasts);
    };

    observers.push(observer);
    return () => {
      observers = observers.filter((item) => item !== observer);
    };
  }, []);

  return jsx('div', {
    className: 'toast-container',
    children: currentToasts.map((item) => renderToastItem(item, closeLabel)),
  });
}
