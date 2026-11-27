import { useEffect, useId, useRef, type ReactNode } from 'react';

interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel: string;
  /** Styles the confirm button as destructive. */
  danger?: boolean;
  /** Extra content between the body and the buttons (a picker, for example). */
  children?: ReactNode;
  /** Disables the confirm button, e.g. until something is picked. */
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A yes/no question over the screen. Cancel has focus first; Escape cancels. */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  danger = false,
  children,
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Handled here, so the global back action doesn't also fire.
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key !== 'Tab' || !boxRef.current) return;
      const buttons = [...boxRef.current.querySelectorAll<HTMLElement>('button')];
      const first = buttons[0];
      const last = buttons.at(-1);
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener?.isConnected) opener.focus();
    };
  }, [onCancel]);

  return (
    <div className="overlay confirm-overlay">
      <div
        className="result confirm"
        ref={boxRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
      >
        <h2 id={titleId}>{title}</h2>
        <p id={bodyId} className="muted">
          {body}
        </p>
        {children}
        <div className="confirm-actions">
          <button type="button" className="btn" ref={cancelRef} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
