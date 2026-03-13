import { type ReactNode, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';
import './Modal.css';

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
    if (!open || !closeOnEscape) return;

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
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={['modal-backdrop', className].filter(Boolean).join(' ')}
      onClick={closeOnOverlayClick ? onClose : undefined}
      aria-hidden="true"
    >
      <section
        className={['modal-panel', panelClassName].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={ariaLabel}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          {title ? (
            <h2 id={titleId} className="modal-title">
              {title}
            </h2>
          ) : (
            <span className="modal-title-spacer" />
          )}
          <Button
            type="button"
            variant="ghost"
            mode="icon"
            iconMode="with"
            textMode="without"
            className="modal-close-btn"
            onClick={onClose}
            aria-label={closeLabel}
            title={closeLabel}
          >
            <X size={16} strokeWidth={1.8} />
          </Button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>,
    document.body,
  );
}
