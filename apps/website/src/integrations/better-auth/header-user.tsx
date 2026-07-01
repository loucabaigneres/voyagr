import { authClient } from '#/lib/auth-client'
import { Link, useNavigate } from '@tanstack/react-router'
import { useRef } from 'react'

export default function BetterAuthHeader() {
  const { data: session, isPending } = authClient.useSession()
  const navigate = useNavigate()
  const detailsRef = useRef<HTMLDetailsElement>(null)

  if (isPending) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
  }

  if (session?.user) {
    const { name, email, image } = session.user
    const initial = name?.charAt(0).toUpperCase() ?? email?.charAt(0).toUpperCase() ?? 'U'

    const close = () => {
      if (detailsRef.current) detailsRef.current.open = false
    }

    return (
      <details ref={detailsRef} className="relative">
        <summary className="list-none cursor-pointer">
          {image ? (
            <img
              src={image}
              alt={name ?? 'Avatar'}
              className="h-8 w-8 rounded-full object-cover ring-2 ring-[#6c63ff]/40 hover:ring-[#6c63ff] transition"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-[#6c63ff] flex items-center justify-center ring-2 ring-[#6c63ff]/40 hover:ring-[#6c63ff] transition">
              <span className="text-xs font-semibold text-white">{initial}</span>
            </div>
          )}
        </summary>

        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[var(--line)] bg-[var(--header-bg)] p-2 shadow-xl z-50 backdrop-blur-sm">
          {/* Infos utilisateur */}
          <div className="px-3 py-2 mb-1 border-b border-[var(--line)]">
            <p className="text-sm font-semibold text-[var(--sea-ink)] truncate">{name}</p>
            <p className="text-xs text-[var(--sea-ink-soft)] truncate">{email}</p>
          </div>

          {/* Liens */}
          <Link
            to="/account"
            onClick={close}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--sea-ink-soft)] no-underline transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
            Mon Compte
          </Link>

          <button
            onClick={async () => {
              close()
              await authClient.signOut()
              void navigate({ to: '/' })
            }}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Se déconnecter
          </button>
        </div>
      </details>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        to="/login"
        className="h-9 px-4 text-sm font-medium bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors inline-flex items-center rounded-lg"
      >
        Connexion
      </Link>
      <Link
        to="/register"
        className="h-9 px-4 text-sm font-medium bg-[#6c63ff] text-white hover:bg-[#5b52e8] transition-colors inline-flex items-center rounded-lg"
      >
        S'inscrire
      </Link>
    </div>
  )
}
