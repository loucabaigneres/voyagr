import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useId, useState } from 'react'

import { trpc } from '../lib/trpc.js'

const CATEGORY_META: Record<string, { emoji: string; noun: string; color: string }> = {
  hotel:      { emoji: '🏨', noun: 'un autre hébergement', color: 'rgba(255,77,77,.12)' },
  'activité': { emoji: '🗺️', noun: 'une autre activité',   color: 'rgba(46,204,113,.12)' },
  restaurant: { emoji: '🍽️', noun: 'un autre restaurant',  color: 'rgba(255,160,60,.14)' },
}

type Place = { id: string; title: string; category: string | null }

/**
 * Bottom sheet (dialog on desktop) listing the places that can replace one of
 * the planning. Picking one saves immediately, then calls `onReplaced`.
 */
export function ReplacePlaceModal({
  tripId,
  place,
  onClose,
  onReplaced,
}: {
  tripId: string
  place: Place
  onClose: () => void
  onReplaced: () => void
}) {
  const titleId = useId()
  const [shown, setShown] = useState(false)
  const meta = CATEGORY_META[place.category ?? ''] ?? { emoji: '📍', noun: 'un autre lieu', color: 'rgba(0,0,0,.05)' }

  const candidatesQuery = useQuery(
    trpc.discovery.getReplacementCandidates.queryOptions({ tripId, activityId: place.id }),
  )

  const replaceMutation = useMutation(
    trpc.discovery.replaceActivity.mutationOptions({ onSuccess: onReplaced }),
  )

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true))
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      className={`fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 sm:items-center sm:p-6 ${
        shown ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[85dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[28px] bg-[#F2EDE8] shadow-2xl transition-transform duration-300 ease-out sm:rounded-[28px]"
        style={{ transform: shown ? 'translateY(0)' : 'translateY(48px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e6ded6] px-5 pb-4 pt-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-[#888]">
              Choisir {meta.noun}
            </p>
            <h2 id={titleId} className="mt-1 truncate text-lg font-bold text-[#1a1a1a]">
              Remplacer « {place.title} »
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            aria-label="Fermer"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#ddd] bg-white text-[#555] transition hover:border-[#FF4D4D] hover:text-[#FF4D4D] active:scale-90"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain p-3">
          {candidatesQuery.isPending && (
            <p className="py-10 text-center text-sm font-semibold text-[#888]">
              <span className="mr-1.5 inline-block animate-pulse" aria-hidden>🔎</span>
              Recherche de propositions…
            </p>
          )}

          {candidatesQuery.isError && (
            <p className="py-10 text-center text-sm font-medium text-[#FF4D4D]">
              {candidatesQuery.error.message || 'Impossible de charger les propositions.'}
            </p>
          )}

          {candidatesQuery.data?.length === 0 && (
            <p className="py-10 text-center text-sm text-[#888]">
              Aucune autre proposition disponible pour cette destination.
            </p>
          )}

          {candidatesQuery.data?.map((candidate) => {
            const isPicking =
              replaceMutation.isPending && replaceMutation.variables?.discoveryContentId === candidate.id
            return (
              <div
                key={candidate.id}
                className="flex gap-3 rounded-2xl border border-[#eee] bg-white p-3 transition hover:border-[#FF4D4D]"
              >
                <div className="h-[68px] w-[68px] shrink-0 overflow-hidden rounded-xl">
                  {candidate.mainMediaUrl ? (
                    <img src={candidate.mainMediaUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-2xl"
                      style={{ background: meta.color }}
                      aria-hidden
                    >
                      {meta.emoji}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold leading-tight text-[#1a1a1a]">{candidate.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[#888]">
                    {candidate.suggested && (
                      <span className="rounded-full bg-[rgba(255,77,77,.12)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#E03E3E]">
                        Suggéré
                      </span>
                    )}
                    {candidate.price && <span className="font-semibold text-[#555]">{candidate.price}</span>}
                    {candidate.distanceKm != null && <span>à {formatDistance(candidate.distanceKm)}</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      replaceMutation.mutate({
                        tripId,
                        activityId: place.id,
                        discoveryContentId: candidate.id,
                      })
                    }
                    disabled={replaceMutation.isPending}
                    className="mt-2 cursor-pointer rounded-full border border-[#FF4D4D] px-3.5 py-1.5 text-xs font-semibold text-[#FF4D4D] transition hover:bg-[#FF4D4D] hover:text-white active:scale-95 disabled:opacity-50"
                  >
                    {isPicking ? 'Remplacement…' : 'Choisir'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {replaceMutation.isError && (
          <p className="border-t border-[#e6ded6] px-5 py-3 text-xs font-medium text-[#FF4D4D]">
            {replaceMutation.error.message || 'Impossible de remplacer ce lieu.'}
          </p>
        )}
      </div>
    </div>
  )
}

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`
}
