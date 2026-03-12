import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';
export type ButtonMode = 'text' | 'icon';
export type ButtonContentMode = 'with' | 'without';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  mode?: ButtonMode;
  iconMode?: ButtonContentMode;
  textMode?: ButtonContentMode;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
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
    },
    ref
  ) => {
    const baseClass = 'btn-base';
    const variantClass = `btn-${variant}`;
    const sizeClass = `btn-${size}`;
    const modeClass = `btn-mode-${mode}`;
    const loadingClass = isLoading ? 'btn-loading' : '';
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
      React.isValidElement(children);

    const combinedClassName = [
      baseClass,
      variantClass,
      sizeClass,
      modeClass,
      loadingClass,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        className={combinedClassName}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading && <Loader2 className="btn-spinner" size={16} />}
        {showLeftIcon && <span className="btn-icon-left">{leftIcon}</span>}
        {showChildrenAsIcon && <span className="btn-icon-only">{children}</span>}
        {showText && <span className="btn-content">{children}</span>}
        {showRightIcon && <span className="btn-icon-right">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
