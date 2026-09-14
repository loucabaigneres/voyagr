/**
 * Itinerary planner.
 *
 * Pure, framework-agnostic and fully deterministic: the same input always
 * produces the same planning. Given the trip preferences and the pools of
 * hotels / activities / restaurants available in the destination city, it
 * lays out one day plan per day of the trip.
 *
 * Planning pipeline:
 * 1. A single main hotel is chosen for the whole stay, close to where the
 *    user will actually spend their days, plus a few alternatives.
 * 2. The best activities are picked, then grouped into geographic sectors
 *    around the hotel so each day is a walk in one neighbourhood.
 * 3. Days are ordered as a real route (nearest-neighbour chain from the hotel).
 * 4. Lunch and dinner are slotted into that route.
 *
 * All scores are expressed in kilometre-equivalents and lower is better, so
 * distance, budget fit and interest match can be summed on the same scale.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ItinItem = {
  activityId: string;
  discoveryContentId: string | null;
  title: string;
  locationName: string | null;
  description: string | null;
  coordinates: string | null;
  lat: number | null;
  lng: number | null;
  mainMediaUrl: string | null;
  category: string;
  price: string | null;
  subcategory: string[] | null;
  /** True when the user explicitly liked this place during the swipe flow. */
  liked: boolean;
};

export type Intensity = 'chill' | 'balanced' | 'intense';
export type AveragePrice = 'budget' | 'mid' | 'premium';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface PlannerInput {
  numDays: number;
  intensity: Intensity | null;
  averagePrice: AveragePrice | null;
  interests: string[];
  /** Fallback anchor used before a hotel is known, and when no hotel is found. */
  center: GeoPoint;
  hotels: ItinItem[];
  activities: ItinItem[];
  restaurants: ItinItem[];
}

export interface PlannerOutput {
  /** One entry per day, already ordered; `days[0]` is day 1. */
  days: ItinItem[][];
  mainHotel: ItinItem | null;
  alternativeHotels: ItinItem[];
}

// ─── Tuning constants ─────────────────────────────────────────────────────────

/** `budget` -> `$`, `mid` -> `$$`, `premium` -> `$$$$` (the catalog goes up to 4 tiers). */
const PRICE_TARGET_RANK: Record<AveragePrice, number> = { budget: 1, mid: 2, premium: 4 };

/** How many activities a day holds, per trip pace. */
const INTENSITY_ACTS_PER_DAY: Record<Intensity, number> = { chill: 1, balanced: 2, intense: 3 };

/** Km-equivalent cost of drifting one price tier away from the trip's budget. */
const PRICE_PENALTY_PER_TIER = 8;

/**
 * Km-equivalent cost of missing coordinates. Without it such items score as if
 * they sat exactly on the anchor and win every single pick.
 */
const MISSING_COORDS_PENALTY = 50;

/** Km-equivalent bonus per matched interest, and how many matches can count. */
const INTEREST_BONUS = 10;
const MAX_COUNTED_INTERESTS = 2;

/** Km-equivalent bonus for a place the user liked during the swipe flow. */
const LIKED_BONUS = 25;

const MAX_ALTERNATIVE_HOTELS = 3;
/** Alternatives must be this far apart, otherwise they are the same offer twice. */
const MIN_ALTERNATIVE_SEPARATION_KM = 1;

/** A place may be reused only after this many days have passed. */
export const REUSE_COOLDOWN_DAYS = 3;

// ─── Geo helpers ──────────────────────────────────────────────────────────────

const toRad = (d: number) => (d * Math.PI) / 180;

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/** Compass bearing from one point to another, in radians over [0, 2π). */
function bearing(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const dLng = toRad(toLng - fromLng);
  const y = Math.sin(dLng) * Math.cos(toRad(toLat));
  const x =
    Math.cos(toRad(fromLat)) * Math.sin(toRad(toLat)) -
    Math.sin(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.cos(dLng);
  return (Math.atan2(y, x) + 2 * Math.PI) % (2 * Math.PI);
}

export function parseWkt(wkt: string | null): GeoPoint | null {
  if (!wkt) return null;
  const m = wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (!m) return null;
  return { lng: parseFloat(m[1]!), lat: parseFloat(m[2]!) };
}

/** Distance from an item to an anchor. Items without coordinates get a flat penalty. */
export function geoDistItem(item: Pick<ItinItem, 'lat' | 'lng'>, anchor: GeoPoint): number {
  if (item.lat == null || item.lng == null) return MISSING_COORDS_PENALTY;
  return haversine(item.lat, item.lng, anchor.lat, anchor.lng);
}

/** Barycentre of the items that have coordinates, or `fallback` if none do. */
function centroid(items: ItinItem[], fallback: GeoPoint): GeoPoint {
  const pts = items.filter((i) => i.lat != null && i.lng != null);
  if (pts.length === 0) return fallback;
  return {
    lat: pts.reduce((s, i) => s + i.lat!, 0) / pts.length,
    lng: pts.reduce((s, i) => s + i.lng!, 0) / pts.length,
  };
}

// ─── Budget helpers ───────────────────────────────────────────────────────────

/** `""`, `"$"`, `"$$"`, ... -> 0, 1, 2, ... Missing price data is treated as neutral. */
export function priceRank(price: string | null): number | null {
  if (!price) return null;
  return price.length;
}

export function pricePenalty(price: string | null, targetRank: number): number {
  const rank = priceRank(price);
  if (rank == null) return 0;
  return Math.abs(rank - targetRank) * PRICE_PENALTY_PER_TIER;
}

// ─── Interest matching ────────────────────────────────────────────────────────

/**
 * The catalog's subcategories describe amenities (`spa`, `rooftop`, `plage`, ...)
 * and do not line up with the five interests offered by the trip form, so
 * interests are matched by keyword over the item's text instead.
 */
const INTEREST_KEYWORDS: Record<string, string[]> = {
  culture: [
    'musee',
    'monument',
    'cathedrale',
    'eglise',
    'chateau',
    'historique',
    'art',
    'galerie',
    'exposition',
    'patrimoine',
  ],
  gastronomy: [
    'gastronomi',
    'marche',
    'bistro',
    'tapas',
    'degustation',
    'cave',
    'vin',
    'culinaire',
  ],
  nature: ['parc', 'jardin', 'plage', 'nature', 'lac', 'randonnee', 'botanique', 'foret'],
  adventure: ['aventure', 'sport', 'kayak', 'velo', 'escalade', 'plongee', 'excursion', 'surf'],
  nightlife: ['bar', 'rooftop', 'club', 'cocktail', 'discotheque', 'nuit', 'nocturne'],
};

/** Lowercase and strip diacritics so "musée" and "musee" match the same keyword. */
function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function haystack(item: ItinItem): string {
  return normalize(
    [item.title, item.locationName, item.description, ...(item.subcategory ?? [])]
      .filter(Boolean)
      .join(' '),
  );
}

/**
 * Km-equivalent bonus for how well an item matches the user's interests.
 * A bonus, never a filter: a thin pool can still fill the planning.
 */
export function interestBonus(item: ItinItem, interests: string[]): number {
  if (interests.length === 0) return 0;
  const text = haystack(item);
  let matches = 0;
  for (const interest of interests) {
    const keywords = INTEREST_KEYWORDS[interest.toLowerCase()];
    if (!keywords) continue;
    if (keywords.some((k) => text.includes(k))) matches += 1;
  }
  return Math.min(matches, MAX_COUNTED_INTERESTS) * INTEREST_BONUS;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

interface ScoreContext {
  targetPriceRank: number;
  interests: string[];
}

/** Distance, corrected by budget fit, interest match and explicit likes. Lower is better. */
function scoreItem(item: ItinItem, anchor: GeoPoint, ctx: ScoreContext): number {
  return (
    geoDistItem(item, anchor) +
    pricePenalty(item.price, ctx.targetPriceRank) -
    interestBonus(item, ctx.interests) -
    (item.liked ? LIKED_BONUS : 0)
  );
}

/** `Array.prototype.sort` is stable, so equal scores keep pool order — deterministic. */
function byScore(pool: ItinItem[], anchor: GeoPoint, ctx: ScoreContext): ItinItem[] {
  return [...pool].sort((a, b) => scoreItem(a, anchor, ctx) - scoreItem(b, anchor, ctx));
}

// ─── Reuse policy ─────────────────────────────────────────────────────────────

/**
 * Picks places while avoiding repetition as long as possible.
 *
 * Destination pools are small (a city holds ~15 activities and ~10 restaurants)
 * so a two-week trip cannot be filled with unique places. Rather than leaving
 * days empty, a place may come back once it has been off the planning for
 * `REUSE_COOLDOWN_DAYS`.
 */
function createPicker(pool: ItinItem[], ctx: ScoreContext) {
  const lastUsedDay = new Map<string, number>();

  const markUsed = (item: ItinItem, dayIndex: number) => {
    lastUsedDay.set(item.activityId, dayIndex);
  };

  /** @param exclude ids already placed in the day being built. */
  const pick = (
    anchor: GeoPoint,
    dayIndex: number,
    exclude: Set<string> = new Set(),
  ): ItinItem | undefined => {
    const candidates = byScore(
      pool.filter((i) => !exclude.has(i.activityId)),
      anchor,
      ctx,
    );
    if (candidates.length === 0) return undefined;

    const chosen =
      candidates.find((i) => !lastUsedDay.has(i.activityId)) ??
      candidates.find((i) => dayIndex - lastUsedDay.get(i.activityId)! >= REUSE_COOLDOWN_DAYS) ??
      candidates[0]!;

    markUsed(chosen, dayIndex);
    return chosen;
  };

  return { pick, markUsed };
}

// ─── Hotel selection ──────────────────────────────────────────────────────────

/**
 * One hotel for the whole stay — a trip targets a single city, so moving hotels
 * every few days would be noise. A few alternatives are offered alongside it.
 */
function selectHotels(
  hotels: ItinItem[],
  focus: GeoPoint,
  ctx: ScoreContext,
): { mainHotel: ItinItem | null; alternativeHotels: ItinItem[] } {
  const ranked = byScore(hotels, focus, ctx);
  const mainHotel = ranked[0] ?? null;
  if (!mainHotel) return { mainHotel: null, alternativeHotels: [] };

  const alternativeHotels: ItinItem[] = [];
  for (const candidate of ranked.slice(1)) {
    if (alternativeHotels.length >= MAX_ALTERNATIVE_HOTELS) break;
    // Skip hotels sitting on top of the main one or of an alternative already
    // kept: three offers on the same street are one offer.
    const tooClose = [mainHotel, ...alternativeHotels].some((kept) => {
      if (candidate.lat == null || candidate.lng == null || kept.lat == null || kept.lng == null) {
        return false;
      }
      return (
        haversine(candidate.lat, candidate.lng, kept.lat, kept.lng) < MIN_ALTERNATIVE_SEPARATION_KM
      );
    });
    if (!tooClose) alternativeHotels.push(candidate);
  }

  return { mainHotel, alternativeHotels };
}

// ─── Day building ─────────────────────────────────────────────────────────────

/**
 * Splits activities into `numDays` geographic sectors around the anchor.
 *
 * Sorting by bearing then slicing keeps each day inside one angular wedge of
 * the city, which reads as a neighbourhood walk instead of a back-and-forth
 * across town. Sectors are then interleaved near/far so the trip does not end
 * on a run of remote days.
 */
function groupIntoSectors(items: ItinItem[], anchor: GeoPoint, numDays: number): ItinItem[][] {
  const sectors: ItinItem[][] = Array.from({ length: numDays }, () => []);
  if (items.length === 0) return sectors;

  const byBearing = [...items].sort(
    (a, b) =>
      bearing(anchor.lat, anchor.lng, a.lat ?? anchor.lat, a.lng ?? anchor.lng) -
      bearing(anchor.lat, anchor.lng, b.lat ?? anchor.lat, b.lng ?? anchor.lng),
  );

  // Spread as evenly as possible: the first `remainder` sectors take one extra.
  const base = Math.floor(byBearing.length / numDays);
  const remainder = byBearing.length % numDays;
  const filled: ItinItem[][] = [];
  let cursor = 0;
  for (let i = 0; i < numDays; i++) {
    const size = base + (i < remainder ? 1 : 0);
    filled.push(byBearing.slice(cursor, cursor + size));
    cursor += size;
  }

  // Interleave from both ends of the near→far ordering.
  const sortedByDistance = filled
    .map((sector, index) => ({
      sector,
      index,
      dist: geoDistItem(centroid(sector, anchor), anchor),
    }))
    .sort((a, b) => a.dist - b.dist || a.index - b.index);

  let near = 0;
  let far = sortedByDistance.length - 1;
  for (let day = 0; day < numDays; day++) {
    sectors[day] =
      day % 2 === 0 ? sortedByDistance[near++]!.sector : sortedByDistance[far--]!.sector;
  }
  return sectors;
}

/** Orders a day's activities as a route: nearest-neighbour chain from the hotel. */
function chainFromAnchor(items: ItinItem[], anchor: GeoPoint): ItinItem[] {
  const remaining = [...items];
  const route: ItinItem[] = [];
  let current = anchor;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = geoDistItem(remaining[i]!, current);
      if (d < bestDist) {
        bestDist = d;
        bestIndex = i;
      }
    }
    const next = remaining.splice(bestIndex, 1)[0]!;
    route.push(next);
    if (next.lat != null && next.lng != null) current = { lat: next.lat, lng: next.lng };
  }

  return route;
}

// ─── Entry point ──────────────────────────────────────────────────────────────

/** Clamps a trip to a supported length; defaults to 3 days when unknown. */
export function calcNumDays(durationDays: number | null): number {
  if (!durationDays) return 3;
  return Math.max(1, Math.min(durationDays, 14));
}

export function planItinerary(input: PlannerInput): PlannerOutput {
  const { numDays, center, hotels, activities, restaurants, interests } = input;
  const ctx: ScoreContext = {
    targetPriceRank: PRICE_TARGET_RANK[input.averagePrice ?? 'mid'],
    interests,
  };
  const actsPerDay = INTENSITY_ACTS_PER_DAY[input.intensity ?? 'balanced'];
  const totalActivitySlots = numDays * actsPerDay;

  // 1. Anchor the hotel on where the days will actually happen, not on the
  //    geometric centre of the catalog.
  const focus = centroid(byScore(activities, center, ctx).slice(0, totalActivitySlots), center);
  const { mainHotel, alternativeHotels } = selectHotels(hotels, focus, ctx);
  const anchor: GeoPoint =
    mainHotel?.lat != null && mainHotel.lng != null
      ? { lat: mainHotel.lat, lng: mainHotel.lng }
      : center;

  // 2. Re-rank around the chosen hotel, then carve the selection into sectors.
  const selected = byScore(activities, anchor, ctx).slice(0, totalActivitySlots);
  const sectors = groupIntoSectors(selected, anchor, numDays);

  const activityPicker = createPicker(activities, ctx);
  const restaurantPicker = createPicker(restaurants, ctx);

  const days: ItinItem[][] = [];
  for (let dayIndex = 0; dayIndex < numDays; dayIndex++) {
    const dayActivities = [...sectors[dayIndex]!];
    for (const item of dayActivities) activityPicker.markUsed(item, dayIndex);

    // A sector can come up short when the pool is thinner than the pace asks
    // for; top it up rather than shipping a half-empty day.
    const inDay = new Set(dayActivities.map((i) => i.activityId));
    while (dayActivities.length < actsPerDay) {
      const extra = activityPicker.pick(anchor, dayIndex, inDay);
      if (!extra) break;
      dayActivities.push(extra);
      inDay.add(extra.activityId);
    }

    const route = chainFromAnchor(dayActivities, anchor);
    const dayCentre = centroid(route, anchor);

    // Lunch out where the day happens, dinner back near the hotel.
    const lunch = restaurantPicker.pick(dayCentre, dayIndex);
    const dinner = restaurantPicker.pick(
      anchor,
      dayIndex,
      new Set(lunch ? [lunch.activityId] : []),
    );

    const midpoint = Math.ceil(route.length / 2);
    const plan: ItinItem[] = [
      ...(mainHotel ? [mainHotel] : []),
      ...route.slice(0, midpoint),
      ...(lunch ? [lunch] : []),
      ...route.slice(midpoint),
      ...(dinner ? [dinner] : []),
    ];
    days.push(plan);
  }

  return { days, mainHotel, alternativeHotels };
}
