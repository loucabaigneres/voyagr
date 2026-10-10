import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { useTRPC } from '#/integrations/trpc/react'
import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    if (!session?.user) throw redirect({ to: '/login' })
    if ((session.user as { role?: string }).role !== 'admin') {
      throw redirect({ to: '/discovery' })
    }
  },
  component: AdminPage,
})

function AdminPage() {
  const trpc = useTRPC()
  const qc = useQueryClient()

  const usersQuery = useQuery(trpc.admin.listUsers.queryOptions())
  const users = usersQuery.data ?? []

  const setRole = useMutation({
    ...trpc.admin.setRole.mutationOptions(),
    onSuccess: () => qc.invalidateQueries(trpc.admin.listUsers.queryOptions()),
  })

  const banUser = useMutation({
    ...trpc.admin.banUser.mutationOptions(),
    onSuccess: () => qc.invalidateQueries(trpc.admin.listUsers.queryOptions()),
  })

  const unbanUser = useMutation({
    ...trpc.admin.unbanUser.mutationOptions(),
    onSuccess: () => qc.invalidateQueries(trpc.admin.listUsers.queryOptions()),
  })

  const [banReason, setBanReason] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? users.filter(
        (u) =>
          u.name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase()),
      )
    : users

  const adminCount = users.filter((u) => u.role === 'admin').length
  const bannedCount = users.filter((u) => u.banned).length

  return (
    <div className="min-h-screen bg-[#0f0f13] text-[#e8e8f0]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">
            🛡️ Admin<span className="text-[#6c63ff]">Panel</span>
          </h1>
          <p className="mt-1 text-sm text-[#9a9ac0]">Gestion des utilisateurs Voyagr</p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <StatCard value={users.length} label="Utilisateurs" icon="👥" />
          <StatCard value={adminCount} label="Admins" icon="🛡️" color="purple" />
          <StatCard value={bannedCount} label="Bannis" icon="🚫" color="red" />
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#1b1b27]">
          <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/10">
            <h2 className="font-semibold">
              Utilisateurs ({filtered.length}
              {search && users.length !== filtered.length && (
                <span className="text-[#9a9ac0] font-normal"> / {users.length}</span>
              )}
              )
            </h2>
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6f6f8f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Nom ou email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-52 rounded-lg border border-white/10 bg-white/5 pl-8 pr-3 text-xs text-[#e8e8f0] placeholder-[#6f6f8f] outline-none transition focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff]"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6f6f8f] hover:text-[#e8e8f0] transition"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {usersQuery.isLoading && (
            <div className="px-6 py-10 text-center text-[#9a9ac0]">Chargement…</div>
          )}
          {usersQuery.isError && (
            <div className="px-6 py-10 text-center text-[#e74c3c]">
              Erreur de chargement — êtes-vous bien connecté en tant qu'admin ?
            </div>
          )}

          {!usersQuery.isLoading && filtered.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-[#9a9ac0]">
              Aucun utilisateur ne correspond à « {search} »
            </div>
          )}
          {!usersQuery.isLoading && filtered.length > 0 && (
            <div className="divide-y divide-white/[.06]">
              {filtered.map((u) => (
                <div key={u.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Identity */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#2a2a3e] text-sm font-bold text-[#a78bfa]">
                      {u.name?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{u.name}</span>
                        <RoleBadge role={u.role} />
                        {u.banned && (
                          <span className="rounded-full bg-[rgba(231,76,60,.15)] px-2 py-0.5 text-[0.65rem] font-semibold text-[#e74c3c] border border-[rgba(231,76,60,.3)]">
                            🚫 banni
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#9a9ac0] truncate">{u.email}</div>
                      {u.banned && u.banReason && (
                        <div className="text-xs text-[#e74c3c] mt-0.5">Raison : {u.banReason}</div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    {/* Role toggle */}
                    {u.role === 'traveler' ? (
                      <ActionBtn
                        onClick={() => setRole.mutate({ userId: u.id, role: 'admin' })}
                        disabled={setRole.isPending}
                        variant="purple"
                      >
                        ↑ Passer admin
                      </ActionBtn>
                    ) : (
                      <ActionBtn
                        onClick={() => setRole.mutate({ userId: u.id, role: 'traveler' })}
                        disabled={setRole.isPending}
                        variant="ghost"
                      >
                        ↓ Rétrograder
                      </ActionBtn>
                    )}

                    {/* Ban / unban */}
                    {u.banned ? (
                      <ActionBtn
                        onClick={() => unbanUser.mutate({ userId: u.id })}
                        disabled={unbanUser.isPending}
                        variant="green"
                      >
                        ✓ Débannir
                      </ActionBtn>
                    ) : (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Raison (optionnel)"
                          value={banReason[u.id] ?? ''}
                          onChange={(e) =>
                            setBanReason((prev) => ({ ...prev, [u.id]: e.target.value }))
                          }
                          className="h-8 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs text-[#e8e8f0] placeholder-[#6f6f8f] outline-none focus:border-[#6c63ff] w-36"
                        />
                        <ActionBtn
                          onClick={() => {
                            banUser.mutate({ userId: u.id, reason: banReason[u.id] || undefined })
                            setBanReason((prev) => ({ ...prev, [u.id]: '' }))
                          }}
                          disabled={banUser.isPending}
                          variant="red"
                        >
                          🚫 Bannir
                        </ActionBtn>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  value,
  label,
  icon,
  color = 'default',
}: {
  value: number
  label: string
  icon: string
  color?: 'default' | 'purple' | 'red'
}) {
  const border =
    color === 'purple'
      ? 'border-[rgba(108,99,255,.25)]'
      : color === 'red'
        ? 'border-[rgba(231,76,60,.25)]'
        : 'border-white/10'
  const text =
    color === 'purple'
      ? 'text-[#a78bfa]'
      : color === 'red'
        ? 'text-[#e74c3c]'
        : 'text-[#e8e8f0]'

  return (
    <div className={`rounded-2xl border ${border} bg-[#1b1b27] px-5 py-4`}>
      <div className="text-2xl">{icon}</div>
      <div className={`mt-2 text-3xl font-extrabold ${text}`}>{value}</div>
      <div className="mt-0.5 text-xs text-[#9a9ac0]">{label}</div>
    </div>
  )
}

function RoleBadge({ role }: { role: string | null }) {
  if (role === 'admin') {
    return (
      <span className="rounded-full border border-[rgba(108,99,255,.35)] bg-[rgba(108,99,255,.15)] px-2 py-0.5 text-[0.65rem] font-semibold text-[#a78bfa]">
        admin
      </span>
    )
  }
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.65rem] text-[#9a9ac0]">
      traveler
    </span>
  )
}

function ActionBtn({
  children,
  onClick,
  disabled,
  variant,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  variant: 'purple' | 'red' | 'green' | 'ghost'
}) {
  const styles = {
    purple: 'border-[rgba(108,99,255,.35)] bg-[rgba(108,99,255,.15)] text-[#a78bfa] hover:bg-[rgba(108,99,255,.25)]',
    red: 'border-[rgba(231,76,60,.35)] bg-[rgba(231,76,60,.12)] text-[#e74c3c] hover:bg-[rgba(231,76,60,.2)]',
    green: 'border-[rgba(46,204,113,.35)] bg-[rgba(46,204,113,.12)] text-[#2ecc71] hover:bg-[rgba(46,204,113,.2)]',
    ghost: 'border-white/10 bg-white/5 text-[#9a9ac0] hover:bg-white/10',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`h-8 rounded-lg border px-3 text-xs font-semibold transition disabled:opacity-40 ${styles[variant]}`}
    >
      {children}
    </button>
  )
}
