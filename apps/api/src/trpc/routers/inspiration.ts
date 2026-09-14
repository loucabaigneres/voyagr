import { TRPCError } from '@trpc/server';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  detectPlatform,
  extractHashtags,
  fetchCaption,
  stripHashtags,
} from '../../lib/socialImport.js';
import { importedInspiration } from '../../lib/tables.js';
import { createTRPCRouter, protectedProcedure } from '../init.js';

// Code d'erreur reconnu par le front pour déplier le champ de saisie manuelle.
export const CAPTION_UNAVAILABLE = 'CAPTION_UNAVAILABLE';

export const inspirationRouter = createTRPCRouter({
  importFromUrl: protectedProcedure
    .input(
      z.object({
        url: z.url("L'URL n'est pas valide."),
        // Légende collée à la main quand la récupération automatique échoue.
        caption: z.string().max(5000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const platform = detectPlatform(input.url);

      if (platform === 'other') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Seuls les liens TikTok et Instagram sont pris en charge pour le moment.',
        });
      }

      let caption = input.caption?.trim();

      if (!caption) {
        const result = await fetchCaption(input.url);

        if (!result.ok) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: CAPTION_UNAVAILABLE });
        }

        caption = result.caption;
      }

      const tags = extractHashtags(caption);

      const [inspiration] = await ctx.db
        .insert(importedInspiration)
        .values({
          userId: ctx.user.id,
          platform,
          originalUrl: input.url,
          // Les hashtags vivent dans `extracted_tags` : on ne les garde pas dans la description.
          description: stripHashtags(caption) || null,
          // La localisation sera déduite plus tard (géocodage / IA) : la colonne est
          // NOT NULL sans valeur par défaut, on laisse une chaîne vide en attendant.
          extracted_location: '',
          extracted_tags: tags,
          status: tags.length > 0 ? 'analyzed' : 'failed',
        })
        .returning();

      return {
        success: true,
        inspiration: {
          id: inspiration.id,
          platform: inspiration.platform,
          originalUrl: inspiration.originalUrl,
          description: inspiration.description,
          tags,
        },
      };
    }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: importedInspiration.id,
        platform: importedInspiration.platform,
        originalUrl: importedInspiration.originalUrl,
        description: importedInspiration.description,
        tags: importedInspiration.extracted_tags,
        status: importedInspiration.status,
        createdAt: importedInspiration.createdAt,
      })
      .from(importedInspiration)
      .where(eq(importedInspiration.userId, ctx.user.id))
      .orderBy(desc(importedInspiration.createdAt))
      .limit(20);

    // `extracted_tags` est un jsonb non typé côté schéma : on normalise à la lecture.
    return rows.map((row) => ({
      ...row,
      tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    }));
  }),
});
