import { jsx, jsxs } from 'react/jsx-runtime';
import { type ButtonHTMLAttributes, type ForwardedRef, type ReactNode, forwardRef, isValidElement } from 'react';
import { Loader2 } from 'lucide-react';
import './button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';
export type ButtonMode = 'text' | 'icon';
export type ButtonContentMode = 'with' | 'without';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  mode?: ButtonMode;
  iconMode?: ButtonContentMode;
  textMode?: ButtonContentMode;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

function renderButtonContent({
  children,
  isLoading,
  leftIcon,
  rightIcon,
  showLeftIcon,
  showRightIcon,
  showChildrenAsIcon,
  showText,
}: {
  children: ReactNode;
  isLoading: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  showLeftIcon: boolean;
  showRightIcon: boolean;
  showChildrenAsIcon: boolean;
  showText: boolean;
}) {
  return [
    isLoading && jsx(Loader2, { className: 'btn-spinner', size: 16 }),
    showLeftIcon && jsx('span', { className: 'btn-icon-left', children: leftIcon }),
    showChildrenAsIcon && jsx('span', { className: 'btn-icon-only', children }),
    showText && jsx('span', { className: 'btn-content', children }),
    showRightIcon && jsx('span', { className: 'btn-icon-right', children: rightIcon }),
  ];
}

export const Button = forwardRef(function Button(
  {
    className = '',
    variant = 'secondary',
    size = 'md',
    mode = 'text',
    iconMode,
    textMode,
    isLoading = false,
    leftIcon,
    rightIcon,
    disabled,
    children,
    ...props
  }: ButtonProps,
  ref: ForwardedRef<HTMLButtonElement>,
) {
  const resolvedIconMode = iconMode ?? 'with';
  const resolvedTextMode = textMode ?? (mode === 'icon' ? 'without' : 'with');
  const hasTextContent = children !== undefined && children !== null && children !== false;
  const showText = resolvedTextMode === 'with' && hasTextContent;
  const showLeftIcon = !isLoading && resolvedIconMode === 'with' && Boolean(leftIcon);
  const showRightIcon = !isLoading && resolvedIconMode === 'with' && Boolean(rightIcon);
  const showChildrenAsIcon =
    !isLoading &&
    resolvedIconMode === 'with' &&
    !leftIcon &&
    !rightIcon &&
    !showText &&
    isValidElement(children);

  const combinedClassName = [
    'btn-base',
    `btn-${variant}`,
    `btn-${size}`,
    `btn-mode-${mode}`,
    isLoading ? 'btn-loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = renderButtonContent({
    children,
    isLoading,
    leftIcon,
    rightIcon,
    showLeftIcon,
    showRightIcon,
    showChildrenAsIcon,
    showText,
  });

  return jsxs('button', {
    ref,
    className: combinedClassName,
    disabled: isLoading || disabled,
    ...props,
    children: content,
  });
});

Button.displayName = 'Button';

export default Button;
