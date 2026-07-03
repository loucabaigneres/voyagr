import { authClient } from '#/lib/auth-client'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    if (session?.user) throw redirect({ to: '/discovery' })
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await authClient.signIn.email({ email, password })
    setLoading(false)
    if (result.error) {
      setError(result.error.message ?? 'Email ou mot de passe incorrect.')
    } else {
      void navigate({ to: '/discovery' })
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-[#0f0f13] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#e8e8f0]">
            ✈ Swipe<span className="text-[#6c63ff]">Travel</span>
          </h1>
          <p className="mt-2 text-sm text-[#9a9ac0]">Connecte-toi pour continuer</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#1b1b27] p-7 shadow-xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#9a9ac0]">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="toi@exemple.com"
                className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-[#e8e8f0] placeholder-[#6f6f8f] outline-none transition focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#9a9ac0]">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-[#e8e8f0] placeholder-[#6f6f8f] outline-none transition focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff]"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-[rgba(231,76,60,.3)] bg-[rgba(231,76,60,.1)] px-3 py-2 text-xs text-[#e74c3c]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 h-10 rounded-lg bg-[#6c63ff] text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-[#9a9ac0]">
            Pas encore de compte ?{' '}
            <Link to="/register" className="font-semibold text-[#a78bfa] hover:underline">
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
