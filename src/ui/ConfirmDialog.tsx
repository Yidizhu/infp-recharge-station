import { useEffect, useRef } from 'react';

export interface Confirmation { title: string; message: string; values?: Record<string, string | number>; action: string; accept: () => void }
export default function ConfirmDialog({ confirmation, close, cancelLabel }: { confirmation: Confirmation; close: () => void; cancelLabel: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  return <dialog className="charge-dialog" ref={ref} aria-labelledby="confirm-title" aria-describedby="confirm-description" onCancel={close}>
    <h2 id="confirm-title">{confirmation.title}</h2>
    <p id="confirm-description">{confirmation.message}</p>
    <div className="charge-actions">
      <button autoFocus onClick={close}>{cancelLabel}</button>
      <button className="primary" onClick={() => { confirmation.accept(); close(); }}>{confirmation.action}</button>
    </div>
  </dialog>;
}
