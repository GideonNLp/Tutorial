import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { strings } from '../i18n';

/**
 * Modal dialog built on the native <dialog>: the browser traps focus, makes the page behind inert
 * and closes on Escape. Shown as a bottom sheet on phones and a centred dialog on wide screens.
 */
export function Sheet(props: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const { open, onClose } = props;
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // a click on the backdrop
      }}
    >
      {open && (
        <>
          <div className="sheet-head">
            <h2 id={titleId}>{props.title}</h2>
            <button type="button" className="icon-btn" aria-label={strings().common.close} onClick={onClose}>
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          <div className="sheet-body">{props.children}</div>
        </>
      )}
    </dialog>
  );
}

/** Confirmation step for actions that cannot be undone. (Browser confirm() is not shown in some hosts.) */
export function ConfirmSheet(props: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet open={props.open} onClose={props.onCancel} title={props.title}>
      <p>{props.body}</p>
      <div className="sheet-actions">
        <button type="button" className="btn btn-secondary" onClick={props.onCancel}>
          {strings().common.cancel}
        </button>
        <button type="button" className={props.danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={props.onConfirm}>
          {props.confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
