import type { TRPCRouterRecord } from '@trpc/server';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  detectPlatform,
  extractHashtags,
  matchLocation,
} from '../../lib/inspiration/extraction.js';
import { fetchInstagramCaption, fetchTikTokCaption } from '../../lib/inspiration/fetchers.js';
import { discoveryContent, importedInspiration } from '../../lib/tables.js';
import { publicProcedure } from '../init.js';

export const inspirationRouter = {
  /**
   * Imports a TikTok/Instagram video by URL: detects the platform, fetches its
   * caption (best-effort), and extracts hashtags/location with simple heuristics
   * (no AI). A failed extraction (common for Instagram) is never a user-facing
   * error — the row is always created, with status 'failed' when nothing could
   * be extracted.
   */
  // TEMP: publicProcedure instead of protectedProcedure — auth temporarily disabled for this route.
  import: publicProcedure
    .input(z.object({ url: z.string().min(1, 'Le lien est requis.') }))
    .mutation(async ({ ctx, input }) => {
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(input.url);
      } catch {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: "Le lien fourni n'est pas une URL valide.",
        });
      }

      const originalUrl = parsedUrl.toString();
      const platform = detectPlatform(originalUrl);

      let caption: string | null = null;
      if (platform === 'tiktok') {
        caption = await fetchTikTokCaption(originalUrl);
      } else if (platform === 'instagram') {
        caption = await fetchInstagramCaption(originalUrl);
      }

      let tags: string[] = [];
      let location = '';
      if (caption) {
        tags = extractHashtags(caption);

        const places = await ctx.db
          .select({ city: discoveryContent.city, country: discoveryContent.country })
          .from(discoveryContent);
        const knownPlaces = [
          ...new Set(
            places.flatMap((p) => [p.city, p.country]).filter((v): v is string => Boolean(v)),
          ),
        ];
        location = matchLocation(caption, knownPlaces);
      }

      const [inserted] = await ctx.db
        .insert(importedInspiration)
        .values({
          userId: ctx.user?.id ?? 'guest',
          platform,
          originalUrl,
          extracted_location: location,
          extracted_tags: tags,
          status: caption ? 'analyzed' : 'failed',
        })
        .returning();

      return inserted;
    }),
} satisfies TRPCRouterRecord;
