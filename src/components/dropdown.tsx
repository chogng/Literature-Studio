import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import './dropdown.css';

export type DropdownSize = 'sm' | 'md' | 'lg';

export type DropdownOption = {
  value: string;
  label: string;
  title?: string;
  disabled?: boolean;
};

export interface DropdownProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: DropdownOption[];
  size?: DropdownSize;
  value?: string;
  disabled?: boolean;
  onChange?: (event: { target: { value: string } }) => void;
  onOpenChange?: (isOpen: boolean) => void;
}

export const Dropdown = forwardRef<HTMLDivElement, DropdownProps>(
  (
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
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const isOpenRef = useRef(false);

    const setRefs = useCallback(
      (node: HTMLDivElement) => {
        containerRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
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
      const listener = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          updateOpenState(false);
          setIsFocused(false);
        }
      };
      if (isOpen) {
        document.addEventListener('mousedown', listener);
      }
      return () => {
        document.removeEventListener('mousedown', listener);
      };
    }, [isOpen, updateOpenState]);

    useEffect(() => {
      return () => {
        if (isOpenRef.current) {
          onOpenChange?.(false);
        }
      };
    }, [onOpenChange]);

    const handleToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!disabled) {
        updateOpenState(!isOpenRef.current);
        setIsFocused(true);
      }
    };

    const handleSelect = (optionValue: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!disabled) {
        updateOpenState(false);
        if (onChange) {
          onChange({ target: { value: optionValue } });
        }
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        updateOpenState(!isOpenRef.current);
      } else if (e.key === 'Escape') {
        e.preventDefault();
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

    const selectedOption = options.find((opt) => opt.value === value) || options[0];

    return (
      <div
        ref={setRefs}
        className={wrapperClassName}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            setIsFocused(false);
            updateOpenState(false);
            onBlur?.(e);
          }
        }}
        {...props}
      >
        <div className="dropdown-field custom-dropdown-field" title={selectedOption?.title}>
          {selectedOption ? selectedOption.label : ''}
        </div>
        <div className="dropdown-icon-wrapper">
          <ChevronDown size={14} strokeWidth={1.5} className={`dropdown-chevron ${isOpen ? 'open' : ''}`} />
        </div>

        {isOpen && (
          <div className="dropdown-menu">
            {options.map((option) => (
              <div
                key={option.value}
                className={`dropdown-menu-item ${value === option.value ? 'selected' : ''} ${option.disabled ? 'disabled' : ''}`}
                title={option.title}
                onClick={(e) => {
                  if (!option.disabled) {
                    handleSelect(option.value, e);
                  }
                }}
              >
                <div className="dropdown-menu-item-content">{option.label}</div>
                {value === option.value && <Check size={14} strokeWidth={2} className="dropdown-menu-item-check" />}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);

Dropdown.displayName = 'Dropdown';

export default Dropdown;
