import { jsx, jsxs } from 'react/jsx-runtime';
import {
  type ChangeEvent,
  type FocusEvent,
  type ForwardedRef,
  type InputHTMLAttributes,
  type ReactNode,
  forwardRef,
  useCallback,
  useState,
} from 'react';
import { XCircle } from 'lucide-react';
import './input.css';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  size?: InputSize;
}

export const Input = forwardRef(function Input(
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
  }: InputProps,
  ref: ForwardedRef<HTMLInputElement>,
) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(event);
    },
    [onFocus],
  );

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(event);
    },
    [onBlur],
  );

  const handleClear = useCallback(() => {
    if (onClear) {
      onClear();
      return;
    }

    if (onChange) {
      const event = {
        target: { value: '' },
        currentTarget: { value: '' },
      } as ChangeEvent<HTMLInputElement>;
      onChange(event);
    }
  }, [onClear, onChange]);

  const showClearButton = Boolean(clearable && value && !disabled);
  const wrapperClassName = [
    'input-wrapper',
    `input-${size}`,
    isFocused ? 'input-focused' : '',
    error ? 'input-error' : '',
    disabled ? 'input-disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const helperView = error
    ? jsx('span', { className: 'input-error-msg', children: error })
    : helperText
      ? jsx('span', { className: 'input-helper-msg', children: helperText })
      : null;

  return jsxs('div', {
    className: 'input-container',
    children: [
      label ? jsx('label', { className: 'input-label', children: label }) : null,
      jsxs('div', {
        className: wrapperClassName,
        children: [
          leftIcon ? jsx('div', { className: 'input-icon-left', children: leftIcon }) : null,
          jsx('input', {
            ref,
            className: 'input-field',
            disabled,
            value,
            onChange,
            onFocus: handleFocus,
            onBlur: handleBlur,
            ...props,
          }),
          showClearButton
            ? jsx('button', {
                type: 'button',
                className: 'input-clear-btn',
                onClick: handleClear,
                'aria-label': 'Clear input',
                children: jsx(XCircle, { size: size === 'sm' ? 14 : 16 }),
              })
            : null,
          rightIcon ? jsx('div', { className: 'input-icon-right', children: rightIcon }) : null,
        ],
      }),
      helperView,
    ],
  });
});

Input.displayName = 'Input';

export default Input;
