import { jsx, jsxs } from 'react/jsx-runtime';
import { type MouseEvent as ReactMouseEvent, type ReactNode, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '../button/button';
import './modal.css';

type ModalProps = {
  open: boolean;
  title?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  closeLabel?: string;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  panelClassName?: string;
  ariaLabel?: string;
};

export default function Modal({
  open,
  title,
  children,
  onClose,
  closeLabel = 'Close',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
  panelClassName = '',
  ariaLabel,
}: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open || !closeOnEscape) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, closeOnEscape, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  const titleView = title
    ? jsx('h2', { id: titleId, className: 'modal-title', children: title })
    : jsx('span', { className: 'modal-title-spacer' });

  return createPortal(
    jsx('div', {
      className: ['modal-backdrop', className].filter(Boolean).join(' '),
      onClick: closeOnOverlayClick ? onClose : undefined,
      'aria-hidden': 'true',
      children: jsxs('section', {
        className: ['modal-panel', panelClassName].filter(Boolean).join(' '),
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': title ? titleId : undefined,
        'aria-label': ariaLabel,
        onClick: (event: ReactMouseEvent<HTMLElement>) => event.stopPropagation(),
        children: [
          jsxs('header', {
            className: 'modal-header',
            children: [
              titleView,
              jsx(Button, {
                type: 'button',
                variant: 'ghost',
                mode: 'icon',
                iconMode: 'with',
                textMode: 'without',
                className: 'modal-close-btn',
                onClick: onClose,
                'aria-label': closeLabel,
                title: closeLabel,
                children: jsx(X, { size: 16, strokeWidth: 1.8 }),
              }),
            ],
          }),
          jsx('div', { className: 'modal-body', children }),
        ],
      }),
    }),
    document.body,
  );
}
