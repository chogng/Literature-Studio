import { jsx, jsxs } from 'react/jsx-runtime';
import type { ChangeEvent, InputHTMLAttributes } from 'react';
import './switch.css';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export function Switch({
  className = '',
  label,
  checked,
  disabled,
  onChange,
  ...props
}: SwitchProps) {
  const rootClassName = ['switch-root', disabled ? 'switch-disabled' : '', className]
    .filter(Boolean)
    .join(' ');

  return jsxs('label', {
    className: rootClassName,
    children: [
      jsx('input', {
        className: 'switch-input',
        type: 'checkbox',
        checked,
        disabled,
        onChange: onChange as ((event: ChangeEvent<HTMLInputElement>) => void) | undefined,
        ...props,
      }),
      jsx('span', { className: 'switch-slider', 'aria-hidden': 'true' }),
      label ? jsx('span', { className: 'switch-label', children: label }) : null,
    ],
  });
}

export default Switch;
