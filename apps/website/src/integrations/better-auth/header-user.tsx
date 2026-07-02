import { authClient } from '#/lib/auth-client'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

export default function BetterAuthHeader() {
  const { data: session, isPending } = authClient.useSession()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (isPending) {
    return <div className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          to="/login"
          className="h-9 px-4 text-sm font-medium rounded-lg border border-[rgba(108,99,255,.4)] bg-[rgba(108,99,255,.15)] text-[#a78bfa] hover:bg-[rgba(108,99,255,.25)] transition-colors inline-flex items-center"
        >
          Se connecter
        </Link>
        <Link
          to="/register"
          className="h-9 px-4 text-sm font-medium rounded-lg bg-[#6c63ff] text-white hover:brightness-110 transition inline-flex items-center"
        >
          S'inscrire
        </Link>
      </div>
    )
  }

  const user = session.user as { name?: string; email?: string; image?: string; role?: string }
  const isAdmin = user.role === 'admin'
  const initial = user.name?.charAt(0).toUpperCase() ?? 'U'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-[#1b1b27] px-2 py-1 transition hover:border-[#6c63ff]/40"
      >
        {user.image ? (
          <img src={user.image} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6c63ff]/20 text-xs font-bold text-[#a78bfa]">
            {initial}
          </div>
        )}
        <span className="max-w-[100px] truncate text-sm font-medium text-[#e8e8f0]">
          {user.name}
        </span>
        <svg
          className={`h-3.5 w-3.5 text-[#9a9ac0] transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-[#1b1b27] py-1 shadow-xl z-50">
          <div className="border-b border-white/10 px-4 py-2.5">
            <p className="truncate text-xs font-semibold text-[#e8e8f0]">{user.name}</p>
            <p className="truncate text-[0.7rem] text-[#9a9ac0]">{user.email}</p>
            {isAdmin && (
              <span className="mt-1 inline-block rounded-full border border-[rgba(108,99,255,.35)] bg-[rgba(108,99,255,.15)] px-2 py-0.5 text-[0.6rem] font-semibold text-[#a78bfa]">
                admin
              </span>
            )}
          </div>

          <Link
            to="/discovery"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#e8e8f0] hover:bg-white/5 transition"
          >
            ✈ Découvrir
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#a78bfa] hover:bg-white/5 transition"
            >
              🛡️ Panel admin
            </Link>
          )}

          <div className="border-t border-white/10 mt-1 pt-1">
            <button
              onClick={async () => {
                setOpen(false)
                await authClient.signOut()
                void navigate({ to: '/login' })
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-[#e74c3c] hover:bg-white/5 transition"
            >
              ← Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
