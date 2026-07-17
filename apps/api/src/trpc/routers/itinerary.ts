import type { TRPCRouterRecord } from '@trpc/server';
import { TRPCError } from '@trpc/server';
import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { z } from 'zod';

import { activity, discoveryContent, trip, tripDay } from '../../lib/tables.js';
import { publicProcedure } from '../init.js';
import { getCatalog } from './discovery.js';

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
};

// ─── Budget / pace helpers ──────────────────────────────────────────────────────

const PRICE_TARGET_RANK: Record<string, number> = { budget: 1, mid: 2, premium: 3 };
const INTENSITY_ACTS_PER_DAY: Record<string, number> = { chill: 1, balanced: 2, intense: 3 };

/** `""`, `"$"`, `"$$"`, ... -> 0, 1, 2, ... Missing price data is treated as neutral. */
function priceRank(price: string | null): number | null {
  if (!price) return null;
  return price.length;
}

/** Distance-equivalent penalty (km) for how far an item's price tier is from the trip's target. */
function pricePenalty(price: string | null, targetRank: number): number {
  const rank = priceRank(price);
  if (rank == null) return 0;
  return Math.abs(rank - targetRank) * 8;
}

// ─── Geo helpers ──────────────────────────────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export function parseWkt(wkt: string | null): { lat: number; lng: number } | null {
  if (!wkt) return null;
  const m = wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (!m) return null;
  return { lng: parseFloat(m[1]), lat: parseFloat(m[2]) };
}

function geoDistItem(
  item: { lat: number | null; lng: number | null },
  lat: number,
  lng: number,
): number {
  if (item.lat == null || item.lng == null) return 0;
  return haversine(item.lat, item.lng, lat, lng);
}

/** Geo distance plus a penalty for drifting away from the trip's target budget tier. */
function scoreItem(item: ItinItem, lat: number, lng: number, targetPriceRank: number): number {
  return geoDistItem(item, lat, lng) + pricePenalty(item.price, targetPriceRank);
}

function calcNumDays(durationDays: number | null): number {
  if (!durationDays) return 3;
  return Math.max(1, Math.min(durationDays, 14));
}

// ─── DB fetch ─────────────────────────────────────────────────────────────────

async function fetchNearbyFromDb(
  db: any,
  category: string,
  city: string,
  lat: number,
  lng: number,
  limit: number,
): Promise<ItinItem[]> {
  const rows = await db
    .select({
      id: discoveryContent.id,
      locationName: discoveryContent.locationName,
      title: discoveryContent.title,
      description: discoveryContent.description,
      mainMediaUrl: discoveryContent.mainMediaUrl,
      coordinates: discoveryContent.coordinates,
      price: sql<string | null>`${discoveryContent.tags}->>'price'`,
    })
    .from(discoveryContent)
    .where(
      and(
        sql`${discoveryContent.tags}->>'category' = ${category}`,
        eq(discoveryContent.city, city),
        isNotNull(discoveryContent.coordinates),
        eq(discoveryContent.isActive, true),
      ),
    );

  return (
    rows as Array<{
      id: string;
      locationName: string | null;
      title: string | null;
      description: string | null;
      mainMediaUrl: string | null;
      coordinates: string | null;
      price: string | null;
    }>
  )
    .map((r) => {
      const coords = parseWkt(r.coordinates);
      return {
        activityId: `db:${r.id}`,
        discoveryContentId: r.id,
        title: r.locationName ?? r.title ?? 'Lieu',
        locationName: r.locationName,
        description: r.description,
        coordinates: r.coordinates,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        mainMediaUrl: r.mainMediaUrl,
        category,
        price: r.price,
      };
    })
    .sort((a, b) => geoDistItem(a, lat, lng) - geoDistItem(b, lat, lng))
    .slice(0, limit);
}

// ─── Pool builder ─────────────────────────────────────────────────────────────

function buildPool(
  likedItems: ItinItem[],
  dbItems: ItinItem[],
  catalogItems: ItinItem[],
): ItinItem[] {
  const likedContentIds = new Set(likedItems.map((a) => a.discoveryContentId).filter(Boolean));
  const dbTitles = new Set(dbItems.map((a) => a.title.toLowerCase().trim()));
  return [
    ...likedItems,
    ...dbItems.filter((a) => !likedContentIds.has(a.discoveryContentId)),
    ...catalogItems.filter((i) => !dbTitles.has(i.title.toLowerCase().trim())),
  ];
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const itineraryRouter = {
  getTrip: publicProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [tripRow] = await ctx.db.select().from(trip).where(eq(trip.id, input.tripId));
      if (!tripRow) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trip introuvable.' });

      const rows = await ctx.db
        .select({
          dayId: tripDay.id,
          dayIndex: tripDay.dayIndex,
          targetDate: tripDay.targetDate,
          summary: tripDay.summary,
          activityId: activity.id,
          activityTitle: activity.title,
          activityLocationName: activity.locationName,
          activityDescription: activity.description,
          activityOrderIndex: activity.orderIndex,
          activityCoordinates: activity.coordinates,
          mainMediaUrl: discoveryContent.mainMediaUrl,
          sourceUrl: discoveryContent.url,
          discoveryContentId: activity.discoveryContentId,
          dbCategory: sql<string | null>`${discoveryContent.tags}->>'category'`,
        })
        .from(tripDay)
        .leftJoin(activity, eq(activity.tripDayId, tripDay.id))
        .leftJoin(discoveryContent, eq(activity.discoveryContentId, discoveryContent.id))
        .where(eq(tripDay.tripId, input.tripId))
        .orderBy(asc(tripDay.dayIndex), asc(activity.orderIndex));

      type DayEntry = {
        id: string;
        dayIndex: number;
        targetDate: string | null;
        summary: string | null;
        activities: Array<{
          id: string;
          title: string;
          locationName: string | null;
          description: string | null;
          coordinates: string | null;
          orderIndex: number;
          mainMediaUrl: string | null;
          sourceUrl: string | null;
          discoveryContentId: string | null;
          category: string | null;
        }>;
      };

      const dayMap = new Map<string, DayEntry>();
      for (const row of rows) {
        if (!dayMap.has(row.dayId)) {
          dayMap.set(row.dayId, {
            id: row.dayId,
            dayIndex: row.dayIndex,
            targetDate: row.targetDate,
            summary: row.summary,
            activities: [],
          });
        }
        if (row.activityId) {
          dayMap.get(row.dayId)!.activities.push({
            id: row.activityId,
            title: row.activityTitle ?? '',
            locationName: row.activityLocationName,
            description: row.activityDescription,
            coordinates: row.activityCoordinates,
            orderIndex: row.activityOrderIndex ?? 0,
            mainMediaUrl: row.mainMediaUrl,
            sourceUrl: row.sourceUrl,
            discoveryContentId: row.discoveryContentId,
            category: row.dbCategory ?? null,
          });
        }
      }

      const days = [...dayMap.values()].sort((a, b) => a.dayIndex - b.dayIndex);
      return {
        trip: tripRow,
        days,
        isGenerated: days.some((d) => d.dayIndex > 0),
      };
    }),

  generateItinerary: publicProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [tripRow] = await ctx.db.select().from(trip).where(eq(trip.id, input.tripId));
      if (!tripRow) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trip introuvable.' });

      const existingDays = await ctx.db
        .select({ id: tripDay.id })
        .from(tripDay)
        .where(eq(tripDay.tripId, input.tripId));
      const dayIds = existingDays.map((d) => d.id);

      const rawLiked =
        dayIds.length > 0
          ? await ctx.db
              .select({
                activityId: activity.id,
                discoveryContentId: activity.discoveryContentId,
                title: activity.title,
                locationName: activity.locationName,
                description: activity.description,
                coordinates: activity.coordinates,
                mainMediaUrl: discoveryContent.mainMediaUrl,
                dbCategory: sql<string | null>`${discoveryContent.tags}->>'category'`,
                dbPrice: sql<string | null>`${discoveryContent.tags}->>'price'`,
              })
              .from(activity)
              .leftJoin(discoveryContent, eq(activity.discoveryContentId, discoveryContent.id))
              .where(inArray(activity.tripDayId, dayIds))
          : [];

      const catalog = await getCatalog(ctx.db);
      const tripCity = tripRow.destination ?? '';

      // Single catalog pass: build catByCoords + per-category pools for this city
      const catByCoords = new Map<string, string | null>();
      const catalogByCategory = new Map<string, ItinItem[]>();
      for (const i of catalog) {
        if (i.coordinates) catByCoords.set(i.coordinates, i.tags?.category ?? null);
        const cityMatch = i.city === tripCity || i.city?.toLowerCase() === tripCity.toLowerCase();
        if (!cityMatch || !i.tags?.category) continue;
        const coords = parseWkt(i.coordinates ?? null);
        const bucket = catalogByCategory.get(i.tags.category) ?? [];
        bucket.push({
          activityId: `catalog:${i.id}`,
          discoveryContentId: null,
          title: i.locationName ?? 'Lieu',
          locationName: i.locationName,
          description: i.description,
          coordinates: i.coordinates ?? null,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          mainMediaUrl: i.mainMediaUrl,
          category: i.tags.category,
          price: (i.tags.price as string | undefined) ?? null,
        });
        catalogByCategory.set(i.tags.category, bucket);
      }

      const liked: ItinItem[] = rawLiked.map((r) => {
        const coords = parseWkt(r.coordinates);
        return {
          activityId: r.activityId,
          discoveryContentId: r.discoveryContentId,
          title: r.title,
          locationName: r.locationName,
          description: r.description,
          coordinates: r.coordinates,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          mainMediaUrl: r.mainMediaUrl,
          category: r.dbCategory ?? catByCoords.get(r.coordinates ?? '') ?? 'activité',
          price: r.dbPrice,
        };
      });

      // Compute city center from liked items, fall back to catalog
      const withCoords = liked.filter((i) => i.lat != null && i.lng != null);
      let centerLat: number;
      let centerLng: number;
      if (withCoords.length > 0) {
        centerLat = withCoords.reduce((s, i) => s + i.lat!, 0) / withCoords.length;
        centerLng = withCoords.reduce((s, i) => s + i.lng!, 0) / withCoords.length;
      } else {
        const fallbackPts = [...catalogByCategory.values()]
          .flat()
          .filter((i) => i.lat != null && i.lng != null)
          .slice(0, 20);
        if (fallbackPts.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Aucune donnée trouvée pour la destination "${tripRow.destination}".`,
          });
        }
        centerLat = fallbackPts.reduce((s, i) => s + i.lat!, 0) / fallbackPts.length;
        centerLng = fallbackPts.reduce((s, i) => s + i.lng!, 0) / fallbackPts.length;
      }

      for (const pool of catalogByCategory.values()) {
        pool.sort(
          (a, b) => geoDistItem(a, centerLat, centerLng) - geoDistItem(b, centerLat, centerLng),
        );
      }

      const likedByCategory = (cat: string) => liked.filter((i) => i.category === cat);
      const numDays = calcNumDays(tripRow.durationDays);

      const [dbActivities, dbHotels, dbRestaurants] = await Promise.all([
        fetchNearbyFromDb(ctx.db, 'activité', tripCity, centerLat, centerLng, 100),
        fetchNearbyFromDb(ctx.db, 'hotel', tripCity, centerLat, centerLng, numDays * 3),
        fetchNearbyFromDb(ctx.db, 'restaurant', tripCity, centerLat, centerLng, numDays * 3),
      ]);

      const allActivities = buildPool(
        likedByCategory('activité'),
        dbActivities,
        catalogByCategory.get('activité') ?? [],
      );
      const allHotels = buildPool(
        likedByCategory('hotel'),
        dbHotels,
        catalogByCategory.get('hotel') ?? [],
      );
      const allRestaurants = buildPool(
        likedByCategory('restaurant'),
        dbRestaurants,
        catalogByCategory.get('restaurant') ?? [],
      );

      const targetPriceRank = PRICE_TARGET_RANK[tripRow.averagePrice ?? 'mid'] ?? 2;
      const baseActsPerDay = INTENSITY_ACTS_PER_DAY[tripRow.intensity ?? 'balanced'] ?? 2;
      const actsPerDay = Math.min(baseActsPerDay, Math.ceil(allActivities.length / numDays));

      const usedIds = new Set<string>();
      const addItem = (item: ItinItem, plan: ItinItem[]) => {
        plan.push(item);
        usedIds.add(item.activityId);
        if (item.discoveryContentId) usedIds.add(`db:${item.discoveryContentId}`);
      };

      const pickFrom = (
        pool: ItinItem[],
        anchorLat: number,
        anchorLng: number,
      ): ItinItem | undefined =>
        pool
          .filter((i) => !usedIds.has(i.activityId))
          .sort(
            (a, b) =>
              scoreItem(a, anchorLat, anchorLng, targetPriceRank) -
              scoreItem(b, anchorLat, anchorLng, targetPriceRank),
          )[0];

      const dayPlans: ItinItem[][] = [];

      for (let d = 0; d < numDays; d++) {
        const plan: ItinItem[] = [];

        const hotel = pickFrom(allHotels, centerLat, centerLng);
        if (hotel) addItem(hotel, plan);

        const anchorLat = plan[0]?.lat ?? centerLat;
        const anchorLng = plan[0]?.lng ?? centerLng;

        const dayActs = allActivities
          .filter((a) => !usedIds.has(a.activityId))
          .sort(
            (a, b) =>
              scoreItem(a, anchorLat, anchorLng, targetPriceRank) -
              scoreItem(b, anchorLat, anchorLng, targetPriceRank),
          )
          .slice(0, actsPerDay);
        for (const act of dayActs) addItem(act, plan);

        const resto = pickFrom(allRestaurants, anchorLat, anchorLng);
        if (resto) addItem(resto, plan);

        dayPlans.push(plan);
      }

      // Persist — delete old days/activities then insert new ones
      if (dayIds.length > 0) {
        await ctx.db.delete(activity).where(inArray(activity.tripDayId, dayIds));
        await ctx.db.delete(tripDay).where(eq(tripDay.tripId, input.tripId));
      }

      const startDate = tripRow.startDate ? new Date(tripRow.startDate) : null;
      for (let i = 0; i < dayPlans.length; i++) {
        const plan = dayPlans[i];
        let targetDate: string | null = null;
        if (startDate) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + i);
          targetDate = d.toISOString().split('T')[0]!;
        }

        const [day] = await ctx.db
          .insert(tripDay)
          .values({
            tripId: input.tripId,
            dayIndex: i + 1,
            summary: `Jour ${i + 1}`,
            targetDate,
          })
          .returning({ id: tripDay.id });

        if (plan.length > 0) {
          await ctx.db.insert(activity).values(
            plan.map((item, j) => ({
              tripDayId: day.id,
              discoveryContentId: item.discoveryContentId ?? undefined,
              title: item.title,
              locationName: item.locationName,
              description: item.description ?? undefined,
              coordinates: item.coordinates ?? undefined,
              orderIndex: j,
            })),
          );
        }
      }

      return { tripId: input.tripId, numDays: dayPlans.length };
    }),
} satisfies TRPCRouterRecord;
