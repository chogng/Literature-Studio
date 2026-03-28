import { jsx, jsxs } from 'react/jsx-runtime';
import {
  type FocusEvent,
  type ForwardedRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Check, ChevronDown } from 'lucide-react';
import './dropdown.css';

export type DropdownSize = 'sm' | 'md' | 'lg';

export type DropdownOption = {
  value: string;
  label: string;
  title?: string;
  disabled?: boolean;
};

export interface DropdownProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: DropdownOption[];
  size?: DropdownSize;
  value?: string;
  disabled?: boolean;
  onChange?: (event: { target: { value: string } }) => void;
  onOpenChange?: (isOpen: boolean) => void;
}

let nativeDropdownRequestId = 0;

function shouldUseNativeMenuOverlay() {
  if (typeof window === 'undefined') {
    return false;
  }

  const nativeOverlayKind = new URLSearchParams(window.location.search).get('nativeOverlay');
  if (nativeOverlayKind === 'menu' || nativeOverlayKind === 'toast') {
    return false;
  }

  return typeof window.electronAPI?.menu?.open === 'function';
}

function resolveNativeMenuAlign(className: string) {
  return className.includes('titlebar-source-select') ? 'center' : 'start';
}

export const Dropdown = forwardRef(function Dropdown(
  {
    className = '',
    options,
    size = 'md',
    value,
    disabled,
    onChange,
    onOpenChange,
    onFocus,
    onBlur,
    ...props
  }: DropdownProps,
  ref: ForwardedRef<HTMLDivElement>,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<'top' | 'bottom'>('bottom');
  const [menuMaxHeight, setMenuMaxHeight] = useState<number | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isOpenRef = useRef(false);
  const nativeRequestIdRef = useRef(`native-dropdown-${++nativeDropdownRequestId}`);
  const usesNativeMenuOverlay = shouldUseNativeMenuOverlay();
  const menuAlign = resolveNativeMenuAlign(className);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;

      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref],
  );

  const updateOpenState = useCallback(
    (nextOpen: boolean) => {
      if (isOpenRef.current === nextOpen) {
        return;
      }

      isOpenRef.current = nextOpen;
      setIsOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [onOpenChange],
  );

  useEffect(() => {
    if (usesNativeMenuOverlay || !isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        updateOpenState(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isOpen, updateOpenState, usesNativeMenuOverlay]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (!usesNativeMenuOverlay) {
      return;
    }

    const menuApi = window.electronAPI?.menu;
    const requestId = nativeRequestIdRef.current;
    const openNativeMenu = () => {
      const triggerRect = containerRef.current?.getBoundingClientRect();
      if (!triggerRect) {
        return;
      }

      menuApi?.open({
        requestId,
        triggerRect: {
          x: triggerRect.x,
          y: triggerRect.y,
          width: triggerRect.width,
          height: triggerRect.height,
        },
        options,
        value,
        align: menuAlign,
      });
    };

    openNativeMenu();

    const handleViewportChange = () => {
      openNativeMenu();
    };
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isOpen, menuAlign, options, updateOpenState, usesNativeMenuOverlay, value]);

  useEffect(() => {
    return () => {
      if (isOpenRef.current) {
        onOpenChange?.(false);
        if (usesNativeMenuOverlay) {
          window.electronAPI?.menu?.close(nativeRequestIdRef.current);
        }
      }
    };
  }, [onOpenChange, usesNativeMenuOverlay]);

  useEffect(() => {
    if (!usesNativeMenuOverlay) {
      return;
    }

    const menuApi = window.electronAPI?.menu;
    if (!menuApi?.onEvent) {
      return;
    }

    return menuApi.onEvent((event) => {
      if (event.requestId !== nativeRequestIdRef.current) {
        return;
      }

      updateOpenState(false);
      setIsFocused(false);
      if (event.type === 'select' && typeof event.value === 'string') {
        onChange?.({ target: { value: event.value } });
      }
    });
  }, [onChange, updateOpenState, usesNativeMenuOverlay]);

  const updateMenuPosition = useCallback(() => {
    if (!isOpenRef.current || !containerRef.current || !menuRef.current) {
      return;
    }

    const viewportPadding = 8;
    const menuOffset = 4;
    const triggerRect = containerRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current.offsetHeight;
    const spaceBelow = window.innerHeight - triggerRect.bottom - viewportPadding;
    const spaceAbove = triggerRect.top - viewportPadding;
    const shouldOpenUpwards = spaceBelow < menuHeight && spaceAbove > spaceBelow;
    const availableSpace = shouldOpenUpwards ? spaceAbove : spaceBelow;

    setMenuPlacement(shouldOpenUpwards ? 'top' : 'bottom');
    setMenuMaxHeight(Math.max(availableSpace - menuOffset, 120));
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    updateMenuPosition();
  }, [isOpen, options.length, updateMenuPosition]);

  useEffect(() => {
    if (!isOpen || usesNativeMenuOverlay) {
      return;
    }

    const handleViewportChange = () => {
      updateMenuPosition();
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isOpen, updateMenuPosition]);

  const handleToggle = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.stopPropagation();

    if (!disabled) {
      if (usesNativeMenuOverlay && isOpenRef.current) {
        window.electronAPI?.menu?.close(nativeRequestIdRef.current);
      }
      updateOpenState(!isOpenRef.current);
      setIsFocused(true);
    }
  };

  const handleSelect = (optionValue: string, event: ReactMouseEvent<HTMLDivElement>) => {
    event.stopPropagation();

    if (!disabled) {
      updateOpenState(false);
      onChange?.({ target: { value: optionValue } });
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      updateOpenState(!isOpenRef.current);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      updateOpenState(false);
    }
  };

  const wrapperClassName = [
    'dropdown-wrapper',
    `dropdown-${size}`,
    isFocused || isOpen ? 'dropdown-focused' : '',
    disabled ? 'dropdown-disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const selectedOption = options.find((option) => option.value === value) || options[0];
  const menuView =
    isOpen && !usesNativeMenuOverlay
      ? jsx('div', {
          ref: menuRef,
          className: `dropdown-menu dropdown-menu-${menuPlacement}`,
          style: menuMaxHeight ? { maxHeight: `${menuMaxHeight}px` } : undefined,
          children: options.map((option) =>
            jsxs(
              'div',
              {
                className: `dropdown-menu-item ${value === option.value ? 'selected' : ''} ${option.disabled ? 'disabled' : ''}`,
                title: option.title,
                onClick: (event: ReactMouseEvent<HTMLDivElement>) => {
                  if (!option.disabled) {
                    handleSelect(option.value, event);
                  }
                },
                children: [
                  jsx('div', { className: 'dropdown-menu-item-content', children: option.label }),
                  value === option.value
                    ? jsx(Check, {
                        size: 14,
                        strokeWidth: 2,
                        className: 'dropdown-menu-item-check',
                      })
                    : null,
                ],
              },
              option.value,
            ),
          ),
        })
      : null;

  return jsxs('div', {
    ref: setRefs,
    className: wrapperClassName,
    onClick: handleToggle,
    onKeyDown: handleKeyDown,
    tabIndex: disabled ? -1 : 0,
    onFocus: (event: FocusEvent<HTMLDivElement>) => {
      setIsFocused(true);
      onFocus?.(event);
    },
    onBlur: (event: FocusEvent<HTMLDivElement>) => {
      if (usesNativeMenuOverlay && isOpenRef.current) {
        onBlur?.(event);
        return;
      }

      if (!containerRef.current?.contains(event.relatedTarget as Node)) {
        setIsFocused(false);
        updateOpenState(false);
      }
      onBlur?.(event);
    },
    ...props,
    children: [
      jsx('div', {
        className: 'dropdown-field custom-dropdown-field',
        title: selectedOption?.title,
        children: selectedOption ? selectedOption.label : '',
      }),
      jsx('div', {
        className: 'dropdown-icon-wrapper',
        children: jsx(ChevronDown, {
          size: 14,
          strokeWidth: 1.5,
          className: `dropdown-chevron ${isOpen ? 'open' : ''}`,
        }),
      }),
      menuView,
    ],
  });
});

Dropdown.displayName = 'Dropdown';

export default Dropdown;
