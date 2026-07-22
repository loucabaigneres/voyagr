import { describe, expect, it } from 'vitest';

import {
  calcNumDays,
  geoDistItem,
  interestBonus,
  planItinerary,
  parseWkt,
  pricePenalty,
  REUSE_COOLDOWN_DAYS,
} from './planner.js';
import type { ItinItem, PlannerInput } from './planner.js';

// ─── Test fixtures ─────────────────────────────────────────────────────────────

const CENTER = { lat: 48.8566, lng: 2.3522 };

let idCounter = 0;
function makeItem(category: string, overrides: Partial<ItinItem> = {}): ItinItem {
  idCounter += 1;
  return {
    activityId: `item-${idCounter}`,
    discoveryContentId: `dc-${idCounter}`,
    title: `${category} ${idCounter}`,
    locationName: null,
    description: null,
    coordinates: null,
    lat: CENTER.lat,
    lng: CENTER.lng,
    mainMediaUrl: null,
    category,
    price: '$$',
    subcategory: null,
    liked: false,
    ...overrides,
  };
}

/** Places an item `km` north of the centre, at `bearingDeg` around it. */
function at(category: string, km: number, bearingDeg: number, overrides: Partial<ItinItem> = {}) {
  const rad = (bearingDeg * Math.PI) / 180;
  const dLat = (km / 111) * Math.cos(rad);
  const dLng = ((km / 111) * Math.sin(rad)) / Math.cos((CENTER.lat * Math.PI) / 180);
  return makeItem(category, { lat: CENTER.lat + dLat, lng: CENTER.lng + dLng, ...overrides });
}

function makeInput(overrides: Partial<PlannerInput> = {}): PlannerInput {
  return {
    numDays: 3,
    intensity: 'balanced',
    averagePrice: 'mid',
    interests: [],
    center: CENTER,
    hotels: [at('hotel', 1, 0), at('hotel', 2, 90), at('hotel', 3, 180), at('hotel', 4, 270)],
    activities: Array.from({ length: 12 }, (_, i) => at('activité', 1 + (i % 4), i * 30)),
    restaurants: Array.from({ length: 10 }, (_, i) => at('restaurant', 1 + (i % 3), i * 36)),
    ...overrides,
  };
}

const categoriesOf = (day: ItinItem[]) => day.map((i) => i.category);

// ─── Geo & scoring helpers ─────────────────────────────────────────────────────

describe('parseWkt', () => {
  it('reads lng/lat out of a WKT point', () => {
    expect(parseWkt('POINT(2.3522 48.8566)')).toEqual({ lng: 2.3522, lat: 48.8566 });
  });

  it('returns null on missing or malformed input', () => {
    expect(parseWkt(null)).toBeNull();
    expect(parseWkt('not a point')).toBeNull();
  });
});

describe('geoDistItem', () => {
  it('penalises items without coordinates instead of scoring them at distance 0', () => {
    const noCoords = geoDistItem({ lat: null, lng: null }, CENTER);
    const farAway = geoDistItem({ lat: CENTER.lat + 0.1, lng: CENTER.lng }, CENTER);
    expect(noCoords).toBeGreaterThan(farAway);
  });
});

describe('pricePenalty', () => {
  it('does not penalise $$$$ on a premium trip', () => {
    // The catalog goes up to 4 tiers; premium must target the top one.
    expect(pricePenalty('$$$$', 4)).toBe(0);
  });

  it('grows with the distance to the target tier', () => {
    expect(pricePenalty('$', 4)).toBeGreaterThan(pricePenalty('$$$', 4));
  });

  it('stays neutral when the price is unknown', () => {
    expect(pricePenalty(null, 2)).toBe(0);
  });
});

describe('interestBonus', () => {
  it('matches keywords regardless of accents and casing', () => {
    const museum = makeItem('activité', { title: 'Musée du Louvre' });
    const plain = makeItem('activité', { title: 'Bureau de poste' });
    expect(interestBonus(museum, ['culture'])).toBeGreaterThan(0);
    expect(interestBonus(plain, ['culture'])).toBe(0);
  });

  it('matches on subcategories too', () => {
    const item = makeItem('activité', { subcategory: ['rooftop'] });
    expect(interestBonus(item, ['nightlife'])).toBeGreaterThan(0);
  });

  it('is capped so one item cannot dominate every pick', () => {
    const everything = makeItem('activité', {
      title: 'Musée',
      description: 'parc, bar, kayak, marché',
    });
    const oneMatch = makeItem('activité', { title: 'Musée' });
    expect(interestBonus(everything, ['culture', 'nature', 'nightlife', 'adventure'])).toBe(
      2 * interestBonus(oneMatch, ['culture']),
    );
  });
});

describe('calcNumDays', () => {
  it('defaults to 3 and clamps to 14', () => {
    expect(calcNumDays(null)).toBe(3);
    expect(calcNumDays(0)).toBe(3);
    expect(calcNumDays(30)).toBe(14);
    expect(calcNumDays(7)).toBe(7);
  });
});

// ─── Hotels ────────────────────────────────────────────────────────────────────

describe('planItinerary — hotels', () => {
  it('keeps one single hotel for the whole stay, whatever the duration', () => {
    for (const numDays of [1, 3, 7, 14]) {
      const { days, mainHotel } = planItinerary(makeInput({ numDays }));
      const hotels = new Set(
        days
          .flat()
          .filter((i) => i.category === 'hotel')
          .map((i) => i.activityId),
      );
      expect(hotels.size).toBe(1);
      expect([...hotels][0]).toBe(mainHotel!.activityId);
    }
  });

  it('opens each day on the hotel', () => {
    const { days, mainHotel } = planItinerary(makeInput({ numDays: 5 }));
    for (const day of days) expect(day[0]!.activityId).toBe(mainHotel!.activityId);
  });

  it('offers alternatives that are distinct from the main hotel and spread out', () => {
    const { mainHotel, alternativeHotels } = planItinerary(makeInput());
    expect(alternativeHotels.length).toBeGreaterThanOrEqual(2);
    expect(alternativeHotels.length).toBeLessThanOrEqual(3);
    expect(alternativeHotels.map((h) => h.activityId)).not.toContain(mainHotel!.activityId);
  });

  it('drops alternatives sitting on the same spot as one already kept', () => {
    const twin = at('hotel', 1, 0);
    const { alternativeHotels } = planItinerary(
      makeInput({ hotels: [at('hotel', 1, 0), twin, at('hotel', 5, 180)] }),
    );
    expect(alternativeHotels.map((h) => h.activityId)).not.toContain(twin.activityId);
    expect(alternativeHotels).toHaveLength(1);
  });

  it('prefers a hotel the user liked during the swipe flow', () => {
    const liked = at('hotel', 6, 45, { liked: true });
    const { mainHotel } = planItinerary(
      makeInput({ hotels: [at('hotel', 1, 0), at('hotel', 2, 90), liked] }),
    );
    expect(mainHotel!.activityId).toBe(liked.activityId);
  });

  it('still plans days when no hotel is available', () => {
    const { days, mainHotel } = planItinerary(makeInput({ hotels: [] }));
    expect(mainHotel).toBeNull();
    expect(days).toHaveLength(3);
    for (const day of days) expect(categoriesOf(day)).not.toContain('hotel');
  });
});

// ─── Pace ──────────────────────────────────────────────────────────────────────

describe('planItinerary — pace', () => {
  it.each([
    ['chill', 1],
    ['balanced', 2],
    ['intense', 3],
  ] as const)('gives %s trips %i activities per day', (intensity, expected) => {
    const { days } = planItinerary(makeInput({ intensity, numDays: 4 }));
    for (const day of days) {
      expect(day.filter((i) => i.category === 'activité')).toHaveLength(expected);
    }
  });

  it('produces exactly one day plan per day of the trip', () => {
    expect(planItinerary(makeInput({ numDays: 1 })).days).toHaveLength(1);
    expect(planItinerary(makeInput({ numDays: 14 })).days).toHaveLength(14);
  });
});

// ─── Restaurants ───────────────────────────────────────────────────────────────

describe('planItinerary — restaurants', () => {
  it('books lunch and dinner every day', () => {
    const { days } = planItinerary(makeInput({ numDays: 5 }));
    for (const day of days) {
      expect(day.filter((i) => i.category === 'restaurant')).toHaveLength(2);
    }
  });

  it('orders the day as hotel → activities → lunch → activities → dinner', () => {
    const { days } = planItinerary(makeInput({ intensity: 'intense', numDays: 2 }));
    // 3 activities split 2 / 1 around lunch.
    expect(categoriesOf(days[0]!)).toEqual([
      'hotel',
      'activité',
      'activité',
      'restaurant',
      'activité',
      'restaurant',
    ]);
  });

  it('never serves the same restaurant twice in one day', () => {
    const { days } = planItinerary(makeInput({ restaurants: [at('restaurant', 1, 0)] }));
    for (const day of days) {
      const restos = day.filter((i) => i.category === 'restaurant');
      expect(new Set(restos.map((i) => i.activityId)).size).toBe(restos.length);
    }
  });
});

// ─── Thin pools ────────────────────────────────────────────────────────────────

describe('planItinerary — thin pools', () => {
  it('fills every day of a long trip from a small catalog', () => {
    const { days } = planItinerary(
      makeInput({
        numDays: 14,
        intensity: 'intense',
        activities: Array.from({ length: 5 }, (_, i) => at('activité', 1 + i, i * 72)),
        restaurants: Array.from({ length: 3 }, (_, i) => at('restaurant', 1 + i, i * 120)),
      }),
    );

    expect(days).toHaveLength(14);
    for (const day of days) {
      expect(day.filter((i) => i.category === 'activité')).toHaveLength(3);
      expect(day.filter((i) => i.category === 'restaurant')).toHaveLength(2);
    }
  });

  it('never repeats an activity within one day', () => {
    const { days } = planItinerary(
      makeInput({
        numDays: 10,
        intensity: 'intense',
        activities: [at('activité', 1, 0), at('activité', 2, 180)],
      }),
    );
    for (const day of days) {
      const acts = day.filter((i) => i.category === 'activité');
      expect(new Set(acts.map((i) => i.activityId)).size).toBe(acts.length);
    }
  });

  it('spaces a reused activity out by the cooldown when the pool allows it', () => {
    const activities = Array.from({ length: 4 }, (_, i) => at('activité', 1 + i, i * 90));
    const { days } = planItinerary(makeInput({ numDays: 8, intensity: 'chill', activities }));

    const lastSeen = new Map<string, number>();
    for (const [dayIndex, day] of days.entries()) {
      for (const act of day.filter((i) => i.category === 'activité')) {
        const previous = lastSeen.get(act.activityId);
        if (previous != null) {
          expect(dayIndex - previous).toBeGreaterThanOrEqual(REUSE_COOLDOWN_DAYS);
        }
        lastSeen.set(act.activityId, dayIndex);
      }
    }
  });

  it('copes with empty pools', () => {
    const { days } = planItinerary(makeInput({ activities: [], restaurants: [], hotels: [] }));
    expect(days).toHaveLength(3);
    for (const day of days) expect(day).toEqual([]);
  });
});

// ─── Interests & budget ────────────────────────────────────────────────────────

describe('planItinerary — preferences', () => {
  it('puts a matching activity ahead of a closer neutral one', () => {
    const museum = at('activité', 4, 0, { title: 'Musée national' });
    const parking = at('activité', 1, 0, { title: 'Parking souterrain' });

    const withInterest = planItinerary(
      makeInput({
        numDays: 1,
        intensity: 'chill',
        interests: ['culture'],
        activities: [parking, museum],
        hotels: [],
      }),
    );
    expect(withInterest.days[0]!.some((i) => i.activityId === museum.activityId)).toBe(true);

    const without = planItinerary(
      makeInput({
        numDays: 1,
        intensity: 'chill',
        interests: [],
        activities: [parking, museum],
        hotels: [],
      }),
    );
    expect(without.days[0]!.some((i) => i.activityId === parking.activityId)).toBe(true);
  });

  it('sends a premium trip to the top price tier', () => {
    const luxury = at('hotel', 3, 0, { price: '$$$$' });
    const cheap = at('hotel', 1, 0, { price: '$' });
    const { mainHotel } = planItinerary(
      makeInput({ averagePrice: 'premium', hotels: [cheap, luxury] }),
    );
    expect(mainHotel!.activityId).toBe(luxury.activityId);
  });

  it('sends a budget trip to the bottom price tier', () => {
    const luxury = at('hotel', 1, 0, { price: '$$$$' });
    const cheap = at('hotel', 3, 0, { price: '$' });
    const { mainHotel } = planItinerary(
      makeInput({ averagePrice: 'budget', hotels: [cheap, luxury] }),
    );
    expect(mainHotel!.activityId).toBe(cheap.activityId);
  });
});

// ─── Determinism ───────────────────────────────────────────────────────────────

describe('planItinerary — determinism', () => {
  it('returns an identical planning for an identical input', () => {
    const input = makeInput({ numDays: 7, intensity: 'intense', interests: ['culture'] });
    const first = planItinerary(input);
    const second = planItinerary(input);

    expect(second.days.map((d) => d.map((i) => i.activityId))).toEqual(
      first.days.map((d) => d.map((i) => i.activityId)),
    );
    expect(second.mainHotel!.activityId).toBe(first.mainHotel!.activityId);
    expect(second.alternativeHotels.map((h) => h.activityId)).toEqual(
      first.alternativeHotels.map((h) => h.activityId),
    );
  });
});

// ─── Interests fixture guard ───────────────────────────────────────────────────

describe('planItinerary — interests wiring', () => {
  it('reads the interests passed in the input', () => {
    const nightlife = at('activité', 5, 0, { subcategory: ['rooftop'] });
    const neutral = at('activité', 2, 0, { title: 'Laverie' });
    const { days } = planItinerary(
      makeInput({
        numDays: 1,
        intensity: 'chill',
        interests: ['nightlife'],
        activities: [neutral, nightlife],
        hotels: [],
      }),
    );
    expect(days[0]!.some((i) => i.activityId === nightlife.activityId)).toBe(true);
  });
});
