import { describe, expect, it } from 'vitest'

import {
  computeScores,
  rankDestinations,
  recommend,
  speedMultiplier,
  VETO_THRESHOLD,
} from './algorithm'
import type { DiscoveryItem, SwipeRecord } from './algorithm'

// ─── Test fixtures ─────────────────────────────────────────────────────────────

let idCounter = 0
function makeItem(
  city: string,
  country: string,
  subcategory: string[] = [],
  category = 'hotel',
): DiscoveryItem {
  idCounter += 1
  return {
    id: `item-${idCounter}`,
    locationName: `${city} place ${idCounter}`,
    url: `https://example.com/${idCounter}`,
    mainMediaUrl: 'https://example.com/img.jpg',
    carousselUrls: [],
    description: 'desc',
    country,
    city,
    tags: { category, subcategory },
  }
}

function swipe(
  item: DiscoveryItem,
  liked: boolean,
  viewDurationMs: number | null = 2000,
): SwipeRecord {
  return { item, liked, viewDurationMs }
}

// A small catalog spanning several cities.
function buildCatalog(): DiscoveryItem[] {
  const items: DiscoveryItem[] = []
  for (let i = 0; i < 8; i++)
    items.push(makeItem('Rome', 'Italie', ['spa', 'terrasse']))
  for (let i = 0; i < 8; i++)
    items.push(makeItem('Paris', 'France', ['bar', 'restaurant']))
  for (let i = 0; i < 8; i++)
    items.push(makeItem('Berlin', 'Allemagne', ['piscine']))
  for (let i = 0; i < 5; i++) items.push(makeItem('Madrid', 'Espagne', ['spa']))
  return items
}

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe('speedMultiplier', () => {
  it('rewards fast likes and penalises slow ones', () => {
    expect(speedMultiplier(1000, true)).toBe(1.4)
    expect(speedMultiplier(3000, true)).toBe(1.0)
    expect(speedMultiplier(8000, true)).toBe(0.7)
  })

  it('rewards fast skips and penalises slow ones', () => {
    expect(speedMultiplier(500, false)).toBe(1.4)
    expect(speedMultiplier(2000, false)).toBe(1.0)
    expect(speedMultiplier(7000, false)).toBe(0.6)
  })

  it('is neutral when timing is unknown', () => {
    expect(speedMultiplier(null, true)).toBe(1.0)
    expect(speedMultiplier(null, false)).toBe(1.0)
  })
})

describe('recommend', () => {
  it('returns no_data with no swipes', () => {
    const catalog = buildCatalog()
    expect(recommend([], catalog).status).toBe('no_data')
  })

  it('ranks the most-liked city first', () => {
    const catalog = buildCatalog()
    const rome = catalog.filter((i) => i.city === 'Rome')
    const paris = catalog.filter((i) => i.city === 'Paris')
    const history = [
      ...rome.slice(0, 6).map((i) => swipe(i, true, 1500)),
      ...paris.slice(0, 3).map((i) => swipe(i, false, 1000)),
    ]
    const result = recommend(history, catalog)
    expect(result.status).toBe('ok')
    expect(result.destinations[0].city).toBe('Rome')
    expect(result.destinations[0].country).toBe('Italie')
  })

  it('hard-vetoes a city skipped VETO_THRESHOLD times', () => {
    const catalog = buildCatalog()
    const berlin = catalog.filter((i) => i.city === 'Berlin')
    const rome = catalog.filter((i) => i.city === 'Rome')
    const history = [
      ...berlin.slice(0, VETO_THRESHOLD).map((i) => swipe(i, false, 1000)),
      ...rome.slice(0, 5).map((i) => swipe(i, true, 1500)),
    ]
    const result = recommend(history, catalog)
    expect(result.vetoedCities).toContain('Berlin')
    expect(result.destinations.some((d) => d.city === 'Berlin')).toBe(false)

    const ranked = rankDestinations(history, catalog)
    expect(ranked.find((d) => d.city === 'Berlin')?.vetoed).toBe(true)
  })
})

describe('recency weighting', () => {
  it('weights the most recently liked city higher', () => {
    const catalog = buildCatalog()
    const rome = catalog.filter((i) => i.city === 'Rome')
    const madrid = catalog.filter((i) => i.city === 'Madrid')

    // Like Rome first, Madrid last.
    const historyA = [
      ...rome.slice(0, 3).map((i) => swipe(i, true)),
      ...madrid.slice(0, 3).map((i) => swipe(i, true)),
    ]
    const scoresA = computeScores(historyA)
    expect(scoresA['city::Madrid']).toBeGreaterThan(scoresA['city::Rome'])

    // Reverse the order: Rome should now win.
    const historyB = [
      ...madrid.slice(0, 3).map((i) => swipe(i, true)),
      ...rome.slice(0, 3).map((i) => swipe(i, true)),
    ]
    const scoresB = computeScores(historyB)
    expect(scoresB['city::Rome']).toBeGreaterThan(scoresB['city::Madrid'])
  })
})

describe('speed weighting', () => {
  it('gives fast likes more impact than slow likes', () => {
    const catalog = buildCatalog()
    const rome = catalog.filter((i) => i.city === 'Rome').slice(0, 3)
    const fast = computeScores(rome.map((i) => swipe(i, true, 800)))
    const slow = computeScores(rome.map((i) => swipe(i, true, 9000)))
    expect(fast['city::Rome']).toBeGreaterThan(slow['city::Rome'])
  })
})

describe('confidence', () => {
  it('grows with swipe count and caps at 1', () => {
    const catalog = buildCatalog()
    const items = catalog.slice(0, 25)
    const r5 = recommend(
      items.slice(0, 5).map((i) => swipe(i, true)),
      catalog,
    )
    const r25 = recommend(
      items.map((i) => swipe(i, true)),
      catalog,
    )
    expect(r25.confidence).toBeGreaterThanOrEqual(r5.confidence)
    expect(r25.confidence).toBeLessThanOrEqual(1)
  })
})
