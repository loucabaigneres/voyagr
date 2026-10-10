import { Loader2 } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';

/**
 * Petite boîte de confirmation dans la DA du projet (overlay flouté, carte beige
 * arrondie, accent rouge). Remplace `window.confirm` pour les actions destructives.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Supprimer',
  cancelLabel = 'Annuler',
  loading = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onCancel, loading]);

  return (
    <div
      className={`fixed inset-0 z-[2100] flex items-end justify-center bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 sm:items-center sm:p-6 ${
        shown ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={() => !loading && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-[380px] rounded-t-[28px] bg-[#F2EDE8] p-6 shadow-2xl transition-transform duration-300 ease-out sm:rounded-[28px]"
        style={{ transform: shown ? 'translateY(0)' : 'translateY(48px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-extrabold text-[#1a1a1a]">
          {title}
        </h2>
        {message && <p className="mt-2 text-sm leading-relaxed text-[#555]">{message}</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 cursor-pointer rounded-2xl border border-[#ddd] bg-white px-4 py-3 text-sm font-semibold text-[#555] transition hover:border-[#1a1a1a]/20 active:scale-95 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            autoFocus
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#FF4D4D] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/25 transition hover:brightness-105 active:scale-95 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
