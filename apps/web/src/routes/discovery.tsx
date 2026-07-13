import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

  function onPointerDown(e: React.PointerEvent) {
    if (leaving) return
    dragStart.current = { x: e.clientX, y: e.clientY }
    moved.current = false
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragStart.current) return
    const x = e.clientX - dragStart.current.x
    const y = e.clientY - dragStart.current.y
    if (Math.abs(x) > 4 || Math.abs(y) > 4) moved.current = true
    setDrag({ x, y, active: true })
  }
  function onPointerUp() {
    if (!dragStart.current) return
    dragStart.current = null
    const THRESHOLD = 110
    if (drag.x > THRESHOLD) commitSwipe(true)
    else if (drag.x < -THRESHOLD) commitSwipe(false)
    else setDrag({ x: 0, y: 0, active: false })
  }

  function handleRestart() {
    setCursor(0)
    setLikes(0)
    setSkips(0)
    setHistory([])
    setShowResult(false)
    setDetail(null)
    saveTrip.reset()
  }

  const noMoreCards = !feedQuery.isLoading && cursor >= effectiveFeed.length
  const progress = Math.min((likes / LIKE_GOAL) * 100, 100)
  const likeStamp = drag.x > 20 ? Math.min(drag.x / 90, 1) : 0
  const skipStamp = drag.x < -20 ? Math.min(-drag.x / 90, 1) : 0

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-[#1a1a1a] md:bg-[#F2EDE8]">
      {/* On mobile: full screen. On desktop: centered phone-like frame. */}
      <div className="relative h-full w-full overflow-hidden md:h-[min(92vh,820px)] md:w-[420px] md:rounded-[2rem] md:bg-[#1a1a1a] md:shadow-2xl">
      {/* Card stack */}
      {feedQuery.isLoading && <SkeletonCard />}

      {feedQuery.isError && (
        <div className="flex h-full items-center justify-center">
          <p className="text-center text-sm text-red-400">Impossible de charger les lieux.</p>
        </div>
      )}

      {noMoreCards && (
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#F2EDE8] px-8">
          <span className="text-6xl">🗺️</span>
          <p className="text-center text-lg font-semibold text-[#1a1a1a]">Tu as parcouru tous les lieux !</p>
          <button
            onClick={triggerResult}
            className="rounded-full bg-[#FF4D4D] px-8 py-3.5 font-semibold text-white shadow-lg transition active:scale-95"
          >
            Voir ma destination
          </button>
        </div>
      )}

      {stack
        .map((item, i) => {
          const isTop = i === 0
          const offset = i
          const rot = isTop ? drag.x * 0.04 : 0
          let transform = `scale(${1 - offset * 0.04}) translateY(${offset * 12}px)`
          let transition = 'transform .25s ease'
          if (isTop && leaving) {
            const dir = leaving === 'like' ? 1 : -1
            transform = `translate(${dir * 700}px, -40px) rotate(${dir * 18}deg)`
            transition = 'transform .32s ease, opacity .32s ease'
          } else if (isTop && drag.active) {
            transform = `translate(${drag.x}px, ${drag.y}px) rotate(${rot}deg)`
            transition = 'none'
          }

          return (
            <div
              key={item.id}
              className="absolute inset-0"
              style={{ transform, transition, zIndex: 10 - offset, opacity: isTop && leaving ? 0 : 1 }}
              onPointerDown={isTop ? onPointerDown : undefined}
              onPointerMove={isTop ? onPointerMove : undefined}
              onPointerUp={isTop ? onPointerUp : undefined}
            >
              {/* Background image */}
              <img
                src={item.mainMediaUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                draggable={false}
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* LIKE / SKIP stamps */}
              <div
                className="absolute left-6 top-20 rotate-[-12deg] rounded-xl border-[3px] border-[#2ecc71] px-5 py-2 text-3xl font-black tracking-widest text-[#2ecc71]"
                style={{ opacity: likeStamp * (isTop ? 1 : 0) }}
              >
                LIKE
              </div>
              <div
                className="absolute right-6 top-20 rotate-[12deg] rounded-xl border-[3px] border-[#FF4D4D] px-5 py-2 text-3xl font-black tracking-widest text-[#FF4D4D]"
                style={{ opacity: skipStamp * (isTop ? 1 : 0) }}
              >
                SKIP
              </div>

              {/* Bottom info */}
              <div className="absolute bottom-0 left-0 right-0 px-6 pb-32">
                <div className="flex items-center gap-1.5 text-sm font-medium text-white/80">
                  <svg className="h-4 w-4 text-[#FF4D4D]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  {item.city}, {item.country}
                </div>
                <h2 className="mt-1 text-2xl font-bold leading-tight text-white">
                  {item.locationName}
                </h2>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-white/70">
                  {cleanDesc(item.description)}
                </p>
              </div>
            </div>
          )
        })
        .reverse()}

      {/* Progress bar */}
      {!noMoreCards && (
        <div className="absolute left-4 right-4 top-14 z-20">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom action buttons */}
      {!noMoreCards && topItem && (
        <div className="absolute bottom-10 left-0 right-0 z-20 flex items-center justify-center gap-6">
          {/* Skip */}
          <button
            onClick={() => commitSwipe(false)}
            disabled={!!leaving}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-xl transition active:scale-90 disabled:opacity-50"
          >
            <svg className="h-7 w-7 text-[#888]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Detail */}
          <button
            onClick={() => { if (!moved.current) setDetail(topItem) }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition active:scale-90"
          >
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
            </svg>
          </button>

          {/* Like */}
          <button
            onClick={() => commitSwipe(true)}
            disabled={!!leaving}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FF4D4D] shadow-xl shadow-red-500/30 transition active:scale-90 disabled:opacity-50"
          >
            <svg className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>
        </div>
      )}

      {/* Result trigger button */}
      {likes > 0 && !showResult && !noMoreCards && (
        <button
          onClick={triggerResult}
          className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-full bg-white/90 px-3.5 py-2 text-xs font-bold text-[#1a1a1a] shadow-lg transition active:scale-95"
        >
          🧭 <span>{likes}/{LIKE_GOAL}</span>
        </button>
      )}
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
    <div className="absolute inset-0 animate-pulse bg-[#2a2a2a]">
      <div className="absolute bottom-32 left-6 right-20 space-y-3">
        <div className="h-3 w-24 rounded-full bg-white/10" />
        <div className="h-7 w-56 rounded-lg bg-white/10" />
        <div className="h-4 w-full rounded-lg bg-white/10" />
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
  const imgs = [item.mainMediaUrl, ...(item.carousselUrls ?? [])].filter(Boolean)
  const [active, setActive] = useState(0)
  const shown = useEntrance()
  const cats = subcategories(item)
  const cat = category(item)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-[#F2EDE8] transition-transform duration-300 [scrollbar-width:none]"
        style={{ transform: shown ? 'translateY(0)' : 'translateY(100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero image */}
        <div className="relative h-[260px] w-full overflow-hidden rounded-t-3xl">
          <img src={imgs[active]} alt="" className="h-full w-full object-cover" draggable={false} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition active:scale-90"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {imgs.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {imgs.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`h-1.5 rounded-full transition-all ${i === active ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-5 pb-10 pt-5">
          {/* Location */}
          <div className="flex items-center gap-1.5 text-sm text-[#FF4D4D] font-medium">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            </svg>
            {item.city}, {item.country}
          </div>
          <h2 className="mt-1 text-2xl font-bold text-[#1a1a1a]">{item.locationName}</h2>

          <p className="mt-3 text-sm leading-relaxed text-[#666]">{cleanDesc(item.description)}</p>

          {/* Type de lieu */}
          {(cat || cats.length > 0) && (
            <div className="mt-5">
              <h3 className="mb-2.5 text-base font-bold text-[#1a1a1a]">Type de lieu</h3>
              <div className="flex flex-wrap gap-2">
                {cat && <Tag label={cat} />}
                {cats.slice(0, 4).map((s) => <Tag key={s} label={s} />)}
              </div>
            </div>
          )}

          {/* Description détaillée */}
          <div className="mt-5">
            <h3 className="mb-2 text-base font-bold text-[#1a1a1a]">Description détaillée</h3>
            <p className="text-sm leading-relaxed text-[#555]">{cleanDesc(item.description)}</p>
          </div>

          {/* Activités */}
          {cats.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2.5 text-base font-bold text-[#1a1a1a]">Activités à faire</h3>
              <div className="flex flex-wrap gap-2">
                {cats.map((s) => <Tag key={s} label={s} />)}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex gap-3">
            <button
              onClick={onSkip}
              className="flex h-14 flex-1 items-center justify-center rounded-2xl border-2 border-[#ddd] bg-white text-[#888] font-semibold transition active:scale-95"
            >
              Passer
            </button>
            <button
              onClick={onLike}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#FF4D4D] font-semibold text-white shadow-lg shadow-red-500/25 transition active:scale-95"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              J'adore
            </button>
          </div>

          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex h-12 w-full items-center justify-center rounded-2xl border border-[#ddd] bg-white text-sm font-medium text-[#555] transition active:scale-95"
          >
            Voir plus d'informations ↗
          </a>
        </div>
      </div>
    </div>
  )
}

function Tag({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-[#FF4D4D] px-3.5 py-1.5 text-xs font-semibold capitalize text-white">
      {label}
    </span>
  )
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
