import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { authClient } from '../lib/auth-client'
import { trpc } from '../lib/trpc'

export function GroupTripPopover() {
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [codeToJoin, setCodeToJoin] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)

  // États pour les confirmations
  const [showDeleteTripConfirm, setShowDeleteTripConfirm] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null)

  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowDeleteTripConfirm(false)
        setMemberToRemove(null)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Liste des voyages de groupe
  const { data: trips, isLoading: isLoadingTrips } = useQuery({
    ...trpc.group.getMyGroupTrips.queryOptions(),
    enabled: isOpen && !!session?.user,
  })

  const activeTrip = trips?.find((t) => t.id === selectedTripId) ?? trips?.[0] ?? null

  // Membres
  const { data: members, isLoading: isLoadingMembers } = useQuery({
    ...trpc.group.getGroupMembers.queryOptions({ tripId: activeTrip?.id ?? '' }),
    enabled: isOpen && !!activeTrip?.id,
  })

  // Création directe (reste dans le popover)
  const { mutate: createGroup, isPending: isCreating } = useMutation(
    trpc.group.createOrConvertGroupTrip.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: trpc.group.getMyGroupTrips.queryKey() })
        setSelectedTripId(data.tripId)
      },
    }),
  )

  // Régénération du code
  const { mutate: regenerateCode, isPending: isRegenerating } = useMutation(
    trpc.group.regenerateInviteCode.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.group.getMyGroupTrips.queryKey() })
      },
    }),
  )

  // Rejoindre via code
  const { mutate: joinWithCode, isPending: isJoining } = useMutation(
    trpc.group.joinGroupTrip.mutationOptions({
      onSuccess: (data) => {
        setCodeToJoin('')
        setJoinError(null)
        queryClient.invalidateQueries({ queryKey: trpc.group.getMyGroupTrips.queryKey() })
        setSelectedTripId(data.tripId)
      },
      onError: (err) => setJoinError(err.message),
    }),
  )

  // Retirer un membre
  const { mutate: removeMember, isPending: isRemovingMember } = useMutation(
    trpc.group.removeMember.mutationOptions({
      onSuccess: () => {
        setMemberToRemove(null)
        if (activeTrip) {
          queryClient.invalidateQueries({
            queryKey: trpc.group.getGroupMembers.queryKey({ tripId: activeTrip.id }),
          })
        }
      },
    }),
  )

  // Supprimer entièrement le voyage
  const { mutate: deleteTrip, isPending: isDeletingTrip } = useMutation(
    trpc.group.deleteGroupTrip.mutationOptions({
      onSuccess: () => {
        setShowDeleteTripConfirm(false)
        setSelectedTripId(null)
        queryClient.invalidateQueries({ queryKey: trpc.group.getMyGroupTrips.queryKey() })
      },
    }),
  )

  const isOwner = activeTrip?.role === 'owner'
  const isExpired = activeTrip?.inviteCodeExpiresAt
    ? new Date(activeTrip.inviteCodeExpiresAt) < new Date()
    : false

  const inviteUrl = activeTrip?.inviteCode
    ? `${window.location.origin}/join/${activeTrip.inviteCode}`
    : ''

  const handleCopy = () => {
    if (!inviteUrl || isExpired) return
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!codeToJoin.trim()) return
    joinWithCode({ inviteCode: codeToJoin.trim() })
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold transition active:scale-95 ${
          isOpen
            ? 'border-[#FF4D4D] bg-[#FF4D4D] text-white'
            : 'border-[#ded7cb] bg-white/70 text-[#1A1A1A] hover:bg-white'
        }`}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.999-3.199a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
          />
        </svg>
        <span className="hidden sm:inline">Groupes</span>
        {trips && trips.length > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1A1A1A] text-[9px] font-bold text-white">
            {trips.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-sm rounded-3xl border border-[#ded7cb] bg-white p-5 shadow-2xl sm:w-96 overflow-hidden">
          {/* ── Confirmation : Retrait d'un membre ── */}
          {memberToRemove && activeTrip && (
            <div className="absolute inset-0 z-30 flex flex-col justify-between bg-white p-6">
              <div className="my-auto text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-[#FF4D4D]">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-[#1a1a1a]">Retirer ce membre ?</h4>
                <p className="mt-1.5 text-xs text-[#888]">
                  Veux-tu vraiment retirer <span className="font-semibold text-[#1a1a1a]">{memberToRemove.name}</span> de ce voyage de groupe ?
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  disabled={isRemovingMember}
                  onClick={() => setMemberToRemove(null)}
                  className="flex-1 cursor-pointer rounded-xl border border-[#ddd] bg-white py-2.5 text-xs font-semibold text-[#1a1a1a] transition hover:bg-black/5"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isRemovingMember}
                  onClick={() => removeMember({ tripId: activeTrip.id, userId: memberToRemove.id })}
                  className="flex-1 cursor-pointer rounded-xl bg-[#FF4D4D] py-2.5 text-xs font-bold text-white shadow-sm shadow-red-500/25 transition hover:brightness-105 active:scale-95 disabled:opacity-50"
                >
                  {isRemovingMember ? 'Suppression…' : 'Retirer'}
                </button>
              </div>
            </div>
          )}

          {/* ── Confirmation : Suppression du voyage ── */}
          {showDeleteTripConfirm && activeTrip && (
            <div className="absolute inset-0 z-30 flex flex-col justify-between bg-white p-6">
              <div className="my-auto text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-[#FF4D4D]">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-[#1a1a1a]">Supprimer ce voyage ?</h4>
                <p className="mt-1.5 text-xs text-[#888]">
                  Cette action est irréversible. L'itinéraire et les accès pour tous les membres seront définitivement supprimés.
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  disabled={isDeletingTrip}
                  onClick={() => setShowDeleteTripConfirm(false)}
                  className="flex-1 cursor-pointer rounded-xl border border-[#ddd] bg-white py-2.5 text-xs font-semibold text-[#1a1a1a] transition hover:bg-black/5"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isDeletingTrip}
                  onClick={() => deleteTrip({ tripId: activeTrip.id })}
                  className="flex-1 cursor-pointer rounded-xl bg-[#FF4D4D] py-2.5 text-xs font-bold text-white shadow-sm shadow-red-500/25 transition hover:brightness-105 active:scale-95 disabled:opacity-50"
                >
                  {isDeletingTrip ? 'Suppression…' : 'Supprimer'}
                </button>
              </div>
            </div>
          )}

          {isLoadingTrips ? (
            <div className="space-y-3 py-6 text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#FF4D4D] border-t-transparent" />
              <p className="text-xs text-[#888]">Chargement…</p>
            </div>
          ) : !trips || trips.length === 0 ? (
            <div className="space-y-4 py-2">
              <div className="text-center">
                <h3 className="text-sm font-black text-[#1A1A1A]">Voyages de groupe</h3>
                <p className="mt-1 text-xs text-[#777]">
                  Crée un groupe ou rejoins un voyage existant avec un code d'invitation.
                </p>
              </div>

              <button
                type="button"
                disabled={isCreating}
                onClick={() => createGroup({})}
                className="w-full cursor-pointer rounded-2xl bg-[#FF4D4D] py-3 text-xs font-bold text-white shadow-md shadow-red-500/25 transition hover:brightness-105 active:scale-95 disabled:opacity-50"
              >
                {isCreating ? 'Création en cours…' : '+ Créer un voyage de groupe'}
              </button>

              <form onSubmit={handleJoinSubmit} className="border-t border-[#eee] pt-3">
                <label className="block text-[11px] font-semibold text-[#888] mb-1">
                  Rejoindre avec un code (8 caractères)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="Ex: aB3_9-Q1"
                    value={codeToJoin}
                    onChange={(e) => setCodeToJoin(e.target.value.trim())}
                    className="flex-1 rounded-xl border border-[#ddd] bg-[#F2EDE8] px-3 py-2 text-xs font-mono text-[#1A1A1A] outline-none focus:border-[#FF4D4D]"
                  />
                  <button
                    type="submit"
                    disabled={isJoining}
                    className="cursor-pointer rounded-xl bg-[#1A1A1A] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-black disabled:opacity-50"
                  >
                    {isJoining ? '…' : 'Rejoindre'}
                  </button>
                </div>
                {joinError && <p className="mt-1 text-[11px] text-[#FF4D4D]">{joinError}</p>}
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              {trips.length > 1 && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#888] mb-1">
                    Sélectionner un voyage
                  </label>
                  <select
                    value={activeTrip?.id}
                    onChange={(e) => setSelectedTripId(e.target.value)}
                    className="w-full rounded-xl border border-[#ddd] bg-[#F2EDE8] px-3 py-2 text-xs font-semibold text-[#1A1A1A] outline-none"
                  >
                    {trips.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.destination ?? 'Destination à définir'} ({t.role === 'owner' ? 'Hôte' : 'Membre'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeTrip && (
                <>
                  <div className="border-b border-[#eee] pb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#888]">
                      {activeTrip.role === 'owner' ? '★ Hôte' : 'Membre'}
                    </span>
                    <p className="text-sm font-black text-[#1A1A1A]">
                      {activeTrip.destination ?? 'Destination à définir'}
                    </p>
                  </div>

                  {/* Code & Lien d'invitation */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-[#888]">
                        Lien d'invitation ({activeTrip.inviteCode})
                      </label>
                      <span className={`text-[10px] font-bold ${isExpired ? 'text-[#FF4D4D]' : 'text-emerald-600'}`}>
                        {isExpired ? 'Expiré' : 'Valide 24 h'}
                      </span>
                    </div>

                    {!isExpired ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={inviteUrl}
                          className="flex-1 rounded-xl border border-[#ddd] bg-[#F2EDE8] px-3 py-2 text-xs text-[#1A1A1A] outline-none select-all"
                        />
                        <button
                          type="button"
                          onClick={handleCopy}
                          className="cursor-pointer rounded-xl bg-[#FF4D4D] px-3 py-2 text-xs font-bold text-white transition hover:brightness-105 active:scale-95"
                        >
                          {copied ? 'Copié !' : 'Copier'}
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-red-50 p-2 text-center text-xs text-[#FF4D4D] border border-red-100">
                        Ce code a expiré.
                      </div>
                    )}

                    {isOwner && (
                      <button
                        type="button"
                        disabled={isRegenerating}
                        onClick={() => regenerateCode({ tripId: activeTrip.id })}
                        className="mt-1.5 cursor-pointer text-[10px] font-bold text-[#888] underline hover:text-[#1A1A1A]"
                      >
                        {isRegenerating ? 'Régénération…' : '↻ Régénérer un nouveau code'}
                      </button>
                    )}
                  </div>

                  {/* Participants avec demande de confirmation au clic */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#888]">Participants</span>
                      <span className="text-[11px] font-bold text-[#1A1A1A]">
                        {members?.length ?? 1} membre{(members?.length ?? 1) > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="max-h-36 space-y-1.5 overflow-y-auto pr-1">
                      {isLoadingMembers ? (
                        <div className="h-8 animate-pulse rounded-xl bg-[#F2EDE8]" />
                      ) : (
                        members?.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between rounded-xl bg-[#F2EDE8]/60 px-3 py-1.5 text-xs"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1A1A1A] text-[10px] font-bold uppercase text-white">
                                {member.name?.[0] || member.email[0]}
                              </div>
                              <span className="truncate font-medium text-[#1A1A1A]">
                                {member.name || member.email}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {member.role === 'owner' ? (
                                <span className="rounded-full bg-[#FF4D4D]/15 px-2 py-0.5 text-[10px] font-bold text-[#FF4D4D]">
                                  Hôte
                                </span>
                              ) : isOwner ? (
                                <button
                                  type="button"
                                  title="Retirer du groupe"
                                  onClick={() =>
                                    setMemberToRemove({
                                      id: member.id,
                                      name: member.name || member.email,
                                    })
                                  }
                                  className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-[#888] transition hover:bg-red-100 hover:text-[#FF4D4D]"
                                >
                                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              ) : (
                                <span className="text-[10px] text-[#888]">Membre</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Formulaire pour rejoindre via code */}
              <form onSubmit={handleJoinSubmit} className="border-t border-[#eee] pt-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="Code à 8 caractères…"
                    value={codeToJoin}
                    onChange={(e) => setCodeToJoin(e.target.value.trim())}
                    className="flex-1 rounded-xl border border-[#ddd] bg-[#F2EDE8] px-3 py-1.5 text-xs font-mono text-[#1A1A1A] outline-none focus:border-[#FF4D4D]"
                  />
                  <button
                    type="submit"
                    disabled={isJoining}
                    className="cursor-pointer rounded-xl bg-[#1A1A1A] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-black disabled:opacity-50"
                  >
                    {isJoining ? '…' : 'OK'}
                  </button>
                </div>
                {joinError && <p className="mt-1 text-[11px] text-[#FF4D4D]">{joinError}</p>}
              </form>

              {/* Actions de bas de popover */}
              <div className="space-y-2 border-t border-[#eee] pt-2 text-center">
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={() => createGroup({})}
                  className="cursor-pointer text-[11px] font-semibold text-[#888] transition hover:text-[#FF4D4D]"
                >
                  {isCreating ? 'Création…' : '+ Nouveau voyage de groupe'}
                </button>

                {isOwner && activeTrip && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowDeleteTripConfirm(true)}
                      className="cursor-pointer text-[10px] font-semibold text-red-500 hover:text-red-700 transition"
                    >
                      Supprimer ce voyage de groupe
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}