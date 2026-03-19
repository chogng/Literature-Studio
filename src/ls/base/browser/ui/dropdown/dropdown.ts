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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isOpenRef = useRef(false);

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
    if (!isOpen) {
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
  }, [isOpen, updateOpenState]);

  useEffect(() => {
    return () => {
      if (isOpenRef.current) {
        onOpenChange?.(false);
      }
    };
  }, [onOpenChange]);

  const handleToggle = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.stopPropagation();

    if (!disabled) {
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
  const menuView = isOpen
    ? jsx('div', {
        className: 'dropdown-menu',
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
      if (!containerRef.current?.contains(event.relatedTarget as Node)) {
        setIsFocused(false);
        updateOpenState(false);
        onBlur?.(event);
      }
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
