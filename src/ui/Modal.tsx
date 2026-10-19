import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

export function Modal({ title, onClose, children, wide = false, className = '', labelledBy }: {
  title?: ReactNode;
  onClose?: () => void;
  children: ReactNode;
  wide?: boolean;
  className?: string;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div ref={ref} className={`modal${wide ? ' modal--wide' : ''} ${className}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1}>
        {(title || onClose) && (
          <div className="modal__head">
            {title ? <h2 className="modal__title" id={labelledBy}>{title}</h2> : <span />}
            {onClose && (
              <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
                <Icon name="close" />
              </button>
            )}
          </div>
        )}
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
