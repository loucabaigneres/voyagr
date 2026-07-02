import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useTRPC } from '#/integrations/trpc/react'
import type { DiscoveryItem } from '#/server/recommendation/algorithm'
import type { TRPCRouter } from '#/integrations/trpc/router'
import type { inferRouterOutputs } from '@trpc/server'

export const Route = createFileRoute('/discovery')({ component: DiscoveryPage })

// ─── Types derived from the tRPC router (single source of truth) ───────────────
type RouterOutputs = inferRouterOutputs<TRPCRouter>
type RecommendationOutput = RouterOutputs['discovery']['recommendation']
type SaveTripOutput = RouterOutputs['discovery']['saveTrip']
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
}
const CITY_EMOJI: Record<string, string> = {
  Rome: '🏛️',
  Paris: '🗼',
  Madrid: '💃',
  Barcelone: '🎨',
  Berlin: '🎸',
  Londres: '🎡',
  Milan: '👗',
  Lisbonne: '🎵',
  Naples: '🍕',
  Marseille: '⛵',
  Ajaccio: '🌊',
}

function cleanDesc(desc: string | null): string {
  return (desc ?? '').replace(/\*\*/g, '').replace(/\*/g, '').trim()
}
function subcategories(item: DiscoveryItem): string[] {
  return item.tags?.subcategory ?? []
}
function flag(country: string | null): string {
  return COUNTRY_FLAGS[country ?? ''] ?? '📍'
}

// ════════════════════════════════════════════════════════════════════════════

function DiscoveryPage() {
  const trpc = useTRPC()

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
  const saveTrip = useMutation(trpc.discovery.saveTrip.mutationOptions())

  const shownAtRef = useRef<number>(Date.now())
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

  const progress = Math.min((likes / LIKE_GOAL) * 100, 100)
  const remaining = Math.max(0, LIKE_GOAL - likes)
  const noMoreCards = !feedQuery.isLoading && cursor >= effectiveFeed.length

  return (
    <div className="relative isolate min-h-[calc(100dvh-4rem)] w-full overflow-x-hidden bg-[#0f0f13] text-[#e8e8f0]">
      {/* Immersive backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60rem 40rem at 15% -10%, rgba(108,99,255,.22), transparent 60%), radial-gradient(50rem 40rem at 110% 10%, rgba(167,139,250,.16), transparent 55%), radial-gradient(40rem 30rem at 50% 120%, rgba(46,204,113,.10), transparent 60%)',
        }}
      />

      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[520px] flex-col px-4">
        {/* Header */}
        <header className="flex items-center justify-between pt-6 pb-3">
          <h1 className="text-xl font-extrabold tracking-tight">
            ✈ Swipe<span className="text-[#6c63ff]">Travel</span>
          </h1>
          <div className="flex gap-3 text-sm text-[#9a9ac0]">
            <span className="rounded-full bg-white/5 px-2.5 py-1">
              ❤️ <b className="text-[#e8e8f0]">{likes}</b>/{LIKE_GOAL}
            </span>
            <span className="rounded-full bg-white/5 px-2.5 py-1">
              ✖ <b className="text-[#e8e8f0]">{skips}</b>
            </span>
          </div>
        </header>

        {/* Progress */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#23233040]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#6c63ff] to-[#a78bfa] shadow-[0_0_12px_rgba(108,99,255,.6)] transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-center text-xs text-[#9a9ac0]">
          {remaining > 0 ? (
            <>
              Plus que <b className="text-[#e8e8f0]">{remaining}</b> like{remaining > 1 ? 's' : ''} pour
              débloquer ta destination
            </>
          ) : (
            <span className="text-[#2ecc71]">✨ Ta destination est prête — appuie sur 🧭</span>
          )}
        </p>

        {/* Card stack — fixed-height box so cards never overlap the buttons */}
        <div className="flex flex-1 items-center justify-center py-3">
          <div className="relative flex h-[290px] w-[270px] items-center justify-center">
          {feedQuery.isLoading && <SkeletonCard />}
          {feedQuery.isError && (
            <p className="max-w-[260px] text-center text-sm text-[#e74c3c]">
              Impossible de charger les lieux. Vérifie que le serveur tourne.
            </p>
          )}
          {noMoreCards && (
            <div className="flex flex-col items-center gap-3 text-[#9a9ac0]">
              <span className="text-5xl">🗺️</span>
              <p>Tu as parcouru tous les lieux !</p>
              <button
                onClick={triggerResult}
                className="rounded-xl bg-[#6c63ff] px-5 py-2.5 font-semibold text-white transition hover:brightness-110"
              >
                Voir ma destination
              </button>
            </div>
          )}

          {stack
            .map((item, i) => {
              const isTop = i === 0
              const offset = i
              const rot = isTop ? drag.x * 0.06 : 0
              let transform = `scale(${1 - offset * 0.04}) translateY(${offset * 10}px)`
              let transition = 'transform .25s ease'
              if (isTop && leaving) {
                const dir = leaving === 'like' ? 1 : -1
                transform = `translate(${dir * 600}px, -60px) rotate(${dir * 22}deg)`
                transition = 'transform .35s ease, opacity .35s ease'
              } else if (isTop && drag.active) {
                transform = `translate(${drag.x}px, ${drag.y}px) rotate(${rot}deg)`
                transition = 'none'
              }
              const likeStamp = isTop && drag.x > 20 ? Math.min(drag.x / 90, 1) : 0
              const skipStamp = isTop && drag.x < -20 ? Math.min(-drag.x / 90, 1) : 0

              return (
                <article
                  key={item.id}
                  className="absolute w-[270px] overflow-hidden rounded-2xl border border-white/[.08] bg-[#1b1b27] shadow-[0_8px_24px_rgba(0,0,0,.4)]"
                  style={{
                    transform,
                    transition,
                    zIndex: 10 - offset,
                    opacity: isTop && leaving ? 0 : 1,
                    cursor: isTop ? 'grab' : 'default',
                    touchAction: 'none',
                  }}
                  onPointerDown={isTop ? onPointerDown : undefined}
                  onPointerMove={isTop ? onPointerMove : undefined}
                  onPointerUp={isTop ? onPointerUp : undefined}
                >
                  <div className="relative">
                    <img
                      src={item.mainMediaUrl}
                      alt=""
                      className="h-[150px] w-full object-cover"
                      draggable={false}
                    />
                    <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#1b1b27] to-transparent" />
                    {/* Category chip */}
                    {item.tags?.category && (
                      <span className="absolute left-3 top-3 rounded-full bg-black/45 px-3 py-1 text-xs font-semibold capitalize text-white backdrop-blur-sm">
                        {item.tags.category}
                      </span>
                    )}
                    {/* Stamps */}
                    <div
                      className="absolute left-5 top-7 rotate-[-12deg] rounded-lg border-[3px] border-[#2ecc71] px-4 py-1.5 text-2xl font-black tracking-widest text-[#2ecc71]"
                      style={{ opacity: likeStamp }}
                    >
                      LIKE
                    </div>
                    <div
                      className="absolute right-5 top-7 rotate-[12deg] rounded-lg border-[3px] border-[#e74c3c] px-4 py-1.5 text-2xl font-black tracking-widest text-[#e74c3c]"
                      style={{ opacity: skipStamp }}
                    >
                      SKIP
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!moved.current) setDetail(item)
                    }}
                    className="block w-full cursor-pointer px-4 pb-3.5 pt-2.5 text-left"
                  >
                    <div className="truncate text-base font-bold">{item.locationName}</div>
                    <div className="mt-0.5 text-[0.8rem] font-medium text-[#a78bfa]">
                      {flag(item.country)} {item.city}, {item.country}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {subcategories(item)
                        .slice(0, 3)
                        .map((s) => (
                          <span
                            key={s}
                            className="rounded-full border border-[rgba(108,99,255,.25)] bg-[rgba(108,99,255,.15)] px-2 py-0.5 text-[0.7rem] text-[#a9a2ff]"
                          >
                            {s}
                          </span>
                        ))}
                    </div>
                    <p className="mt-2 line-clamp-2 text-[0.72rem] leading-relaxed text-[#9a9ac0]">
                      {cleanDesc(item.description)}
                    </p>
                    <span className="mt-2 inline-block text-[0.65rem] text-[#6f6f8f]">
                      👆 Appuie pour en savoir plus
                    </span>
                  </button>
                </article>
              )
            })
            .reverse()}
          </div>
        </div>

        {/* Actions */}
        <p className="mb-3 text-center text-xs text-[#6f6f8f]">
          ← passer · → j’aime · espace = recommandation
        </p>
        <div className="flex items-end justify-center gap-6 pb-7">
          <ActionButton
            label="Passer"
            onClick={() => commitSwipe(false)}
            disabled={!topItem}
            className="h-14 w-14 border-[rgba(231,76,60,.35)] bg-[rgba(231,76,60,.15)] text-xl text-[#e74c3c]"
          >
            ✕
          </ActionButton>
          <ActionButton
            label="Reco"
            onClick={triggerResult}
            className="h-12 w-12 border-[rgba(108,99,255,.35)] bg-[rgba(108,99,255,.15)] text-lg text-[#a9a2ff]"
          >
            🧭
          </ActionButton>
          <ActionButton
            label="J’aime"
            onClick={() => commitSwipe(true)}
            disabled={!topItem}
            className="h-16 w-16 border-[rgba(46,204,113,.35)] bg-[rgba(46,204,113,.15)] text-2xl text-[#2ecc71]"
          >
            ♥
          </ActionButton>
        </div>
      </div>

      {detail && <DetailSheet item={detail} onClose={() => setDetail(null)} />}
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
// Small building blocks
// ════════════════════════════════════════════════════════════════════════════

function ActionButton({
  label,
  children,
  className = '',
  disabled,
  onClick,
}: {
  label: string
  children: React.ReactNode
  className?: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center justify-center rounded-full border-2 shadow-lg transition active:scale-90 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-30 ${className}`}
      >
        {children}
      </button>
      <span className="text-[0.65rem] font-medium text-[#6f6f8f]">{label}</span>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="w-[270px] animate-pulse overflow-hidden rounded-2xl border border-white/[.08] bg-[#1b1b27]">
      <div className="h-[150px] w-full bg-white/5" />
      <div className="space-y-2.5 px-4 py-3.5">
        <div className="h-4 w-2/3 rounded bg-white/10" />
        <div className="h-3 w-1/2 rounded bg-white/5" />
        <div className="flex gap-2">
          <div className="h-5 w-16 rounded-full bg-white/5" />
          <div className="h-5 w-12 rounded-full bg-white/5" />
        </div>
      </div>
    </div>
  )
}

/** Slide-up entrance for bottom sheets. */
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

function DetailSheet({ item, onClose }: { item: DiscoveryItem; onClose: () => void }) {
  const imgs = [item.mainMediaUrl, ...(item.carousselUrls ?? [])].filter(Boolean)
  const [active, setActive] = useState(0)
  const shown = useEntrance()

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl border border-white/10 bg-[#1a1a24] transition-transform duration-300 [scrollbar-width:none]"
        style={{ transform: shown ? 'translateY(0)' : 'translateY(100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded bg-white/20" />
        <div className="px-5 pt-4">
          <img src={imgs[active]} alt="" className="h-[220px] w-full rounded-2xl object-cover" />
          {imgs.length > 1 && (
            <div className="mt-2.5 flex gap-2 overflow-x-auto [scrollbar-width:none]">
              {imgs.map((src, i) => (
                <img
                  key={src}
                  src={src}
                  alt=""
                  onClick={() => setActive(i)}
                  className={`h-12 w-16 flex-shrink-0 cursor-pointer rounded-lg object-cover transition ${
                    i === active ? 'opacity-100 outline outline-2 outline-[#6c63ff]' : 'opacity-50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
        <div className="px-5 pb-8 pt-4">
          <h2 className="text-xl font-extrabold">{item.locationName}</h2>
          <div className="mt-1 text-sm font-medium text-[#a78bfa]">
            {flag(item.country)} {item.city}, {item.country}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.tags?.category && (
              <span className="rounded-full border border-[rgba(240,192,64,.2)] bg-[rgba(240,192,64,.1)] px-2.5 py-0.5 text-xs capitalize text-[#f0c040]">
                {item.tags.category}
              </span>
            )}
            {subcategories(item).map((s) => (
              <span
                key={s}
                className="rounded-full border border-[rgba(108,99,255,.25)] bg-[rgba(108,99,255,.15)] px-2.5 py-0.5 text-xs text-[#a9a2ff]"
              >
                {s}
              </span>
            ))}
          </div>
          <p className="mt-3.5 whitespace-pre-wrap text-sm leading-relaxed text-[#c4c4dc]">
            {cleanDesc(item.description)}
          </p>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 block rounded-xl border border-[rgba(108,99,255,.3)] bg-[rgba(108,99,255,.15)] px-5 py-2.5 text-center text-sm font-semibold text-[#a9a2ff] transition hover:bg-[rgba(108,99,255,.25)]"
          >
            Voir sur Booking.com ↗
          </a>
        </div>
      </div>
    </div>
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
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/[.88] backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="max-h-[94vh] w-full max-w-[520px] overflow-y-auto rounded-t-3xl border border-white/10 bg-[#1a1a24] text-[#e8e8f0] transition-transform duration-300 [scrollbar-width:none]"
        style={{ transform: shown ? 'translateY(0)' : 'translateY(100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-3.5 h-1 w-10 rounded bg-white/20" />

        {query.isLoading && (
          <p className="p-10 text-center text-[#9a9ac0]">Calcul de ta destination…</p>
        )}
        {query.isError && <p className="p-10 text-center text-[#e74c3c]">Erreur lors du calcul.</p>}
        {!query.isLoading && result && result.status !== 'ok' && (
          <p className="p-10 text-center text-[#9a9ac0]">
            Pas encore assez de données — continue à swiper !
          </p>
        )}

        {result && top && (
          <>
            {/* Hero */}
            <div className="relative h-[210px] overflow-hidden rounded-t-3xl">
              {top.heroImage && (
                <img src={top.heroImage} alt="" className="h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a24] via-[#1a1a24]/30 to-transparent" />
              <div className="absolute bottom-4 left-5 right-5">
                <div className="text-xs uppercase tracking-wider text-white/60">
                  Ta prochaine destination ✈️
                </div>
                <div className="text-4xl font-black leading-none text-white">
                  {CITY_EMOJI[top.city] ?? ''} {top.city}
                </div>
                <div className="mt-0.5 text-sm text-[#a78bfa]">
                  {COUNTRY_FLAGS[top.country] ?? ''} {top.country}
                </div>
              </div>
            </div>

            <div className="px-5 pb-9">
              {/* Score */}
              <Section title="Score de compatibilité">
                <div className="flex items-center gap-4">
                  <ScoreRing pct={Math.round(result.confidence * 100)} />
                  <div className="flex flex-1 flex-col gap-1 text-sm text-[#9a9ac0]">
                    <div>
                      <b className="text-[#e8e8f0]">{result.likes}</b> likes ·{' '}
                      <b className="text-[#e8e8f0]">{result.skips}</b> skips
                    </div>
                    <div>
                      Score brut : <b className="text-[#e8e8f0]">{top.score.toFixed(1)}</b> pts
                    </div>
                    <div>{result.totalSwipes} swipes au total</div>
                  </div>
                </div>
              </Section>

              {/* Breakdown */}
              <Section title="Pourquoi cette ville ?">
                <Breakdown breakdown={top.breakdown} />
              </Section>

              {/* Podium */}
              <Section title="Classement complet">
                <div className="flex flex-col gap-2">
                  {result.destinations.map((d: Destination, i: number) => {
                    const pct = top.score > 0 ? Math.round((d.score / top.score) * 100) : 0
                    return (
                      <div
                        key={d.city}
                        className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${
                          i === 0
                            ? 'border-[rgba(108,99,255,.4)] bg-[rgba(108,99,255,.08)]'
                            : 'border-white/10 bg-white/[.04]'
                        }`}
                      >
                        <div className="text-xl">{['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`}</div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold">
                            {COUNTRY_FLAGS[d.country] ?? ''} {d.city}
                          </div>
                          <div className="text-xs text-[#9a9ac0]">
                            {d.country} · {d.itemCount} lieux · score {d.score.toFixed(1)}
                          </div>
                        </div>
                        <div className="h-1.5 w-16 overflow-hidden rounded bg-[#2a2a3e]">
                          <div
                            className="h-full rounded bg-gradient-to-r from-[#6c63ff] to-[#a78bfa]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Section>

              {/* Liked places */}
              {top.likedHere.length > 0 && (
                <Section title="Lieux que tu as likés ici">
                  <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
                    {top.likedHere.map((p: LikedPlace) => (
                      <a
                        key={p.id}
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-[120px] flex-shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#1e1e2e] transition hover:scale-[1.03]"
                      >
                        <img src={p.mainMediaUrl} alt="" className="h-[76px] w-full object-cover" />
                        <div className="truncate px-2 py-1.5 text-[0.68rem]">{p.locationName}</div>
                      </a>
                    ))}
                  </div>
                </Section>
              )}

              {/* Ambiances */}
              {top.topSubcategories.length > 0 && (
                <Section title="Ambiances disponibles">
                  <div className="flex flex-wrap gap-1.5">
                    {top.topSubcategories.map((s: Subcategory) => (
                      <span
                        key={s.name}
                        className="flex items-center gap-1.5 rounded-full border border-[rgba(108,99,255,.2)] bg-[rgba(108,99,255,.12)] px-3 py-1 text-xs text-[#a9a2ff]"
                      >
                        {s.name}
                        <span className="rounded-[10px] bg-[rgba(108,99,255,.25)] px-1.5 text-[0.65rem] font-bold">
                          {s.count}
                        </span>
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Stats */}
              <Section title="Tes stats de swipe">
                <div className="grid grid-cols-2 gap-2">
                  <Stat
                    value={`${Math.round((likes / (likes + skips || 1)) * 100)}%`}
                    label="Taux de like"
                  />
                  <Stat value={String(result.likes)} label="Likes enregistrés" />
                  <Stat value={String(result.destinations.length)} label="Destinations classées" />
                  <Stat value={String(result.vetoedCities.length)} label="Villes exclues" />
                </div>
              </Section>

              {/* Veto */}
              {result.vetoedCities.length > 0 && (
                <Section title="Villes exclues (trop de skips)">
                  <div className="flex flex-wrap gap-1.5">
                    {result.vetoedCities.map((c: string) => (
                      <span
                        key={c}
                        className="rounded-full border border-[rgba(231,76,60,.25)] bg-[rgba(231,76,60,.1)] px-2.5 py-0.5 text-xs text-[#e74c3c]"
                      >
                        🚫 {c}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Save trip */}
              <SaveTripButton onSave={onSave} saveState={saveState} />

              <div className="mt-3 flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-[#6c63ff] px-8 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Continuer à swiper
                </button>
                <button
                  onClick={onRestart}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-[#9a9ac0] transition hover:bg-white/5"
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

function SaveTripButton({ onSave, saveState }: { onSave: () => void; saveState: SaveState }) {
  if (saveState.isSuccess && saveState.data) {
    const { activityCount, unresolved } = saveState.data
    return (
      <div className="mt-6 rounded-xl border border-[rgba(46,204,113,.3)] bg-[rgba(46,204,113,.1)] px-4 py-3 text-center text-sm text-[#2ecc71]">
        ✓ Voyage enregistré — {activityCount} lieu{activityCount > 1 ? 'x' : ''} ajouté
        {activityCount > 1 ? 's' : ''}
        {unresolved > 0 && (
          <span className="mt-1 block text-xs text-[#9a9ac0]">
            ({unresolved} lieu{unresolved > 1 ? 'x' : ''} liké{unresolved > 1 ? 's' : ''} introuvable
            {unresolved > 1 ? 's' : ''} en base — seed manquant ?)
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="mt-6">
      <button
        onClick={onSave}
        disabled={saveState.isPending}
        className="w-full rounded-xl border border-[rgba(108,99,255,.4)] bg-[rgba(108,99,255,.15)] px-8 py-3 text-sm font-semibold text-[#a9a2ff] transition hover:bg-[rgba(108,99,255,.25)] disabled:opacity-60"
      >
        {saveState.isPending ? 'Enregistrement…' : '💾 Sauvegarder ce voyage'}
      </button>
      {saveState.isError && (
        <p className="mt-2 text-center text-xs text-[#e74c3c]">
          Échec de l’enregistrement — la base de données est-elle démarrée et seedée ?
        </p>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-2.5 text-[0.7rem] font-bold uppercase tracking-wider text-[#9a9ac0]">
        {title}
      </div>
      {children}
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[.04] px-3.5 py-3">
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="mt-0.5 text-xs text-[#9a9ac0]">{label}</div>
    </div>
  )
}

function ScoreRing({ pct }: { pct: number }) {
  const C = 2 * Math.PI * 30
  const offset = C - (pct / 100) * C
  return (
    <div className="relative h-[72px] w-[72px] flex-shrink-0">
      <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6c63ff" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        <circle cx="36" cy="36" r="30" fill="none" stroke="#2a2a3e" strokeWidth="6" />
        <circle
          cx="36"
          cy="36"
          r="30"
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-extrabold">{pct}%</span>
        <span className="text-[0.55rem] text-[#9a9ac0]">confiance</span>
      </div>
    </div>
  )
}

function Breakdown({ breakdown }: { breakdown: Destination['breakdown'] }) {
  const labels: Record<string, string> = {
    country: '🌍 Pays',
    city: '📍 Ville',
    category: '🏷 Catégorie',
    subcategory: '✨ Ambiances',
  }
  const max = Math.max(...Object.keys(labels).map((k) => Math.abs(breakdown[k] ?? 0)), 0.1)
  return (
    <div className="flex flex-col gap-2">
      {Object.entries(labels).map(([key, label]) => {
        const val = breakdown[key] ?? 0
        const pct = Math.round((Math.abs(val) / max) * 100)
        return (
          <div key={key} className="flex items-center gap-2.5 text-xs">
            <div className="w-[90px] flex-shrink-0 text-[#9a9ac0]">{label}</div>
            <div className="h-1.5 flex-1 overflow-hidden rounded bg-[#2a2a3e]">
              <div
                className={`h-full rounded ${
                  val >= 0
                    ? 'bg-gradient-to-r from-[#6c63ff] to-[#a78bfa]'
                    : 'bg-gradient-to-r from-[#e74c3c] to-[#ff8a80]'
                }`}
                style={{ width: `${pct}%`, transition: 'width .8s ease' }}
              />
            </div>
            <div className="w-9 flex-shrink-0 text-right text-[0.72rem] text-[#9a9ac0]">
              {val >= 0 ? '+' : ''}
              {val.toFixed(1)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
