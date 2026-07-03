import { authClient } from '#/lib/auth-client'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/register')({ component: RegisterPage })

function RegisterPage() {
  const navigate = useNavigate()
  const { data: session, isPending: sessionPending } = authClient.useSession()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null)

  useEffect(() => {
    if (session?.user) void navigate({ to: '/discovery' })
  }, [session, navigate])

  if (sessionPending) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-[#0f0f13]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#6c63ff]/30 border-t-[#6c63ff]" />
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await authClient.signUp.email({ name, email, password })
      if (result.error) {
        setError(result.error.message ?? "Échec de l'inscription")
      } else {
        void navigate({ to: '/discovery' })
      }
    } catch {
      setError('Une erreur inattendue est survenue')
    } finally {
      setLoading(false)
    }
  }

  const handleSocial = async (provider: 'google' | 'apple') => {
    setSocialLoading(provider)
    try {
      await authClient.signIn.social({ provider, callbackURL: '/discovery' })
    } catch {
      setError(`Connexion via ${provider} indisponible`)
      setSocialLoading(null)
    }
  }

  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-[#0f0f13] px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(50rem 40rem at 80% 0%, rgba(108,99,255,.15), transparent 60%), radial-gradient(40rem 30rem at 20% 100%, rgba(167,139,250,.10), transparent 55%)',
        }}
      />

      <div className="w-full max-w-md">
        {/* Logo / titre */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#e8e8f0]">
            ✈ Swipe<span className="text-[#6c63ff]">Travel</span>
          </h1>
          <p className="mt-2 text-sm text-[#9a9ac0]">Crée ton compte et commence à swiper</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/8 bg-white/4 p-8 backdrop-blur-sm">
          <h2 className="mb-6 text-lg font-bold text-[#e8e8f0]">Inscription</h2>

          {/* Social buttons */}
          <div className="mb-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => handleSocial('google')}
              disabled={!!socialLoading || loading}
              className="flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-[#e8e8f0] transition hover:bg-white/10 disabled:opacity-50"
            >
              {socialLoading === 'google' ? <Spinner /> : <GoogleIcon />}
              Continuer avec Google
            </button>
            <button
              type="button"
              onClick={() => handleSocial('apple')}
              disabled={!!socialLoading || loading}
              className="flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-[#e8e8f0] transition hover:bg-white/10 disabled:opacity-50"
            >
              {socialLoading === 'apple' ? <Spinner /> : <AppleIcon />}
              Continuer avec Apple
            </button>
          </div>

          {/* Divider */}
          <div className="mb-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-[#9a9ac0]">ou</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-[#9a9ac0]">
                Nom
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jean Dupont"
                required
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-[#e8e8f0] placeholder-[#9a9ac0]/60 outline-none transition focus:border-[#6c63ff]/60 focus:bg-white/8"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-[#9a9ac0]">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="toi@exemple.com"
                required
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-[#e8e8f0] placeholder-[#9a9ac0]/60 outline-none transition focus:border-[#6c63ff]/60 focus:bg-white/8"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-[#9a9ac0]">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-[#e8e8f0] placeholder-[#9a9ac0]/60 outline-none transition focus:border-[#6c63ff]/60 focus:bg-white/8"
              />
              <p className="text-[11px] text-[#9a9ac0]/70">Minimum 8 caractères</p>
            </div>

            {error && (
              <p className="rounded-xl border border-[#e74c3c]/30 bg-[#e74c3c]/10 px-4 py-2.5 text-xs text-[#e74c3c]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !!socialLoading}
              className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-[#6c63ff] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5b52e8] disabled:opacity-60"
            >
              {loading ? <><Spinner /> Création…</> : 'Créer mon compte'}
            </button>
          </form>
        </div>

        {/* Lien connexion */}
        <p className="mt-5 text-center text-sm text-[#9a9ac0]">
          Déjà un compte ?{' '}
          <Link to="/login" className="font-semibold text-[#a9a2ff] hover:text-[#6c63ff]">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.96L3.964 7.292C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor" aria-hidden>
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 43.4 0 111.9-49 192.3-49 30.8 0 108.2 2.6 168.6 71.2zm-174.5-370.7c33.7-40.3 57.8-96.2 57.8-151.4 0-7.7-.6-15.5-2-22.5-54.5 2-119.3 36.3-158.6 81.9-30.8 35.7-61 91.6-61 148.4 0 8.4 1.3 16.8 1.9 19.4 3.2.6 8.4 1.3 13.6 1.3 49.1 0 110.8-32.5 148.3-76.9z"/>
    </svg>
  )
}
