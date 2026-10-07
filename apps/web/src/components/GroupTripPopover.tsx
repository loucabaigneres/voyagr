import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
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
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const { data: trips, isLoading: isLoadingTrips } = useQuery({
    ...trpc.group.getMyGroupTrips.queryOptions(),
    enabled: isOpen && !!session?.user,
  })

  const activeTrip = trips?.find((t) => t.id === selectedTripId) ?? trips?.[0] ?? null

  const { data: members, isLoading: isLoadingMembers } = useQuery({
    ...trpc.group.getGroupMembers.queryOptions({
      tripId: activeTrip?.id ?? '',
    }),
    enabled: isOpen && !!activeTrip?.id,
  })

  const { mutate: createGroup, isPending: isCreating } = useMutation(
    trpc.group.createGroupTrip.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: trpc.group.getMyGroupTrips.queryKey(),
        })
        setSelectedTripId(data.tripId)
      },
    }),
  )

  const { mutate: joinWithCode, isPending: isJoining } = useMutation(
    trpc.group.joinGroupTrip.mutationOptions({
      onSuccess: (data) => {
        setCodeToJoin('')
        setJoinError(null)
        queryClient.invalidateQueries({
          queryKey: trpc.group.getMyGroupTrips.queryKey(),
        })
        setSelectedTripId(data.tripId)
      },
      onError: (err) => {
        setJoinError(err.message)
      },
    }),
  )

  const { mutate: removeMember } = useMutation(
    trpc.group.removeMember.mutationOptions({
      onSuccess: () => {
        if (activeTrip) {
          queryClient.invalidateQueries({
            queryKey: trpc.group.getGroupMembers.queryKey({ tripId: activeTrip.id }),
          })
        }
      },
    }),
  )

  const isOwner = activeTrip?.role === 'owner'
  const inviteUrl = activeTrip?.inviteCode
    ? `${window.location.origin}/join/${activeTrip.inviteCode}`
    : ''

  const handleCopy = () => {
    if (!inviteUrl) return
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
        <div className="absolute right-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-sm rounded-3xl border border-[#ded7cb] bg-white p-5 shadow-2xl sm:w-96">
          {isLoadingTrips ? (
            <div className="space-y-3 py-6 text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#FF4D4D] border-t-transparent" />
              <p className="text-xs text-[#888]">Chargement de tes voyages…</p>
            </div>
          ) : !trips || trips.length === 0 ? (
            <div className="space-y-4 py-2">
              <div className="text-center">
                <h3 className="text-sm font-black text-[#1A1A1A]">Voyages de groupe</h3>
                <p className="mt-1 text-xs text-[#777]">
                  Crée ton groupe ou rejoins un voyage existant avec un code.
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
                  Rejoindre avec un code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: 9A4F2B1C"
                    value={codeToJoin}
                    onChange={(e) => setCodeToJoin(e.target.value.toUpperCase())}
                    className="flex-1 rounded-xl border border-[#ddd] bg-[#F2EDE8] px-3 py-2 text-xs font-mono uppercase text-[#1A1A1A] outline-none focus:border-[#FF4D4D]"
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
                        {t.destination || 'Aventure'} ({t.role === 'owner' ? 'Hôte' : 'Membre'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeTrip && (
                <>
                  <div className="flex items-center justify-between border-b border-[#eee] pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#888]">
                        {activeTrip.role === 'owner' ? '★ Organisateur' : 'Membre'}
                      </span>
                      <p className="text-sm font-black text-[#1A1A1A]">
                        {activeTrip.destination || 'Nouvelle aventure'}
                      </p>
                    </div>
                    <Link
                      to="/discovery"
                      search={{ tripId: activeTrip.id }}
                      onClick={() => setIsOpen(false)}
                      className="rounded-full bg-[#1A1A1A] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-black"
                    >
                      Swiper
                    </Link>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#888] mb-1">
                      Lien d'invitation (Code : {activeTrip.inviteCode})
                    </label>
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
                  </div>

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
                                    removeMember({
                                      tripId: activeTrip.id,
                                      userId: member.id,
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

              <form onSubmit={handleJoinSubmit} className="border-t border-[#eee] pt-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Rejoindre via code…"
                    value={codeToJoin}
                    onChange={(e) => setCodeToJoin(e.target.value.toUpperCase())}
                    className="flex-1 rounded-xl border border-[#ddd] bg-[#F2EDE8] px-3 py-1.5 text-xs font-mono uppercase text-[#1A1A1A] outline-none focus:border-[#FF4D4D]"
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

              <div className="border-t border-[#eee] pt-2 text-center">
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={() => createGroup({})}
                  className="cursor-pointer text-[11px] font-semibold text-[#888] transition hover:text-[#FF4D4D]"
                >
                  {isCreating ? 'Création…' : '+ Créer un autre voyage de groupe'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}