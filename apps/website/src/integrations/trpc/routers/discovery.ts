import { loadDiscoveryData } from '@voyagr/database'
import type { DiscoveryContentData } from '@voyagr/database'
import { TRPCError } from '@trpc/server'
import { inArray } from 'drizzle-orm'
import { z } from 'zod'
import type { TRPCRouterRecord } from '@trpc/server'

import { activity, discoveryContent, swipes, trip, tripDay } from '#/db/voyagr'
import { recommend } from '#/server/recommendation/algorithm'
import type {
  DiscoveryItem,
  SwipeRecord,
} from '#/server/recommendation/algorithm'
import { publicProcedure } from '../init'

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
    coordinates: row.coordinates ?? null,
    tags: row.tags,
  }
}

export function getCatalog(): DiscoveryItem[] {
  return loadDiscoveryData()
    .filter((item) => item.isActive !== false)
    .map(toDiscoveryItem)
}

export const swipeInput = z.object({
  id: z.string(),
  liked: z.boolean(),
  viewDurationMs: z.number().int().nonnegative().nullable().default(null),
})

function buildSwipeHistory(
  swipeInputs: z.infer<typeof swipeInput>[],
  catalog: DiscoveryItem[],
): SwipeRecord[] {
  const byId = new Map(catalog.map((item) => [item.id, item]))
  const history: SwipeRecord[] = []
  for (const s of swipeInputs) {
    const item = byId.get(s.id)
    if (!item) continue
    history.push({ item, liked: s.liked, viewDurationMs: s.viewDurationMs })
  }
  return history
}

export const discoveryRouter = {
  feed: publicProcedure.query(() => getCatalog()),

  recommendation: publicProcedure
    .input(
      z.object({
        swipes: z.array(swipeInput),
        topN: z.number().int().min(1).max(10).default(3),
      }),
    )
    .query(({ input }) => {
      const catalog = getCatalog()
      const history = buildSwipeHistory(input.swipes, catalog)
      const result = recommend(history, catalog, input.topN)

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

  saveTrip: publicProcedure
    .input(z.object({ swipes: z.array(swipeInput) }))
    .mutation(async ({ ctx, input }) => {
      const catalog = getCatalog()
      const history = buildSwipeHistory(input.swipes, catalog)

      const result = recommend(history, catalog, 1)
      const top = result.destinations.at(0)
      if (!top) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Aucune destination déterminée — pas assez de swipes.',
        })
      }

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

      const [day] = await ctx.db
        .insert(tripDay)
        .values({
          tripId: createdTrip.id,
          dayIndex: 0,
          summary: `Lieux likés à ${top.city}`,
        })
        .returning({ id: tripDay.id })

      const activityValues = likedInCity.map((item, index) => {
        const row = rowByUrl.get(item.url)
        return {
          tripDayId: day.id,
          discoveryContentId: row?.id ?? undefined,
          title: row?.locationName ?? item.locationName ?? 'Lieu',
          locationName: row?.locationName ?? item.locationName,
          description: item.description ?? undefined,
          coordinates: row?.coordinates ?? item.coordinates ?? undefined,
          orderIndex: index,
        }
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
        unresolved: 0,
      }
    }),
} satisfies TRPCRouterRecord
