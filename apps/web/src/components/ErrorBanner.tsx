interface ErrorBannerProps {
  message: string
  onRetry?: () => void
  onDismiss?: () => void
  retrying?: boolean
  className?: string
}

export function ErrorBanner({ message, onRetry, onDismiss, retrying, className }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-2xl border border-[rgba(255,77,77,.25)] bg-[rgba(255,77,77,.07)] p-3.5 ${className ?? ''}`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF4D4D] text-white">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" d="M12 7v6M12 17h.01" />
        </svg>
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium leading-snug text-[#1a1a1a]">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="mt-2 cursor-pointer rounded-full border border-[#FF4D4D] bg-white px-3.5 py-1 text-xs font-semibold text-[#FF4D4D] transition hover:bg-[#FF4D4D] hover:text-white active:scale-95 disabled:opacity-50"
          >
            {retrying ? 'Nouvelle tentative…' : 'Réessayer'}
          </button>
        )}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fermer"
          className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#888] transition hover:bg-white hover:text-[#1a1a1a]"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
