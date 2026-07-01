import { loadDiscoveryData } from '@voyagr/database'
import type { DiscoveryContentData } from '@voyagr/database'
import { TRPCError } from '@trpc/server'
import { inArray } from 'drizzle-orm'
import { z } from 'zod'

import { activity, discoveryContent, swipes, trip, tripDay } from '#/db/voyagr'
import { recommend } from '#/server/recommendation/algorithm'
import type {
  DiscoveryItem,
  SwipeRecord,
} from '#/server/recommendation/algorithm'
import { createTRPCRouter, publicProcedure } from './init'

import type { TRPCRouterRecord } from '@trpc/server'

const todos = [
  { id: 1, name: 'Get groceries' },
  { id: 2, name: 'Buy a new phone' },
  { id: 3, name: 'Finish the project' },
]

const todosRouter = {
  list: publicProcedure.query(() => todos),
  add: publicProcedure
    .input(z.object({ name: z.string() }))
    .mutation(({ input }) => {
      const newTodo = { id: todos.length + 1, name: input.name }
      todos.push(newTodo)
      return newTodo
    }),
} satisfies TRPCRouterRecord

// ─── Discovery / recommendation ────────────────────────────────────────────────

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
    tags: row.tags,
  }
}

/** Active catalog, sourced from data.json (no database required). */
function getCatalog(): DiscoveryItem[] {
  return loadDiscoveryData()
    .filter((item) => item.isActive !== false)
    .map(toDiscoveryItem)
}

/** A swipe sent by the client (swipes are tracked client-side, not persisted). */
const swipeInput = z.object({
  id: z.string(),
  liked: z.boolean(),
  viewDurationMs: z.number().int().nonnegative().nullable().default(null),
})

const discoveryRouter = {
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
      const catalog = getCatalog()
      const byId = new Map(catalog.map((item) => [item.id, item]))

      // Rebuild the chronological history, dropping any unknown ids.
      const history: SwipeRecord[] = []
      for (const s of input.swipes) {
        const item = byId.get(s.id)
        if (!item) continue
        history.push({ item, liked: s.liked, viewDurationMs: s.viewDurationMs })
      }

      const result = recommend(history, catalog, input.topN)

      // Enrich each destination with display data (hero image, top ambiances,
      // and the user's liked places there) so the UI needs a single request.
      const likedItems = history.filter((s) => s.liked).map((s) => s.item)

      const destinations = result.destinations.map((dest) => {
        const cityItems = catalog.filter((i) => i.city === dest.city)
        const likedHere = likedItems.filter((i) => i.city === dest.city)

        const subcatCount = new Map<string, number>()
        for (const item of cityItems) {
          for (const sub of item.tags?.subcategory ?? []) {
            subcatCount.set(sub, (subcatCount.get(sub) ?? 0) + 1)
          }
        }
        const topSubcategories = [...subcatCount.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([name, count]) => ({ name, count }))

        const heroItem = likedHere.at(0) ?? cityItems.at(0)

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
        }
      })

      return { ...result, destinations }
    }),

  /**
   * Persist the recommended destination as a draft trip, with the user's liked
   * places in that city saved as activities. Requires a running, seeded DB.
   */
  saveTrip: publicProcedure
    .input(z.object({ swipes: z.array(swipeInput) }))
    .mutation(async ({ ctx, input }) => {
      const catalog = getCatalog()
      const byId = new Map(catalog.map((item) => [item.id, item]))

      const history: SwipeRecord[] = []
      for (const s of input.swipes) {
        const item = byId.get(s.id)
        if (!item) continue
        history.push({ item, liked: s.liked, viewDurationMs: s.viewDurationMs })
      }

      // Recompute the recommendation so the saved destination matches the UI.
      const result = recommend(history, catalog, 1)
      const top = result.destinations.at(0)
      if (!top) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Aucune destination déterminée — pas assez de swipes.',
        })
      }

      // Resolve DB UUIDs for every swiped item in one query (used for both
      // swipe persistence and activity creation).
      const allUrls = history.map((s) => s.item.url)
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
        : []
      const rowByUrl = new Map(contentRows.map((r) => [r.url, r]))

      // 1. Persist all swipes (ON CONFLICT DO NOTHING handles replays).
      const swipeValues = history.flatMap((s) => {
        const row = rowByUrl.get(s.item.url)
        if (!row) return []
        return [
          {
            userId: ctx.userId,
            discoveryContentId: row.id,
            direction: s.liked ? 'like' : 'dislike',
          },
        ]
      })
      if (swipeValues.length > 0) {
        await ctx.db.insert(swipes).values(swipeValues).onConflictDoNothing()
      }

      // 2. Create the draft trip.
      const likedInCity = history
        .filter((s) => s.liked && s.item.city === top.city)
        .map((s) => s.item)

      const [createdTrip] = await ctx.db
        .insert(trip)
        .values({
          userId: ctx.userId,
          title: `Voyage à ${top.city}`,
          destination: top.city,
          status: 'draft',
        })
        .returning({ id: trip.id })

      // 3. A single day to hold the liked places.
      const [day] = await ctx.db
        .insert(tripDay)
        .values({
          tripId: createdTrip.id,
          dayIndex: 0,
          summary: `Lieux likés à ${top.city}`,
        })
        .returning({ id: tripDay.id })

      // 4. One activity per liked place that exists in the database.
      const activityValues = likedInCity.flatMap((item, index) => {
        const row = rowByUrl.get(item.url)
        if (!row) return []
        return [
          {
            tripDayId: day.id,
            discoveryContentId: row.id,
            title: row.locationName ?? item.locationName ?? 'Lieu',
            locationName: row.locationName,
            coordinates: row.coordinates,
            orderIndex: index,
          },
        ]
      })
      if (activityValues.length > 0) {
        await ctx.db.insert(activity).values(activityValues)
      }

      return {
        tripId: createdTrip.id,
        destination: top.city,
        country: top.country,
        activityCount: activityValues.length,
        swipesRecorded: swipeValues.length,
        unresolved: likedInCity.length - activityValues.length,
      }
    }),
} satisfies TRPCRouterRecord

export const trpcRouter = createTRPCRouter({
  todos: todosRouter,
  discovery: discoveryRouter,
})
export type TRPCRouter = typeof trpcRouter
