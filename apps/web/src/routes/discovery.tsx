import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { RouterOutputs } from '../lib/trpc'
import { trpc } from '../lib/trpc'

export const Route = createFileRoute('/discovery')({ component: DiscoveryPage })

// ─── Types derived from the tRPC router (single source of truth) ───────────────
type RecommendationOutput = RouterOutputs['discovery']['recommendation']
type SaveTripOutput = RouterOutputs['discovery']['saveTrip']
type DiscoveryItem = RouterOutputs['discovery']['feed'][number]
type Destination = RecommendationOutput['destinations'][number]
type LikedPlace = Destination['likedHere'][number]
type Subcategory = Destination['topSubcategories'][number]

interface SaveState {
  isPending: boolean
  isSuccess: boolean
  isError: boolean
  data: SaveTripOutput | undefined
}

interface SwipeEntry {
  id: string
  liked: boolean
  viewDurationMs: number | null
}

const LIKE_GOAL = 10
/** After this many swipes the algorithm re-ranks remaining cards by preference. */
const EXPLORATION_SIZE = 10

const COUNTRY_FLAGS: Record<string, string> = {
  France: '🇫🇷',
  Italie: '🇮🇹',
  Espagne: '🇪🇸',
  Allemagne: '🇩🇪',
  Angleterre: '🇬🇧',
  Portugal: '🇵🇹',
  Grèce: '🇬🇷',
}

function cleanDesc(desc: string | null): string {
  return (desc ?? '').replace(/\*\*/g, '').replace(/\*/g, '').trim()
}
function subcategories(item: DiscoveryItem): string[] {
  const subcategory = item.tags?.subcategory
  if (!Array.isArray(subcategory)) return []
  return subcategory.filter((value): value is string => typeof value === 'string')
}
function category(item: DiscoveryItem): string | null {
  const value = item.tags?.category
  return typeof value === 'string' ? value : null
}
function photosOf(item: DiscoveryItem): string[] {
  return [item.mainMediaUrl, ...(item.carousselUrls ?? [])].filter(
    (url, index, all): url is string => !!url && all.indexOf(url) === index,
  )
}

const CATEGORY_LABELS: Record<string, string> = {
  hotel: 'Hébergement',
  'activité': 'Activité',
  restaurant: 'Restaurant',
}

// ════════════════════════════════════════════════════════════════════════════

function DiscoveryPage() {
  const navigate = useNavigate()

  const feedQuery = useQuery(trpc.discovery.feed.queryOptions())
  const feed = feedQuery.data ?? []

  const [cursor, setCursor] = useState(0)
  const [likes, setLikes] = useState(0)
  const [skips, setSkips] = useState(0)
  const [history, setHistory] = useState<SwipeEntry[]>([])
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false })
  const [leaving, setLeaving] = useState<null | 'like' | 'skip'>(null)
  const [detail, setDetail] = useState<DiscoveryItem | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)

  // Swipes are tracked client-side; the recommendation runs over them on demand.
  const recommendationQuery = useQuery({
    ...trpc.discovery.recommendation.queryOptions({ swipes: history, topN: 3 }),
    enabled: showResult,
  })

  // After the exploration phase (EXPLORATION_SIZE swipes), rank cities by algo score
  // so the remaining cards are sorted by preference rather than round-robin order.
  const explorationComplete = history.length >= EXPLORATION_SIZE
  const rankCitiesQuery = useQuery({
    ...trpc.discovery.rankCities.queryOptions({ swipes: history }),
    enabled: explorationComplete,
  })

  const swipedIds = useMemo(() => new Set(history.map((s) => s.id)), [history])

  // Build the effective feed: exploration order for the first EXPLORATION_SIZE cards,
  // then personalized cards interleaved with occasional discovery cards (every 3rd).
  const effectiveFeed = useMemo(() => {
    const cityRanks = rankCitiesQuery.data
    if (!explorationComplete || !cityRanks) return feed

    const scoreOf = Object.fromEntries(cityRanks.map((r) => [r.city, r.score]))
    const vetoed = new Set(cityRanks.filter((r) => r.vetoed).map((r) => r.city))

    const alreadySeen = feed.filter((item) => swipedIds.has(item.id))
    const unseen = feed.filter((item) => !swipedIds.has(item.id))

    // Cards matching revealed preferences (positive score, not vetoed).
    const personalized = unseen
      .filter((item) => !vetoed.has(item.city ?? '') && (scoreOf[item.city ?? ''] ?? 0) > 0)
      .sort((a, b) => (scoreOf[b.city ?? ''] ?? 0) - (scoreOf[a.city ?? ''] ?? 0))

    // Everything else — kept to avoid a pure filter bubble.
    const surprise = unseen.filter(
      (item) => vetoed.has(item.city ?? '') || (scoreOf[item.city ?? ''] ?? 0) <= 0,
    )

    // Interleave: 2 personalized → 1 discovery → repeat.
    const PERSONALIZED_RUN = 2
    const remaining: DiscoveryItem[] = []
    const pPool = [...personalized]
    const sPool = [...surprise]
    let pStreak = 0

    while (pPool.length > 0 || sPool.length > 0) {
      if (pPool.length > 0 && (pStreak < PERSONALIZED_RUN || sPool.length === 0)) {
        remaining.push(pPool.shift()!)
        pStreak++
      } else {
        remaining.push(sPool.shift()!)
        pStreak = 0
      }
    }

    return [...alreadySeen, ...remaining]
  }, [feed, explorationComplete, rankCitiesQuery.data, swipedIds])

  // Persisting the recommended trip to the database (on explicit click).
  // The trip is a draft at this point (destination + liked places only) —
  // send the user to the configure form to fill in dates/budget/pace before generating.
  const saveTrip = useMutation(
    trpc.discovery.saveTrip.mutationOptions({
      onSuccess: (data) => {
        navigate({ to: '/trip/configure', search: { tripId: data.tripId } })
      },
    }),
  )

  const shownAtRef = useRef<number>(0)
  useEffect(() => {
    shownAtRef.current = Date.now()
  }, [cursor])

  const topItem = effectiveFeed.at(cursor)
  const stack = useMemo(() => effectiveFeed.slice(cursor, cursor + 3), [effectiveFeed, cursor])

  const triggerResult = useCallback(() => setShowResult(true), [])

  const commitSwipe = useCallback(
    (liked: boolean) => {
      if (!topItem || leaving) return
      const viewDurationMs = Date.now() - shownAtRef.current

      setHistory((h) => [...h, { id: topItem.id, liked, viewDurationMs }])

      const nextLikes = liked ? likes + 1 : likes
      if (liked) setLikes(nextLikes)
      else setSkips((s) => s + 1)

      setLeaving(liked ? 'like' : 'skip')
      window.setTimeout(() => {
        setLeaving(null)
        setDrag({ x: 0, y: 0, active: false })
        setPhotoIndex(0)
        setCursor((c) => c + 1)
        if (liked && nextLikes === LIKE_GOAL) {
          window.setTimeout(triggerResult, 250)
        }
      }, 300)
    },
    [topItem, leaving, likes, triggerResult],
  )

  // ── Keyboard ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (detail) {
        if (e.key === 'Escape') setDetail(null)
        return
      }
      if (showResult) {
        if (e.key === 'Escape') setShowResult(false)
        return
      }
      if (e.key === 'ArrowRight' || e.key === 'l') commitSwipe(true)
      if (e.key === 'ArrowLeft' || e.key === 's') commitSwipe(false)
      if (e.key === ' ') {
        e.preventDefault()
        triggerResult()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [commitSwipe, triggerResult, detail, showResult])

  // ── Pointer drag on top card ──
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const moved = useRef(false)

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (leaving) return
    dragStart.current = { x: e.clientX, y: e.clientY }
    moved.current = false
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return
    const x = e.clientX - dragStart.current.x
    const y = e.clientY - dragStart.current.y
    if (Math.abs(x) > 6 || Math.abs(y) > 6) moved.current = true
    if (moved.current) setDrag({ x, y, active: true })
  }
  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return
    dragStart.current = null

    // A tap (no drag): left/right edges browse the photos, the rest opens the details.
    if (!moved.current) {
      if (!topItem) return
      const rect = e.currentTarget.getBoundingClientRect()
      const ratio = (e.clientX - rect.left) / rect.width
      const photoCount = photosOf(topItem).length
      if (photoCount > 1 && ratio < 0.3) setPhotoIndex((i) => Math.max(0, i - 1))
      else if (photoCount > 1 && ratio > 0.7) setPhotoIndex((i) => Math.min(photoCount - 1, i + 1))
      else setDetail(topItem)
      return
    }

    const THRESHOLD = 110
    if (drag.x > THRESHOLD) commitSwipe(true)
    else if (drag.x < -THRESHOLD) commitSwipe(false)
    else setDrag({ x: 0, y: 0, active: false })
  }
  function onPointerCancel() {
    dragStart.current = null
    setDrag({ x: 0, y: 0, active: false })
  }

  function handleRestart() {
    setCursor(0)
    setLikes(0)
    setSkips(0)
    setHistory([])
    setPhotoIndex(0)
    setShowResult(false)
    setDetail(null)
    saveTrip.reset()
  }

  const noMoreCards = !feedQuery.isLoading && !feedQuery.isError && cursor >= effectiveFeed.length
  const likeStamp = drag.x > 20 ? Math.min(drag.x / 110, 1) : 0
  const skipStamp = drag.x < -20 ? Math.min(-drag.x / 110, 1) : 0
  const goalReached = likes >= LIKE_GOAL

  return (
    <div className="flex h-[calc(100dvh-61px)] w-full justify-center overflow-hidden bg-[#F2EDE8] px-4 pb-4 pt-3 md:pb-6 md:pt-5">
      <div className="flex h-full w-full max-w-[420px] flex-col">
        {/* ── Progress & destination ── */}
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold text-[#1a1a1a]">
                {goalReached ? 'Assez de coups de cœur !' : 'Like ce qui te fait envie'}
              </span>
              <span className="font-medium tabular-nums text-[#888]">
                {Math.min(likes, LIKE_GOAL)}/{LIKE_GOAL}
              </span>
            </div>
            <div
              className="mt-1.5 flex gap-1"
              role="progressbar"
              aria-label="Coups de cœur"
              aria-valuemin={0}
              aria-valuemax={LIKE_GOAL}
              aria-valuenow={Math.min(likes, LIKE_GOAL)}
            >
              {Array.from({ length: LIKE_GOAL }, (_, i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                    i < likes ? 'bg-[#FF4D4D]' : 'bg-[#ddd]'
                  }`}
                />
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={triggerResult}
            disabled={likes === 0}
            className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
              goalReached
                ? 'bg-[#FF4D4D] text-white shadow-lg shadow-red-500/25'
                : 'border border-[#ddd] bg-white text-[#1a1a1a] hover:border-[#FF4D4D]'
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path strokeLinejoin="round" d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
            </svg>
            Ma destination
          </button>
        </div>

        {/* ── Card stack ── */}
        <div className="relative mt-4 min-h-0 flex-1">
          {feedQuery.isLoading && <SkeletonCard />}

          {feedQuery.isError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-[28px] border border-[#eee] bg-white px-8 text-center">
              <span className="text-4xl" aria-hidden>📡</span>
              <p className="text-sm font-semibold text-[#1a1a1a]">Impossible de charger les lieux.</p>
              <button
                type="button"
                onClick={() => feedQuery.refetch()}
                className="rounded-full border border-[#ddd] bg-white px-6 py-2.5 text-sm font-semibold text-[#1a1a1a] transition hover:border-[#FF4D4D] active:scale-95"
              >
                Réessayer
              </button>
            </div>
          )}

          {noMoreCards && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[28px] border border-[#eee] bg-white px-8 text-center shadow-sm">
              <span className="text-5xl" aria-hidden>🗺️</span>
              <p className="text-lg font-bold text-[#1a1a1a]">Tu as parcouru tous les lieux !</p>
              <p className="text-sm text-[#888]">Découvre la destination qui te correspond, ou recommence pour affiner tes goûts.</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={triggerResult}
                  disabled={likes === 0}
                  className="rounded-full bg-[#FF4D4D] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/25 transition active:scale-95 disabled:opacity-40"
                >
                  Voir ma destination
                </button>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="rounded-full border border-[#ddd] bg-white px-6 py-3 text-sm font-semibold text-[#1a1a1a] transition hover:border-[#FF4D4D] active:scale-95"
                >
                  Recommencer
                </button>
              </div>
            </div>
          )}

          {stack
            .map((item, i) => {
              const isTop = i === 0
              const photos = photosOf(item)
              const activePhoto = isTop ? Math.min(photoIndex, photos.length - 1) : 0
              const tags = subcategories(item).slice(0, 3)
              const cat = category(item)

              let transform = `translateY(${i * 10}px) scale(${1 - i * 0.04})`
              let transition = 'transform .3s cubic-bezier(.2,.8,.2,1)'
              if (isTop && leaving) {
                const dir = leaving === 'like' ? 1 : -1
                transform = `translate(${dir * 640}px, ${drag.y - 30}px) rotate(${dir * 20}deg)`
                transition = 'transform .32s ease-in, opacity .32s ease-in'
              } else if (isTop && drag.active) {
                transform = `translate(${drag.x}px, ${drag.y * 0.3}px) rotate(${drag.x * 0.05}deg)`
                transition = 'none'
              }

              return (
                <div
                  key={item.id}
                  role={isTop ? 'group' : undefined}
                  aria-label={isTop ? (item.locationName ?? 'Lieu') : undefined}
                  aria-hidden={!isTop}
                  className={`absolute inset-0 touch-none select-none overflow-hidden rounded-[28px] bg-[#1a1a1a] shadow-[0_24px_50px_-24px_rgba(26,26,26,0.55)] ${
                    isTop ? 'cursor-grab active:cursor-grabbing' : ''
                  }`}
                  style={{ transform, transition, zIndex: 10 - i, opacity: isTop && leaving ? 0 : 1 }}
                  onPointerDown={isTop ? onPointerDown : undefined}
                  onPointerMove={isTop ? onPointerMove : undefined}
                  onPointerUp={isTop ? onPointerUp : undefined}
                  onPointerCancel={isTop ? onPointerCancel : undefined}
                >
                  {/* Fallback shown if the photo can't be loaded */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-white/15">
                    <svg className="h-16 w-16" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden>
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <circle cx="9" cy="10" r="2" />
                      <path strokeLinejoin="round" d="m21 16-5-5-9 9" />
                    </svg>
                  </div>
                  <img
                    key={photos[activePhoto]}
                    src={photos[activePhoto]}
                    alt=""
                    loading={isTop ? 'eager' : 'lazy'}
                    draggable={false}
                    onError={(e) => {
                      e.currentTarget.style.visibility = 'hidden'
                    }}
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                  />

                  {/* Readability gradients */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                  {/* Top: photo indicators + category */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 p-3">
                    {photos.length > 1 && (
                      <div className="flex gap-1" aria-hidden>
                        {photos.map((url, index) => (
                          <span
                            key={url}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              index === activePhoto ? 'bg-white' : 'bg-white/35'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                    {cat && (
                      <span className="mt-2.5 inline-flex rounded-full bg-black/35 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                        {CATEGORY_LABELS[cat] ?? cat}
                      </span>
                    )}
                  </div>

                  {/* Bottom: place info */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5">
                    <div className="flex items-center gap-1.5 text-[13px] font-medium text-white/85">
                      <svg className="h-4 w-4 shrink-0 text-[#FF4D4D]" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                      </svg>
                      <span className="truncate">{[item.city, item.country].filter(Boolean).join(', ')}</span>
                    </div>
                    <h2 className="mt-1 line-clamp-2 text-[26px] font-bold leading-[1.15] text-white">
                      {item.locationName}
                    </h2>
                    {item.description && (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/75">
                        {cleanDesc(item.description)}
                      </p>
                    )}
                    {tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium capitalize text-white backdrop-blur-md"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="mt-3 flex items-center gap-1 text-[11px] font-medium text-white/55">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m6 15 6-6 6 6" />
                      </svg>
                      Touche la carte pour voir les détails
                    </p>
                  </div>
                </div>
              )
            })
            .reverse()}
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center justify-center gap-5 pt-5">
          <button
            type="button"
            onClick={() => commitSwipe(false)}
            disabled={!topItem || !!leaving}
            aria-label="Passer"
            title="Passer (←)"
            className="flex h-16 w-16 items-center justify-center rounded-full border border-[#ddd] bg-white text-[#888] shadow-md transition hover:border-[#FF4D4D] hover:text-[#FF4D4D] active:scale-90 disabled:opacity-40"
            style={{ transform: `scale(${1 + skipStamp * 0.12})` }}
          >
            <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => topItem && setDetail(topItem)}
            disabled={!topItem || !!leaving}
            aria-label="Voir les détails"
            title="Voir les détails"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[#ddd] bg-white text-[#1a1a1a] shadow-sm transition hover:border-[#1a1a1a] active:scale-90 disabled:opacity-40"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M12 11v5M12 8h.01" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => commitSwipe(true)}
            disabled={!topItem || !!leaving}
            aria-label="J'adore"
            title="J'adore (→)"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FF4D4D] text-white shadow-lg shadow-red-500/30 transition hover:brightness-105 active:scale-90 disabled:opacity-40"
            style={{ transform: `scale(${1 + likeStamp * 0.12})` }}
          >
            <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>
        </div>
        <p className="mt-3 hidden text-center text-xs text-[#888] md:block">
          ← Passer · → J'adore · Espace : ma destination
        </p>
      </div>

      {detail && (
        <DetailSheet item={detail} onClose={() => setDetail(null)} onLike={() => { setDetail(null); commitSwipe(true) }} onSkip={() => { setDetail(null); commitSwipe(false) }} />
      )}
      {showResult && (
        <ResultOverlay
          query={recommendationQuery}
          likes={likes}
          skips={skips}
          onClose={() => setShowResult(false)}
          onRestart={handleRestart}
          onSave={() => saveTrip.mutate({ swipes: history })}
          saveState={{
            isPending: saveTrip.isPending,
            isSuccess: saveTrip.isSuccess,
            isError: saveTrip.isError,
            data: saveTrip.data,
          }}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════

function SkeletonCard() {
  return (
    <div className="absolute inset-0 animate-pulse overflow-hidden rounded-[28px] border border-[#eee] bg-white">
      <div className="absolute inset-x-5 bottom-6 space-y-3">
        <div className="h-3 w-28 rounded-full bg-[#F2EDE8]" />
        <div className="h-7 w-3/4 rounded-lg bg-[#F2EDE8]" />
        <div className="h-4 w-full rounded-lg bg-[#F2EDE8]" />
        <div className="flex gap-1.5 pt-1">
          <div className="h-6 w-16 rounded-full bg-[#F2EDE8]" />
          <div className="h-6 w-20 rounded-full bg-[#F2EDE8]" />
        </div>
      </div>
    </div>
  )
}

function useEntrance() {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return shown
}

// ════════════════════════════════════════════════════════════════════════════
// Detail sheet
// ════════════════════════════════════════════════════════════════════════════

function DetailSheet({
  item,
  onClose,
  onLike,
  onSkip,
}: {
  item: DiscoveryItem
  onClose: () => void
  onLike: () => void
  onSkip: () => void
}) {
  const photos = photosOf(item)
  const [active, setActive] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const shown = useEntrance()
  const titleId = useId()
  const galleryRef = useRef<HTMLDivElement>(null)

  const tags = subcategories(item)
  const cat = category(item)
  const description = cleanDesc(item.description)
  const isLongDescription = description.length > 260
  const priceTag = item.tags?.price
  const price = typeof priceTag === 'string' && priceTag.trim() ? priceTag : null
  const place = [item.city, item.country].filter(Boolean).join(', ')
  const offerHost = hostnameOf(item.url)

  // Lock the page behind the sheet, and browse photos with the arrow keys.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') scrollGallery(galleryRef.current, 1)
      if (e.key === 'ArrowLeft') scrollGallery(galleryRef.current, -1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  function onGalleryScroll() {
    const el = galleryRef.current
    if (!el || el.clientWidth === 0) return
    setActive(Math.round(el.scrollLeft / el.clientWidth))
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 sm:items-center sm:p-6 ${
        shown ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[92dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[28px] bg-[#F2EDE8] shadow-2xl transition-transform duration-300 ease-out sm:max-h-[88vh] sm:rounded-[28px]"
        style={{ transform: shown ? 'translateY(0)' : 'translateY(48px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none]">
          {/* ── Gallery ── */}
          <div className="relative h-72 bg-[#1a1a1a] sm:h-80">
            <div
              ref={galleryRef}
              onScroll={onGalleryScroll}
              className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
            >
              {photos.map((src, i) => (
                <img
                  key={src}
                  src={src}
                  alt={i === 0 ? (item.locationName ?? '') : ''}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  draggable={false}
                  className="h-full w-full shrink-0 snap-center object-cover"
                />
              ))}
            </div>

            <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/45 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />
            <div className="pointer-events-none absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/70 sm:hidden" />

            <button
              type="button"
              onClick={onClose}
              autoFocus
              aria-label="Fermer"
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white outline-none backdrop-blur-md transition hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-white/80 active:scale-90"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => scrollGallery(galleryRef.current, -1)}
                  disabled={active === 0}
                  aria-label="Photo précédente"
                  className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#1a1a1a] shadow-md transition hover:bg-white active:scale-90 disabled:opacity-0 sm:flex"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => scrollGallery(galleryRef.current, 1)}
                  disabled={active === photos.length - 1}
                  aria-label="Photo suivante"
                  className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#1a1a1a] shadow-md transition hover:bg-white active:scale-90 disabled:opacity-0 sm:flex"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                  </svg>
                </button>

                <div className="pointer-events-none absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5" aria-hidden>
                  {photos.map((src, i) => (
                    <span
                      key={src}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === active ? 'w-5 bg-white' : 'w-1.5 bg-white/55'
                      }`}
                    />
                  ))}
                </div>
                <span className="pointer-events-none absolute bottom-2.5 right-3 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white backdrop-blur-md">
                  {active + 1} / {photos.length}
                </span>
              </>
            )}
          </div>

          {/* ── Content ── */}
          <div className="space-y-6 px-5 pb-6 pt-5">
            <header>
              {place && (
                <p className="flex items-center gap-1.5 text-sm font-medium text-[#FF4D4D]">
                  <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  {place}
                </p>
              )}
              <h2 id={titleId} className="mt-1.5 text-[26px] font-bold leading-tight text-[#1a1a1a]">
                {item.locationName}
              </h2>
              {(cat || price) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {cat && (
                    <span className="rounded-full bg-[#FF4D4D] px-3 py-1 text-xs font-semibold text-white">
                      {CATEGORY_LABELS[cat] ?? cat}
                    </span>
                  )}
                  {price && (
                    <span className="rounded-full border border-[#ddd] bg-white px-3 py-1 text-xs font-semibold text-[#1a1a1a]">
                      Budget <span className="text-[#FF4D4D]">{price}</span>
                    </span>
                  )}
                </div>
              )}
            </header>

            {description && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#888]">À propos</h3>
                <p
                  className={`mt-2 text-[15px] leading-relaxed text-[#555] ${
                    isLongDescription && !expanded ? 'line-clamp-5' : ''
                  }`}
                >
                  {description}
                </p>
                {isLongDescription && (
                  <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    aria-expanded={expanded}
                    className="mt-1.5 text-sm font-semibold text-[#FF4D4D] hover:underline"
                  >
                    {expanded ? 'Voir moins' : 'Lire la suite'}
                  </button>
                )}
              </section>
            )}

            {tags.length > 0 && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#888]">Ce qui t'attend</h3>
                <ul className="mt-2.5 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full border border-[#ddd] bg-white px-3 py-1.5 text-xs font-semibold capitalize text-[#1a1a1a]"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#eee] bg-white px-4 py-3.5 transition hover:border-[#FF4D4D]"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[#1a1a1a]">Voir l'offre</span>
                  {offerHost && <span className="block truncate text-xs text-[#888]">{offerHost}</span>}
                </span>
                <svg className="h-5 w-5 shrink-0 text-[#FF4D4D]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7M8 7h9v9" />
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* ── Actions (always visible) ── */}
        <div className="grid grid-cols-2 gap-3 border-t border-[#ddd]/70 bg-[#F2EDE8] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={onSkip}
            className="flex h-13 items-center justify-center gap-2 rounded-2xl border border-[#ddd] bg-white py-3.5 text-sm font-semibold text-[#1a1a1a] transition hover:border-[#FF4D4D] hover:text-[#FF4D4D] active:scale-95"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
            Passer
          </button>
          <button
            type="button"
            onClick={onLike}
            className="flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#FF4D4D] py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-500/25 transition hover:brightness-105 active:scale-95"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            J'adore
          </button>
        </div>
      </div>
    </div>
  )
}

/** Scrolls a snap gallery by one photo in the given direction. */
function scrollGallery(el: HTMLDivElement | null, direction: 1 | -1) {
  if (!el || el.clientWidth === 0) return
  const current = Math.round(el.scrollLeft / el.clientWidth)
  el.scrollTo({ left: (current + direction) * el.clientWidth, behavior: 'smooth' })
}

function hostnameOf(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Result overlay
// ════════════════════════════════════════════════════════════════════════════

function ResultOverlay({
  query,
  likes,
  skips,
  onClose,
  onRestart,
  onSave,
  saveState,
}: {
  query: { data: RecommendationOutput | undefined; isLoading: boolean; isError: boolean }
  likes: number
  skips: number
  onClose: () => void
  onRestart: () => void
  onSave: () => void
  saveState: SaveState
}) {
  const shown = useEntrance()
  const result = query.data
  const top: Destination | undefined = result?.destinations[0]

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[94vh] w-full max-w-[520px] overflow-y-auto rounded-t-3xl bg-[#F2EDE8] transition-transform duration-300 [scrollbar-width:none]"
        style={{ transform: shown ? 'translateY(0)' : 'translateY(100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-3.5 h-1 w-10 rounded-full bg-[#ddd]" />

        {query.isLoading && (
          <p className="p-10 text-center text-[#888]">Calcul de ta destination…</p>
        )}
        {query.isError && (
          <p className="p-10 text-center text-[#FF4D4D]">Erreur lors du calcul.</p>
        )}
        {!query.isLoading && result && result.status !== 'ok' && (
          <p className="p-10 text-center text-[#888]">
            Pas encore assez de données — continue à swiper !
          </p>
        )}

        {result && top && (
          <>
            {/* Hero */}
            <div className="relative h-[220px] overflow-hidden rounded-t-3xl">
              {top.heroImage && (
                <img src={top.heroImage} alt="" className="h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5">
                <div className="text-xs font-medium uppercase tracking-wider text-white/70">
                  Ta prochaine destination ✈️
                </div>
                <div className="mt-1 text-4xl font-black text-white">{top.city}</div>
                <div className="mt-0.5 text-sm text-white/80">
                  {COUNTRY_FLAGS[top.country] ?? ''} {top.country}
                </div>
              </div>
            </div>

            <div className="px-5 pb-10">
              {/* Score */}
              <div className="mt-5 flex items-center gap-4 rounded-2xl bg-white p-4">
                <ScoreRing pct={Math.round(result.confidence * 100)} />
                <div className="flex-1 text-sm text-[#666]">
                  <div><b className="text-[#1a1a1a]">{result.likes}</b> likes · <b className="text-[#1a1a1a]">{result.skips}</b> skips</div>
                  <div className="mt-0.5">Score : <b className="text-[#1a1a1a]">{top.score.toFixed(1)}</b> pts</div>
                  <div>{result.totalSwipes} swipes au total</div>
                </div>
              </div>

              {/* Classement */}
              <h3 className="mb-3 mt-6 text-base font-bold text-[#1a1a1a]">Classement complet</h3>
              <div className="flex flex-col gap-2">
                {result.destinations.map((d: Destination, i: number) => (
                  <div
                    key={d.city}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
                      i === 0 ? 'bg-[#FF4D4D] text-white' : 'bg-white text-[#1a1a1a]'
                    }`}
                  >
                    <span className="text-lg">{['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">{d.city}</div>
                      <div className={`text-xs ${i === 0 ? 'text-white/70' : 'text-[#888]'}`}>
                        {d.country} · {d.score.toFixed(1)} pts
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Lieux likés */}
              {top.likedHere.length > 0 && (
                <>
                  <h3 className="mb-3 mt-6 text-base font-bold text-[#1a1a1a]">Lieux que tu as likés</h3>
                  <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
                    {top.likedHere.map((p: LikedPlace) => (
                      <a
                        key={p.id}
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-[120px] flex-shrink-0 overflow-hidden rounded-xl bg-white shadow-sm transition active:scale-95"
                      >
                        <img src={p.mainMediaUrl} alt="" className="h-[76px] w-full object-cover" />
                        <div className="truncate px-2 py-1.5 text-[0.68rem] font-medium text-[#1a1a1a]">{p.locationName}</div>
                      </a>
                    ))}
                  </div>
                </>
              )}

              {/* Ambiances */}
              {top.topSubcategories.length > 0 && (
                <>
                  <h3 className="mb-3 mt-6 text-base font-bold text-[#1a1a1a]">Ambiances disponibles</h3>
                  <div className="flex flex-wrap gap-2">
                    {top.topSubcategories.slice(0, 8).map((s: Subcategory) => (
                      <span
                        key={s.name}
                        className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-[#1a1a1a]"
                      >
                        {s.name} <span className="text-[#FF4D4D]">·{s.count}</span>
                      </span>
                    ))}
                  </div>
                </>
              )}

              {/* Stats */}
              <div className="mt-6 grid grid-cols-2 gap-2">
                <StatCard value={`${Math.round((likes / (likes + skips || 1)) * 100)}%`} label="Taux de like" />
                <StatCard value={String(result.destinations.length)} label="Destinations classées" />
              </div>

              {/* Villes exclues */}
              {result.vetoedCities.length > 0 && (
                <>
                  <h3 className="mb-2 mt-5 text-sm font-bold text-[#888]">Villes exclues</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {result.vetoedCities.map((c: string) => (
                      <span key={c} className="rounded-full bg-[#fee] px-3 py-1 text-xs text-[#FF4D4D]">
                        🚫 {c}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {/* Save */}
              <div className="mt-8">
                {saveState.isPending ? (
                  <button disabled className="w-full rounded-2xl bg-[#FF4D4D] py-4 text-sm font-bold text-white opacity-70">
                    Création du voyage…
                  </button>
                ) : (
                  <button
                    onClick={onSave}
                    className="w-full rounded-2xl bg-[#FF4D4D] py-4 text-sm font-bold text-white shadow-lg shadow-red-500/25 transition active:scale-95"
                  >
                    🗺️ Créer mon voyage
                  </button>
                )}
                {saveState.isError && (
                  <p className="mt-2 text-center text-xs text-[#FF4D4D]">Échec — la base de données est-elle démarrée ?</p>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-2xl border border-[#ddd] bg-white py-3.5 text-sm font-semibold text-[#1a1a1a] transition active:scale-95"
                >
                  Continuer à swiper
                </button>
                <button
                  onClick={onRestart}
                  className="rounded-2xl border border-[#ddd] bg-white px-5 py-3.5 text-sm font-semibold text-[#888] transition active:scale-95"
                >
                  Recommencer
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <div className="text-2xl font-extrabold text-[#1a1a1a]">{value}</div>
      <div className="mt-0.5 text-xs text-[#888]">{label}</div>
    </div>
  )
}

function ScoreRing({ pct }: { pct: number }) {
  const C = 2 * Math.PI * 30
  const offset = C - (pct / 100) * C
  return (
    <div className="relative h-[72px] w-[72px] flex-shrink-0">
      <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
        <circle cx="36" cy="36" r="30" fill="none" stroke="#eee" strokeWidth="6" />
        <circle
          cx="36" cy="36" r="30" fill="none"
          stroke="#FF4D4D" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-extrabold text-[#1a1a1a]">{pct}%</span>
        <span className="text-[0.55rem] text-[#888]">match</span>
      </div>
    </div>
  )
}
