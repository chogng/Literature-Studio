import React, { forwardRef, useState, useCallback } from 'react';
import { XCircle } from 'lucide-react';
import './Input.css';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  size?: InputSize;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = '',
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      clearable,
      onClear,
      size = 'md',
      disabled,
      value,
      onChange,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        onFocus?.(e);
      },
      [onFocus]
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        onBlur?.(e);
      },
      [onBlur]
    );

    const handleClear = useCallback(() => {
      if (onClear) {
        onClear();
      } else if (onChange) {
        // Create a synthetic event for consistency if no onClear is provided
        const event = {
          target: { value: '' },
          currentTarget: { value: '' },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(event);
      }
    }, [onClear, onChange]);

    const showClearButton = clearable && value && !disabled;

    const wrapperClasses = [
      'input-wrapper',
      `input-${size}`,
      isFocused ? 'input-focused' : '',
      error ? 'input-error' : '',
      disabled ? 'input-disabled' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="input-container">
        {label && <label className="input-label">{label}</label>}
        
        <div className={wrapperClasses}>
          {leftIcon && <div className="input-icon-left">{leftIcon}</div>}
          
          <input
            ref={ref}
            className="input-field"
            disabled={disabled}
            value={value}
            onChange={onChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />

          {showClearButton && (
            <button
              type="button"
              className="input-clear-btn"
              onClick={handleClear}
              aria-label="Clear input"
            >
              <XCircle size={size === 'sm' ? 14 : 16} />
            </button>
          )}

          {rightIcon && <div className="input-icon-right">{rightIcon}</div>}
        </div>

        {error ? (
          <span className="input-error-msg">{error}</span>
        ) : (
          helperText && <span className="input-helper-msg">{helperText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
