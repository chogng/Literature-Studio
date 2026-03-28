import { jsx, jsxs } from 'react/jsx-runtime';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { Check } from 'lucide-react';

import type {
  NativeMenuOption,
  NativeMenuState,
} from '../../base/parts/sandbox/common/desktopTypes.js';
import '../../base/browser/ui/dropdown/dropdown.css';
import './media/menuOverlayWindow.css';

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeMenuState(state: NativeMenuState | null | undefined): NativeMenuState | null {
  if (!state || !state.requestId) {
    return null;
  }

  return {
    ...state,
    options: Array.isArray(state.options) ? state.options : [],
    align: state.align === 'center' ? 'center' : 'start',
  };
}

function resolveMenuLayout(state: NativeMenuState | null, measuredMenuWidth: number | null) {
  if (!state) {
    return null;
  }

  const viewportPadding = 8;
  const menuOffset = 4;
  const maxWidth = Math.max(160, window.innerWidth - viewportPadding * 2);
  const optionHeight = 36;
  const verticalPadding = 8;
  const estimatedHeight = Math.min(
    Math.max(1, state.options.length) * optionHeight + verticalPadding,
    320,
  );
  const spaceBelow = window.innerHeight - state.triggerRect.y - state.triggerRect.height - viewportPadding;
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
    top: openUpwards ? undefined : state.triggerRect.y + state.triggerRect.height + menuOffset,
    bottom: openUpwards ? window.innerHeight - state.triggerRect.y + menuOffset : undefined,
  };
}

function renderMenuItem(
  item: NativeMenuOption,
  isSelected: boolean,
  requestId: string,
  onClose: (requestId: string) => void,
) {
  return jsxs(
    'div',
    {
      className: `dropdown-menu-item ${isSelected ? 'selected' : ''} ${item.disabled ? 'disabled' : ''}`,
      title: item.title,
      onClick: () => {
        if (item.disabled) {
          return;
        }

        window.electronAPI?.menu?.select(requestId, item.value);
        onClose(requestId);
      },
      children: [
        jsx('div', { className: 'dropdown-menu-item-content', children: item.label }),
        isSelected
          ? jsx(Check, {
              size: 14,
              strokeWidth: 2,
              className: 'dropdown-menu-item-check',
            })
          : null,
      ],
    },
    item.value,
  );
}

export default function MenuOverlayWindow() {
  const [menuState, setMenuState] = useState<NativeMenuState | null>(null);
  const [measuredMenuWidth, setMeasuredMenuWidth] = useState<number | null>(null);
  const menuSurfaceRef = useRef<HTMLDivElement | null>(null);
  const normalizedMenuState = useMemo(() => normalizeMenuState(menuState), [menuState]);
  const menuLayout = useMemo(
    () => resolveMenuLayout(normalizedMenuState, measuredMenuWidth),
    [measuredMenuWidth, normalizedMenuState],
  );

  useEffect(() => {
    setMeasuredMenuWidth(null);
  }, [normalizedMenuState?.requestId]);

  useEffect(() => {
    let mounted = true;
    const menuApi = window.electronAPI?.menu;
    const applyState = (state: NativeMenuState | null) => {
      if (!mounted) {
        return;
      }

      setMenuState(normalizeMenuState(state));
    };

    const disposeListener =
      typeof menuApi?.onStateChange === 'function' ? menuApi.onStateChange(applyState) : () => {};

    if (typeof menuApi?.getState === 'function') {
      void menuApi.getState().then(applyState).catch(() => {
        applyState(null);
      });
    } else {
      applyState(null);
    }

    return () => {
      mounted = false;
      disposeListener();
    };
  }, []);

  useEffect(() => {
    if (!normalizedMenuState) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        window.electronAPI?.menu?.close(normalizedMenuState.requestId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [normalizedMenuState]);

  useLayoutEffect(() => {
    if (!normalizedMenuState || !menuSurfaceRef.current) {
      return;
    }

    const measure = () => {
      const nextWidth = Math.ceil(menuSurfaceRef.current?.getBoundingClientRect().width ?? 0);
      if (nextWidth > 0) {
        setMeasuredMenuWidth((currentWidth) => (currentWidth === nextWidth ? currentWidth : nextWidth));
      }
    };

    measure();

    const observer = new ResizeObserver(() => {
      measure();
    });
    observer.observe(menuSurfaceRef.current);

    return () => {
      observer.disconnect();
    };
  }, [normalizedMenuState, menuLayout?.maxHeight, menuLayout?.placement]);

  return jsx('main', {
    className: 'native-menu-overlay-page',
    onMouseDown: (event: ReactMouseEvent<HTMLElement>) => {
      if (!normalizedMenuState) {
        return;
      }

      if (event.target === event.currentTarget) {
        window.electronAPI?.menu?.close(normalizedMenuState.requestId);
      }
    },
    children:
      normalizedMenuState && menuLayout
        ? jsxs('div', {
            ref: menuSurfaceRef,
            className: `dropdown-menu dropdown-menu-${menuLayout.placement} native-menu-overlay-surface`,
            style: {
              left: `${menuLayout.left}px`,
              maxHeight: `${menuLayout.maxHeight}px`,
              '--native-menu-min-width': `${Math.max(120, normalizedMenuState.triggerRect.width)}px`,
              top: menuLayout.top === undefined ? undefined : `${menuLayout.top}px`,
              bottom: menuLayout.bottom === undefined ? undefined : `${menuLayout.bottom}px`,
            } as CSSProperties,
            onMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => {
              event.stopPropagation();
            },
            children: normalizedMenuState.options.map((option) =>
              renderMenuItem(
                option,
                normalizedMenuState.value === option.value,
                normalizedMenuState.requestId,
                (requestId) => window.electronAPI?.menu?.close(requestId),
              ),
            ),
          })
        : null,
  });
}
