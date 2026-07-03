// import type { VoyagrDb } from '#/db/voyagr';
import type { TRPCRouterRecord } from '@trpc/server';
import { TRPCError } from '@trpc/server';
import type { DiscoveryContentData } from '@voyagr/database';
import { loadDiscoveryData } from '@voyagr/database';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import type { DiscoveryItem, SwipeRecord } from '../../lib/recommendation/algorithm.js';
import { rankDestinations, recommend } from '../../lib/recommendation/algorithm.js';
import { activity, discoveryContent, swipes, trip, tripDay } from '../../lib/tables.js';
import { createTRPCRouter, publicProcedure } from '../init.js';

// ─── Catalog ────────────────────────────────────────────────────────────────────

/** Maps a raw data.json entry to the algorithm's DiscoveryItem shape. */
function toDiscoveryItem(row: DiscoveryContentData): DiscoveryItem {
  return {
    id: row.id,
    locationName: row.locationName,
    url: row.url,
    mainMediaUrl: row.mainMediaUrl,
    carousselUrls: row.carousselUrls,
    description: row.description,
    country: row.country,
    city: row.city,
    coordinates: row.coordinates,
    tags: row.tags,
  };
}

/**
 * Round-robin interleave so no city appears more than once in a row.
 * Items within each city bucket are shuffled to add variety across sessions.
 */
function interleaveByCityRoundRobin(items: DiscoveryItem[]): DiscoveryItem[] {
  const buckets = new Map<string, DiscoveryItem[]>();
  for (const item of items) {
    const key = item.city ?? '__unknown__';
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = [];
      buckets.set(key, bucket);
    }
    bucket.push(item);
  }
  // Shuffle within each bucket (Fisher-Yates).
  for (const bucket of buckets.values()) {
    for (let i = bucket.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bucket[i], bucket[j]] = [bucket[j], bucket[i]];
    }
  }
  // Also shuffle the city order so different cities lead each session.
  const cityOrder = [...buckets.keys()];
  for (let i = cityOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cityOrder[i], cityOrder[j]] = [cityOrder[j], cityOrder[i]];
  }
  const result: DiscoveryItem[] = [];
  let remaining = true;
  while (remaining) {
    remaining = false;
    for (const city of cityOrder) {
      const bucket = buckets.get(city)!;
      if (bucket.length > 0) {
        result.push(bucket.shift()!);
        remaining = true;
      }
    }
  }
  return result;
}

/**
 * Ensures no more than `maxRun` consecutive items share the same category.
 * When a run limit is hit, the next item is picked from the nearest
 * position in the remaining pool that has a different category.
 */
function applyMaxRunByCategory(items: DiscoveryItem[], maxRun: number): DiscoveryItem[] {
  const pool = [...items];
  const result: DiscoveryItem[] = [];

  while (pool.length > 0) {
    let blockedCategory: string | null = null;
    if (result.length >= maxRun) {
      const tail = result.slice(-maxRun);
      const tailCat = tail[0].tags?.category ?? null;
      if (tailCat && tail.every((item) => (item.tags?.category ?? null) === tailCat)) {
        blockedCategory = tailCat;
      }
    }

    if (!blockedCategory) {
      result.push(pool.shift()!);
    } else {
      const idx = pool.findIndex((item) => (item.tags?.category ?? null) !== blockedCategory);
      if (idx === -1) {
        result.push(pool.shift()!);
      } else {
        result.push(...pool.splice(idx, 1));
      }
    }
  }

  return result;
}

/** Active catalog, sourced from data.json (no database required). */
export function getCatalog(): DiscoveryItem[] {
  return applyMaxRunByCategory(
    interleaveByCityRoundRobin(
      loadDiscoveryData()
        .filter((item) => item.isActive !== false)
        .map(toDiscoveryItem),
    ),
    3,
  );
}

/** A swipe sent by the client (swipes are tracked client-side, not persisted). */
export const swipeInput = z.object({
  id: z.string(),
  liked: z.boolean(),
  viewDurationMs: z.number().int().nonnegative().nullable().default(null),
});

function buildSwipeHistory(
  swipeInputs: z.infer<typeof swipeInput>[],
  catalog: DiscoveryItem[],
): SwipeRecord[] {
  const byId = new Map(catalog.map((item) => [item.id, item]));
  const history: SwipeRecord[] = [];
  for (const s of swipeInputs) {
    const item = byId.get(s.id);
    if (!item) continue;
    history.push({ item, liked: s.liked, viewDurationMs: s.viewDurationMs });
  }
  return history;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const discoveryRouter = {
  /** The full active catalog of cards to swipe. */
  feed: publicProcedure.query(() => getCatalog()),

  /** Run the recommendation algorithm over a client-provided swipe history. */
  recommendation: publicProcedure
    .input(
      z.object({
        swipes: z.array(swipeInput),
        topN: z.number().int().min(1).max(10).default(3),
      }),
    )
    .query(({ input }) => {
      const catalog = getCatalog();
      const history = buildSwipeHistory(input.swipes, catalog);
      const result = recommend(history, catalog, input.topN);

      // Enrich each destination with display data (hero image, top ambiances,
      // and the user's liked places there) so the UI needs a single request.
      const likedItems = history.filter((s) => s.liked).map((s) => s.item);

      const destinations = result.destinations.map((dest) => {
        const cityItems = catalog.filter((i) => i.city === dest.city);
        const likedHere = likedItems.filter((i) => i.city === dest.city);

        const subcatCount = new Map<string, number>();
        for (const item of cityItems) {
          for (const sub of item.tags?.subcategory ?? []) {
            subcatCount.set(sub, (subcatCount.get(sub) ?? 0) + 1);
          }
        }
        const topSubcategories = [...subcatCount.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([name, count]) => ({ name, count }));

        const heroItem = likedHere.at(0) ?? cityItems.at(0);

        return {
          ...dest,
          heroImage: heroItem?.mainMediaUrl ?? null,
          topSubcategories,
          likedHere: likedHere.slice(0, 8).map((i) => ({
            id: i.id,
            locationName: i.locationName,
            mainMediaUrl: i.mainMediaUrl,
            url: i.url,
          })),
        };
      });

      return { ...result, destinations };
    }),

  /**
   * Lightweight city ranking used to sort the feed after the exploration phase.
   * Returns city scores only (no enrichment), fast enough to re-run after each swipe.
   */
  rankCities: publicProcedure
    .input(z.object({ swipes: z.array(swipeInput) }))
    .query(({ input }) => {
      const catalog = getCatalog();
      const history = buildSwipeHistory(input.swipes, catalog);

      return rankDestinations(history, catalog).map(({ city, score, vetoed }) => ({
        city,
        score,
        vetoed,
      }));
    }),

  /**
   * Persist the recommended destination as a draft trip, with the user's liked
   * places in that city saved as activities. Requires a running, seeded DB.
   */
  saveTrip: publicProcedure
    .input(z.object({ swipes: z.array(swipeInput) }))
    .mutation(async ({ ctx, input }) => {
      const catalog = getCatalog();
      const history = buildSwipeHistory(input.swipes, catalog);

      // Recompute the recommendation so the saved destination matches the UI.
      const result = recommend(history, catalog, 1);
      const top = result.destinations.at(0);
      if (!top) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Aucune destination déterminée — pas assez de swipes.',
        });
      }

      const userId = ctx.user?.id ?? 'guest';

      // Resolve DB UUIDs for every swiped item in one query (used for both
      // swipe persistence and activity creation).
      const allUrls = history.map((s) => s.item.url);
      const contentRows = allUrls.length
        ? await ctx.db
            .select({
              id: discoveryContent.id,
              url: discoveryContent.url,
              locationName: discoveryContent.locationName,
              coordinates: discoveryContent.coordinates,
            })
            .from(discoveryContent)
            .where(inArray(discoveryContent.url, allUrls))
        : [];
      const rowByUrl = new Map(contentRows.map((r) => [r.url, r]));

      // 1. Persist all swipes (ON CONFLICT DO NOTHING handles replays).
      const swipeValues = history.flatMap((s) => {
        const row = rowByUrl.get(s.item.url);
        if (!row) return [];
        return [
          {
            userId,
            discoveryContentId: row.id,
            direction: (s.liked ? 'like' : 'dislike') as 'like' | 'dislike',
          },
        ];
      });
      if (swipeValues.length > 0) {
        await ctx.db.insert(swipes).values(swipeValues).onConflictDoNothing();
      }

      // 2. Create the draft trip.
      const likedInCity = history
        .filter((s) => s.liked && s.item.city === top.city)
        .map((s) => s.item);

      const [createdTrip] = await ctx.db
        .insert(trip)
        .values({
          userId,
          title: `Voyage à ${top.city}`,
          destination: top.city,
          status: 'draft',
        })
        .returning({ id: trip.id });

      // 3. A single day to hold the liked places.
      const [day] = await ctx.db
        .insert(tripDay)
        .values({
          tripId: createdTrip.id,
          dayIndex: 0,
          summary: `Lieux likés à ${top.city}`,
        })
        .returning({ id: tripDay.id });

      // 4. One activity per liked place that exists in the database.
      const activityValues = likedInCity.flatMap((item, index) => {
        const row = rowByUrl.get(item.url);
        if (!row) return [];
        return [
          {
            tripDayId: day.id,
            discoveryContentId: row.id,
            title: row.locationName ?? item.locationName ?? 'Lieu',
            locationName: row.locationName,
            coordinates: row.coordinates,
            orderIndex: index,
          },
        ];
      });
      if (activityValues.length > 0) {
        await ctx.db.insert(activity).values(activityValues);
      }

      return {
        tripId: createdTrip.id,
        destination: top.city,
        country: top.country,
        activityCount: activityValues.length,
        swipesRecorded: swipeValues.length,
        unresolved: likedInCity.length - activityValues.length,
      };
    }),

  // ─── Admin ─────────────────────────────────────────────────────────────────────

  /** Throws FORBIDDEN if the calling user is not an admin. */
  // async function requireAdmin(ctx: { db: VoyagrDb; userId: string }) {
  //   if (ctx.userId === 'guest') {
  //     throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Non authentifié.' });
  //   }
  //   const [me] = await ctx.db.select({ role: user.role }).from(user).where(eq(user.id, ctx.userId));
  //   if (me.role !== 'admin') {
  //     throw new TRPCError({
  //       code: 'FORBIDDEN',
  //       message: 'Accès réservé aux administrateurs.',
  //     });
  //   }
  // }

  // const adminRouter = {
  //   listUsers: publicProcedure.query(async ({ ctx }) => {
  //     await requireAdmin(ctx);
  //     return ctx.db
  //       .select({
  //         id: user.id,
  //         name: user.name,
  //         email: user.email,
  //         role: user.role,
  //         banned: user.banned,
  //         banReason: user.banReason,
  //         emailVerified: user.emailVerified,
  //         createdAt: user.createdAt,
  //       })
  //       .from(user)
  //       .orderBy(user.createdAt);
  //   }),

  //   setRole: publicProcedure
  //     .input(z.object({ userId: z.string(), role: z.enum(['traveler', 'admin']) }))
  //     .mutation(async ({ ctx, input }) => {
  //       await requireAdmin(ctx);
  //       await ctx.db
  //         .update(user)
  //         .set({ role: input.role, updatedAt: new Date() })
  //         .where(eq(user.id, input.userId));
  //     }),

  // banUser: publicProcedure
  //   .input(z.object({ userId: z.string(), reason: z.string().optional() }))
  //   .mutation(async ({ ctx, input }) => {
  //     await requireAdmin(ctx);
  //     await ctx.db
  //       .update(user)
  //       .set({
  //         banned: true,
  //         banReason: input.reason ?? null,
  //         updatedAt: new Date(),
  //       })
  //       .where(eq(user.id, input.userId));
  //   }),

  // unbanUser: publicProcedure
  //   .input(z.object({ userId: z.string() }))
  //   .mutation(async ({ ctx, input }) => {
  //     await requireAdmin(ctx);
  //     await ctx.db
  //       .update(user)
  //       .set({
  //         banned: false,
  //         banReason: null,
  //         banExpires: null,
  //         updatedAt: new Date(),
  //       })
  //       .where(eq(user.id, input.userId));
  //   }),
} satisfies TRPCRouterRecord;

export const trpcRouter = createTRPCRouter({
  discovery: discoveryRouter,
  // admin: adminRouter,
});
export type TRPCRouter = typeof trpcRouter;
