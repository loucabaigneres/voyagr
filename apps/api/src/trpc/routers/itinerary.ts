import type { TRPCRouterRecord } from '@trpc/server';
import { TRPCError } from '@trpc/server';
import { and, asc, eq, inArray, isNotNull, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Context } from '../context.js';

import { activity, discoveryContent, trip, tripDay } from '../../lib/tables.js';
import { calcNumDays, geoDistItem, parseWkt, planItinerary } from '../../lib/itinerary/planner.js';
import type { AveragePrice, GeoPoint, Intensity, ItinItem } from '../../lib/itinerary/planner.js';
import { publicProcedure } from '../init.js';
import { getCatalog } from './discovery.js';

/** `trip_day` rows outside the planning itself. */
const LIKED_DAY_INDEX = 0;
const ALTERNATIVE_HOTELS_DAY_INDEX = -1;

// ─── DB fetch ─────────────────────────────────────────────────────────────────

async function fetchNearbyFromDb(
  db: Context['db'],
  category: string,
  city: string,
  anchor: GeoPoint,
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
      subcategory: sql<string[] | null>`${discoveryContent.tags}->'subcategory'`,
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
      subcategory: string[] | null;
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
        subcategory: Array.isArray(r.subcategory) ? r.subcategory : null,
        liked: false,
      };
    })
    .sort((a, b) => geoDistItem(a, anchor) - geoDistItem(b, anchor))
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

      // Only day 0 holds the places the user actually liked while swiping. Days
      // 1..N are a previous generation and must not be mistaken for preferences.
      const [likedDay] = await ctx.db
        .select({ id: tripDay.id })
        .from(tripDay)
        .where(and(eq(tripDay.tripId, input.tripId), eq(tripDay.dayIndex, LIKED_DAY_INDEX)));

      const rawLiked = likedDay
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
              dbSubcategory: sql<string[] | null>`${discoveryContent.tags}->'subcategory'`,
            })
            .from(activity)
            .leftJoin(discoveryContent, eq(activity.discoveryContentId, discoveryContent.id))
            .where(eq(activity.tripDayId, likedDay.id))
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
          // The catalog is read straight from `discovery_content`, so this is a
          // real row id — keeping it lets the UI resolve the category and media.
          discoveryContentId: i.id,
          title: i.locationName ?? 'Lieu',
          locationName: i.locationName,
          description: i.description,
          coordinates: i.coordinates ?? null,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          mainMediaUrl: i.mainMediaUrl,
          category: i.tags.category,
          price: (i.tags.price as string | undefined) ?? null,
          subcategory: i.tags.subcategory ?? null,
          liked: false,
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
          subcategory: Array.isArray(r.dbSubcategory) ? r.dbSubcategory : null,
          liked: true,
        };
      });

      // Compute city center from liked items, fall back to catalog
      const withCoords = liked.filter((i) => i.lat != null && i.lng != null);
      let center: GeoPoint;
      if (withCoords.length > 0) {
        center = {
          lat: withCoords.reduce((s, i) => s + i.lat!, 0) / withCoords.length,
          lng: withCoords.reduce((s, i) => s + i.lng!, 0) / withCoords.length,
        };
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
        center = {
          lat: fallbackPts.reduce((s, i) => s + i.lat!, 0) / fallbackPts.length,
          lng: fallbackPts.reduce((s, i) => s + i.lng!, 0) / fallbackPts.length,
        };
      }

      for (const pool of catalogByCategory.values()) {
        pool.sort((a, b) => geoDistItem(a, center) - geoDistItem(b, center));
      }

      const likedByCategory = (cat: string) => liked.filter((i) => i.category === cat);
      const numDays = calcNumDays(tripRow.durationDays);

      const [dbActivities, dbHotels, dbRestaurants] = await Promise.all([
        fetchNearbyFromDb(ctx.db, 'activité', tripCity, center, 100),
        // The planner keeps one hotel and offers a few alternatives, so a
        // handful of candidates is enough regardless of the trip length.
        fetchNearbyFromDb(ctx.db, 'hotel', tripCity, center, 20),
        fetchNearbyFromDb(ctx.db, 'restaurant', tripCity, center, 40),
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

      const { days: dayPlans, alternativeHotels } = planItinerary({
        numDays,
        intensity: (tripRow.intensity as Intensity | null) ?? null,
        averagePrice: (tripRow.averagePrice as AveragePrice | null) ?? null,
        interests: Array.isArray(tripRow.interests) ? (tripRow.interests as string[]) : [],
        center,
        hotels: allHotels,
        activities: allActivities,
        restaurants: allRestaurants,
      });

      // Persist — replace the planning, keep the liked-places bucket (day 0).
      const startDate = tripRow.startDate ? new Date(tripRow.startDate) : null;
      const dayRows = [
        ...(alternativeHotels.length > 0
          ? [
              {
                dayIndex: ALTERNATIVE_HOTELS_DAY_INDEX,
                summary: 'Hôtels alternatifs',
                targetDate: null as string | null,
                plan: alternativeHotels,
              },
            ]
          : []),
        ...dayPlans.map((plan, i) => {
          let targetDate: string | null = null;
          if (startDate) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            targetDate = d.toISOString().split('T')[0]!;
          }
          return { dayIndex: i + 1, summary: `Jour ${i + 1}`, targetDate, plan };
        }),
      ];

      await ctx.db.transaction(async (tx) => {
        const staleDays = await tx
          .select({ id: tripDay.id })
          .from(tripDay)
          .where(and(eq(tripDay.tripId, input.tripId), ne(tripDay.dayIndex, LIKED_DAY_INDEX)));
        const staleIds = staleDays.map((d) => d.id);

        if (staleIds.length > 0) {
          await tx.delete(activity).where(inArray(activity.tripDayId, staleIds));
          await tx.delete(tripDay).where(inArray(tripDay.id, staleIds));
        }

        const inserted = await tx
          .insert(tripDay)
          .values(
            dayRows.map(({ dayIndex, summary, targetDate }) => ({
              tripId: input.tripId,
              dayIndex,
              summary,
              targetDate,
            })),
          )
          .returning({ id: tripDay.id, dayIndex: tripDay.dayIndex });

        const dayIdByIndex = new Map(inserted.map((d) => [d.dayIndex, d.id]));
        const activityRows = dayRows.flatMap(({ dayIndex, plan }) =>
          plan.map((item, j) => ({
            tripDayId: dayIdByIndex.get(dayIndex)!,
            discoveryContentId: item.discoveryContentId ?? undefined,
            title: item.title,
            locationName: item.locationName,
            description: item.description ?? undefined,
            coordinates: item.coordinates ?? undefined,
            orderIndex: j,
          })),
        );

        if (activityRows.length > 0) await tx.insert(activity).values(activityRows);
      });

      return { tripId: input.tripId, numDays: dayPlans.length };
    }),

  /**
   * Swaps the itinerary's hotel with one of the alternatives.
   *
   * The two places trade positions: the picked alternative becomes the hotel of
   * every planned day, and the outgoing hotel takes its slot in the alternatives
   * list, so the choice stays reversible.
   */
  chooseHotel: publicProcedure
    .input(z.object({ tripId: z.string().uuid(), activityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const days = await ctx.db
        .select({ id: tripDay.id, dayIndex: tripDay.dayIndex })
        .from(tripDay)
        .where(eq(tripDay.tripId, input.tripId));

      const alternativesDayId = days.find((d) => d.dayIndex === ALTERNATIVE_HOTELS_DAY_INDEX)?.id;
      const planningDayIds = days.filter((d) => d.dayIndex > 0).map((d) => d.id);

      if (!alternativesDayId || planningDayIds.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: "Ce voyage n'a pas d'itinéraire généré.",
        });
      }

      // Scoping the lookup to this trip's alternatives day is what stops an
      // arbitrary activity id from being written into the planning.
      const [chosen] = await ctx.db
        .select()
        .from(activity)
        .where(and(eq(activity.id, input.activityId), eq(activity.tripDayId, alternativesDayId)));

      if (!chosen) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cet hôtel ne fait pas partie des alternatives proposées.',
        });
      }

      const currentHotels = await ctx.db
        .select({
          id: activity.id,
          discoveryContentId: activity.discoveryContentId,
          title: activity.title,
          locationName: activity.locationName,
          description: activity.description,
          coordinates: activity.coordinates,
        })
        .from(activity)
        .leftJoin(discoveryContent, eq(activity.discoveryContentId, discoveryContent.id))
        .where(
          and(
            inArray(activity.tripDayId, planningDayIds),
            sql`${discoveryContent.tags}->>'category' = 'hotel'`,
          ),
        );

      const outgoing = currentHotels[0];
      if (!outgoing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: "L'itinéraire ne contient aucun hébergement à remplacer.",
        });
      }

      const fieldsOf = (row: typeof outgoing) => ({
        discoveryContentId: row.discoveryContentId,
        title: row.title,
        locationName: row.locationName,
        description: row.description,
        coordinates: row.coordinates,
      });

      await ctx.db.transaction(async (tx) => {
        await tx
          .update(activity)
          .set(fieldsOf(chosen))
          .where(
            inArray(
              activity.id,
              currentHotels.map((h) => h.id),
            ),
          );
        await tx.update(activity).set(fieldsOf(outgoing)).where(eq(activity.id, chosen.id));
      });

      return { tripId: input.tripId, hotelTitle: chosen.title };
    }),
} satisfies TRPCRouterRecord;
