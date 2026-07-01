/**
 * Swipe-based travel destination recommendation engine.
 *
 * Pure, framework-agnostic logic. Given a chronological list of the user's
 * swipes (each carrying its discovery item, direction and optional view
 * duration), it ranks candidate cities by how well they match the user's
 * revealed preferences.
 *
 * Scoring pipeline:
 * 1. Each swipe contributes weighted signal to a feature score map.
 * 2. Recency weighting: later swipes count more than early ones.
 * 3. Speed weighting: fast decisive swipes count more than slow/hesitant ones.
 * 4. Hard veto: a city skipped >= VETO_THRESHOLD times is excluded entirely.
 * 5. Cities are scored from the feature map and normalised by size.
 */

import type { DiscoveryTags } from '@voyagr/database'

export type { DiscoveryTags }

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DiscoveryItem {
  id: string
  locationName: string | null
  url: string
  mainMediaUrl: string
  carousselUrls: string[] | null
  description: string | null
  country: string | null
  city: string | null
  tags: DiscoveryTags | null
}

/** A single swipe, in chronological order (oldest first). */
export interface SwipeRecord {
  item: DiscoveryItem
  liked: boolean
  /** Time in ms the card was shown before the swipe, or null if unknown. */
  viewDurationMs: number | null
}

export interface DestinationScore {
  city: string
  country: string
  score: number
  confidence: number
  breakdown: Record<string, number>
  itemCount: number
  vetoed: boolean
  skipCount: number
}

export interface RecommendationResult {
  status: 'no_data' | 'inconclusive' | 'ok'
  totalSwipes: number
  likes: number
  skips: number
  confidence: number
  destinations: DestinationScore[]
  vetoedCities: string[]
}

type FeatureType = 'country' | 'city' | 'category' | 'subcategory'

// ─── Weights ──────────────────────────────────────────────────────────────────

const W: Record<FeatureType, { like: number; skip: number }> = {
  country: { like: 2.0, skip: -1.5 },
  city: { like: 3.5, skip: -3.0 },
  category: { like: 1.0, skip: -0.6 },
  subcategory: { like: 1.5, skip: -0.9 },
}

/** A city gets vetoed (excluded) after this many skips. */
export const VETO_THRESHOLD = 2

/** Confidence saturates at 1.0 after this many swipes. */
export const CONFIDENCE_SATURATION = 20

// ─── Speed multiplier ─────────────────────────────────────────────────────────

/**
 * Fast, decisive swipes carry more signal; slow, hesitant ones carry less.
 * Returns a multiplier applied on top of the base weight.
 */
export function speedMultiplier(
  viewDurationMs: number | null,
  liked: boolean,
): number {
  if (viewDurationMs == null) return 1.0
  if (liked) {
    if (viewDurationMs < 2000) return 1.4 // instant crush
    if (viewDurationMs < 6000) return 1.0 // considered like
    return 0.7 // hesitant like
  }
  if (viewDurationMs < 1500) return 1.4 // instant rejection
  if (viewDurationMs < 5000) return 1.0 // considered skip
  return 0.6 // uncertain skip
}

// ─── Feature extraction ───────────────────────────────────────────────────────

interface Features {
  country: string | null
  city: string | null
  category: string | null
  subcategories: string[]
}

function extractFeatures(item: DiscoveryItem): Features {
  return {
    country: item.country,
    city: item.city,
    category: item.tags?.category ?? null,
    subcategories: item.tags?.subcategory ?? [],
  }
}

function featureKey(type: FeatureType, value: string): string {
  return `${type}::${value}`
}

// ─── Score computation ────────────────────────────────────────────────────────

/**
 * Builds the weighted feature score map from the user's swipe history.
 * Recency and speed multipliers are applied per swipe.
 */
export function computeScores(history: SwipeRecord[]): Record<string, number> {
  const n = history.length
  const scores: Record<string, number> = {}

  history.forEach(({ item, liked, viewDurationMs }, index) => {
    // Recency: ramps from 0.5 (first swipe) to 1.0 (latest swipe).
    const recency = n > 1 ? 0.5 + 0.5 * (index / (n - 1)) : 1.0
    const speed = speedMultiplier(viewDurationMs, liked)
    const mult = recency * speed

    const f = extractFeatures(item)
    const action: 'like' | 'skip' = liked ? 'like' : 'skip'

    const bump = (type: FeatureType, value: string | null) => {
      if (!value) return
      const k = featureKey(type, value)
      scores[k] = (scores[k] ?? 0) + W[type][action] * mult
    }

    bump('country', f.country)
    bump('city', f.city)
    bump('category', f.category)
    for (const s of f.subcategories) bump('subcategory', s)
  })

  return scores
}

/** Counts how many times each city was skipped (for the veto rule). */
function computeSkipsByCity(history: SwipeRecord[]): Record<string, number> {
  const skips: Record<string, number> = {}
  for (const { item, liked } of history) {
    if (liked || !item.city) continue
    skips[item.city] = (skips[item.city] ?? 0) + 1
  }
  return skips
}

// ─── Destination ranking ──────────────────────────────────────────────────────

/**
 * Ranks every city present in `catalog` by the user's revealed preferences.
 * Vetoed cities are kept in the result (marked `vetoed`) but pushed to the end.
 */
export function rankDestinations(
  history: SwipeRecord[],
  catalog: DiscoveryItem[],
): DestinationScore[] {
  const scores = computeScores(history)
  const skipsByCity = computeSkipsByCity(history)
  const totalSwipes = history.length

  // Group catalog items by city.
  const byCity = new Map<
    string,
    { city: string; country: string; items: DiscoveryItem[] }
  >()
  for (const item of catalog) {
    if (!item.city || !item.country) continue
    const key = `${item.city}|${item.country}`
    let entry = byCity.get(key)
    if (!entry) {
      entry = { city: item.city, country: item.country, items: [] }
      byCity.set(key, entry)
    }
    entry.items.push(item)
  }

  const results: DestinationScore[] = []
  for (const { city, country, items } of byCity.values()) {
    const skipCount = skipsByCity[city] ?? 0
    const vetoed = skipCount >= VETO_THRESHOLD

    let raw = 0
    const breakdown: Record<string, number> = {}
    for (const item of items) {
      const f = extractFeatures(item)
      const add = (type: FeatureType, value: string | null) => {
        if (!value) return
        const s = scores[featureKey(type, value)] ?? 0
        raw += s
        breakdown[type] = (breakdown[type] ?? 0) + s
      }
      add('country', f.country)
      add('city', f.city)
      add('category', f.category)
      for (const sub of f.subcategories) add('subcategory', sub)
    }

    results.push({
      city,
      country,
      // Normalise by sqrt(size) to avoid biasing toward larger cities.
      score: vetoed ? Number.NEGATIVE_INFINITY : raw / Math.sqrt(items.length),
      confidence: Math.min(1, totalSwipes / CONFIDENCE_SATURATION),
      breakdown,
      itemCount: items.length,
      vetoed,
      skipCount,
    })
  }

  return results.sort((a, b) => b.score - a.score)
}

// ─── Recommendation ───────────────────────────────────────────────────────────

export function recommend(
  history: SwipeRecord[],
  catalog: DiscoveryItem[],
  topN = 3,
): RecommendationResult {
  const likes = history.filter((s) => s.liked).length
  const skips = history.length - likes

  if (history.length === 0) {
    return {
      status: 'no_data',
      totalSwipes: 0,
      likes: 0,
      skips: 0,
      confidence: 0,
      destinations: [],
      vetoedCities: [],
    }
  }

  const ranked = rankDestinations(history, catalog)
  const valid = ranked.filter((d) => !d.vetoed)
  const vetoedCities = ranked.filter((d) => d.vetoed).map((d) => d.city)

  return {
    status: valid.some((d) => d.score > 0) ? 'ok' : 'inconclusive',
    totalSwipes: history.length,
    likes,
    skips,
    confidence: valid[0]?.confidence ?? 0,
    destinations: valid.slice(0, topN),
    vetoedCities,
  }
}
