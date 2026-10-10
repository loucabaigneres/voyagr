import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/account')({ component: AccountPage })

function AccountPage() {
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    if (!isPending && !session?.user) void navigate({ to: '/login' })
  }, [session, isPending, navigate])

  if (isPending || !session?.user) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-[#0f0f13]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#6c63ff]/30 border-t-[#6c63ff]" />
      </div>
    )
  }

  const { name, email, image, emailVerified } = session.user
  const initial = name?.charAt(0).toUpperCase() ?? email?.charAt(0).toUpperCase() ?? 'U'

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] bg-[#0f0f13] px-4 py-12 text-[#e8e8f0]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(50rem 40rem at 80% 0%, rgba(108,99,255,.12), transparent 60%)',
        }}
      />

      <div className="mx-auto max-w-lg">
        <h1 className="mb-8 text-2xl font-extrabold tracking-tight">Mon Compte</h1>

        {/* Carte profil */}
        <div className="rounded-2xl border border-white/8 bg-white/4 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            {image ? (
              <img src={image} alt={name ?? ''} className="h-16 w-16 rounded-full object-cover ring-2 ring-[#6c63ff]/40" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#6c63ff] text-xl font-bold text-white ring-2 ring-[#6c63ff]/40">
                {initial}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-lg font-bold">{name}</p>
              <p className="truncate text-sm text-[#9a9ac0]">{email}</p>
              {emailVerified && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#2ecc71]/10 px-2 py-0.5 text-[10px] font-semibold text-[#2ecc71]">
                  ✓ Email vérifié
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Méthodes de connexion */}
        <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#9a9ac0]">
            Méthodes de connexion
          </h2>
          <ConnectedProviders />
        </div>

        {/* Actions */}
        <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#9a9ac0]">
            Actions
          </h2>
          <div className="flex flex-col gap-2">
            <Link
              to="/discovery"
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium transition hover:bg-white/10"
            >
              ✈ Découvrir des destinations
            </Link>
            <button
              onClick={async () => {
                await authClient.signOut()
                void navigate({ to: '/' })
              }}
              className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

type Account = { provider: string; providerId?: string; [key: string]: unknown }

function ConnectedProviders() {
  const [accounts, setAccounts] = useState<Account[] | null>(null)

  useEffect(() => {
    authClient.listAccounts().then((res) => {
      if ('data' in res && res.data) setAccounts(res.data as unknown as Account[])
    })
  }, [])

  if (!accounts) {
    return <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
  }

  const providers: Record<string, { label: string; icon: React.ReactNode }> = {
    credential: {
      label: 'Email / Mot de passe',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
        </svg>
      ),
    },
    google: {
      label: 'Google',
      icon: (
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.96L3.964 7.292C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
      ),
    },
    apple: {
      label: 'Apple',
      icon: (
        <svg width="16" height="16" viewBox="0 0 814 1000" fill="currentColor" aria-hidden>
          <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 43.4 0 111.9-49 192.3-49 30.8 0 108.2 2.6 168.6 71.2zm-174.5-370.7c33.7-40.3 57.8-96.2 57.8-151.4 0-7.7-.6-15.5-2-22.5-54.5 2-119.3 36.3-158.6 81.9-30.8 35.7-61 91.6-61 148.4 0 8.4 1.3 16.8 1.9 19.4 3.2.6 8.4 1.3 13.6 1.3 49.1 0 110.8-32.5 148.3-76.9z"/>
        </svg>
      ),
    },
  }

  return (
    <div className="flex flex-col gap-2">
      {accounts.map((account: Account) => {
        const provider = providers[account.provider] ?? { label: account.provider, icon: '🔗' }
        return (
          <div
            key={account.provider}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
          >
            <span className="text-[#9a9ac0]">{provider.icon}</span>
            <span className="text-sm font-medium">{provider.label}</span>
            <span className="ml-auto rounded-full bg-[#2ecc71]/10 px-2 py-0.5 text-[10px] font-semibold text-[#2ecc71]">
              Connecté
            </span>
          </div>
        )
      })}
    </div>
  )
}
