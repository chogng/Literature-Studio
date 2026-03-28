import { jsx, jsxs } from 'react/jsx-runtime';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

import type { NativeToastState, NativeToastType } from '../../base/parts/sandbox/common/desktopTypes.js';
import { detectInitialLocale, getLocaleMessages } from '../../../language/i18n';
import '../../base/browser/ui/toast/toast.css';
import './media/toastOverlayWindow.css';

const fallbackToastState: NativeToastState = {
  items: [],
};

function normalizeToastState(state: NativeToastState | null | undefined): NativeToastState {
  if (!state || !Array.isArray(state.items)) {
    return fallbackToastState;
  }

  return {
    items: state.items
      .filter((item) => typeof item?.id === 'number' && typeof item?.message === 'string')
      .map((item) => ({
        id: item.id,
        message: item.message,
        type:
          item.type === 'success' || item.type === 'error' || item.type === 'warning'
            ? item.type
            : ('info' as const),
      })),
  };
}

function getToastIcon(type: NativeToastType) {
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

export default function ToastOverlayWindow() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [toastState, setToastState] = useState<NativeToastState>(fallbackToastState);
  const ui = useMemo(() => getLocaleMessages(detectInitialLocale()), []);
  const toastApi = window.electronAPI?.toast;

  useEffect(() => {
    let mounted = true;
    const applyState = (state: NativeToastState | null | undefined) => {
      if (!mounted) {
        return;
      }

      setToastState(normalizeToastState(state));
    };

    const disposeListener =
      typeof toastApi?.onStateChange === 'function' ? toastApi.onStateChange(applyState) : () => {};

    if (typeof toastApi?.getState === 'function') {
      void toastApi.getState().then(applyState).catch(() => {
        applyState(fallbackToastState);
      });
    } else {
      applyState(fallbackToastState);
    }

    return () => {
      mounted = false;
      disposeListener();
    };
  }, [toastApi]);

  useEffect(() => {
    const host = rootRef.current;
    if (!host || typeof toastApi?.reportLayout !== 'function') {
      return;
    }

    const reportLayout = () => {
      const toastItems = Array.from(host.querySelectorAll<HTMLElement>('.native-toast-item'));
      if (toastItems.length === 0) {
        toastApi.reportLayout({
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

      toastApi.reportLayout({
        width: Math.ceil(maxRight - minLeft),
        height: Math.ceil(maxBottom - minTop),
      });
    };

    reportLayout();

    const observer = new ResizeObserver(() => {
      reportLayout();
    });
    observer.observe(host);
    window.addEventListener('resize', reportLayout);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', reportLayout);
    };
  }, [toastApi]);

  useEffect(() => {
    if (toastState.items.length > 0) {
      return;
    }

    toastApi?.setHovering(false);
  }, [toastApi, toastState.items.length]);

  useEffect(() => {
    return () => {
      toastApi?.setHovering(false);
    };
  }, [toastApi]);

  return jsx('main', {
    className: 'native-toast-overlay-page',
    children: jsx('div', {
      ref: rootRef,
      className: `native-toast-overlay-stack${
        toastState.items.length === 0 ? ' native-toast-overlay-stack-empty' : ''
      }`,
      onMouseEnter: () => {
        toastApi?.setHovering(true);
      },
      onMouseLeave: () => {
        toastApi?.setHovering(false);
      },
      children: toastState.items.map((item) =>
        jsxs(
          'section',
          {
            className: `toast-item toast-${item.type} native-toast-item`,
            children: [
              jsx('div', {
                className: 'toast-icon',
                children: getToastIcon(item.type),
              }),
              jsx('div', {
                className: 'toast-content',
                children: item.message,
              }),
              jsx('button', {
                type: 'button',
                className: 'toast-close native-toast-close',
                'aria-label': ui.toastClose,
                onClick: () => {
                  window.electronAPI?.toast?.dismiss(item.id);
                },
                children: jsx(X, { size: 14 }),
              }),
            ],
          },
          item.id,
        ),
      ),
    }),
  });
}
