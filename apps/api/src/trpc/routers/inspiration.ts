import { TRPCError } from '@trpc/server';
import { and, desc, eq, inArray, max } from 'drizzle-orm';
import { z } from 'zod';
import type { ExtractedPlace } from '@voyagr/database';
import type { Context } from '../context.js';
import { AnalysisError, type InlineImage } from '../../lib/aiAnalysis.js';
import { analyzeInspiration } from '../../lib/gemini.js';
import {
  detectPlatform,
  downloadImageAsInline,
  extractHashtags,
  fetchCaption,
  fetchMedia,
  normalizeContentUrl,
  stripHashtags,
} from '../../lib/socialImport.js';
import { upsertImportedPlace } from '../../lib/importedPlaces.js';
import {
  activity,
  importedInspiration,
  inspirationGroup,
  inspirationGroupMember,
  trip,
  tripDay,
} from '../../lib/tables.js';
import { createTRPCRouter, protectedProcedure } from '../init.js';

// Les lieux importés rejoignent le bucket « lieux likés » du voyage (jour 0), celui qui
// s'affiche avant génération et qui alimente la génération de l'itinéraire.
const LIKED_DAY_INDEX = 0;

/** Adresse postale si connue, sinon « ville, pays », sinon null. */
const placeLocation = (place: ExtractedPlace): string | null =>
  place.address ?? ([place.city, place.country].filter(Boolean).join(', ') || null);

/** Vérifie qu'un groupe appartient à l'utilisateur, sinon lève NOT_FOUND. */
const ensureGroupOwned = async (db: Context['db'], userId: string, groupId: string) => {
  const [group] = await db
    .select({ id: inspirationGroup.id })
    .from(inspirationGroup)
    .where(and(eq(inspirationGroup.id, groupId), eq(inspirationGroup.userId, userId)));

  if (!group) throw new TRPCError({ code: 'NOT_FOUND', message: 'Groupe introuvable.' });
};

// Code d'erreur reconnu par le front pour déplier le champ de saisie manuelle.
export const CAPTION_UNAVAILABLE = 'CAPTION_UNAVAILABLE';
// Code d'erreur renvoyé quand l'analyse IA n'est pas configurée côté serveur.
export const AI_UNAVAILABLE = 'AI_UNAVAILABLE';

// On ne relaie qu'un nombre borné d'images d'aperçu vers l'IA.
const MAX_IMAGES = 4;

/** Résumé court d'un lieu pour la colonne `extracted_location` (NOT NULL). */
const summariseLocation = (places: ExtractedPlace[]): string =>
  places
    .slice(0, 3)
    .map((p) => [p.name, p.city].filter(Boolean).join(', '))
    .join(' · ');

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

  /**
   * Analyse par IA (Google Gemini) : on récupère la légende + l'image d'aperçu de la
   * publication, on les soumet au modèle, et on stocke le compte rendu produit ainsi
   * que les lieux détectés (avec leur adresse quand elle est connue).
   */
  analyzeFromUrl: protectedProcedure
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

      // Dédup au niveau de la vidéo : si l'utilisateur a déjà analysé ce lien, on renvoie
      // l'analyse existante sans refaire d'appel IA ni créer un doublon.
      const normalizedUrl = normalizeContentUrl(input.url);
      const mine = await ctx.db
        .select({
          id: importedInspiration.id,
          platform: importedInspiration.platform,
          originalUrl: importedInspiration.originalUrl,
          description: importedInspiration.description,
          report: importedInspiration.report,
          places: importedInspiration.places,
          tags: importedInspiration.extracted_tags,
        })
        .from(importedInspiration)
        .where(eq(importedInspiration.userId, ctx.user.id));

      const existing = mine.find((row) => normalizeContentUrl(row.originalUrl) === normalizedUrl);
      if (existing) {
        return {
          success: true,
          alreadyImported: true,
          inspiration: {
            id: existing.id,
            platform: existing.platform,
            originalUrl: existing.originalUrl,
            description: existing.description,
            report: existing.report,
            places: Array.isArray(existing.places) ? (existing.places as ExtractedPlace[]) : [],
            tags: Array.isArray(existing.tags) ? (existing.tags as string[]) : [],
          },
        };
      }

      const media = await fetchMedia(input.url);
      const caption = input.caption?.trim() || media.caption;

      // Téléchargement best-effort des aperçus : on ignore silencieusement les échecs.
      const downloaded = await Promise.all(
        media.imageUrls.slice(0, MAX_IMAGES).map((imageUrl) => downloadImageAsInline(imageUrl)),
      );
      const images: InlineImage[] = downloaded.filter(
        (image): image is InlineImage => image !== null,
      );

      // Sans légende exploitable ni aucune image, l'IA n'aurait rien à analyser :
      // on propose la saisie manuelle de la légende.
      if (!caption && images.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: CAPTION_UNAVAILABLE });
      }

      let analysis;
      try {
        analysis = await analyzeInspiration({ caption, images });
      } catch (error) {
        if (error instanceof AnalysisError) {
          if (error.reason === 'missing_key') {
            throw new TRPCError({ code: 'PRECONDITION_FAILED', message: AI_UNAVAILABLE });
          }
          if (error.reason === 'blocked') {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: "Cette publication a été refusée par l'analyse (contenu bloqué).",
            });
          }
          throw new TRPCError({
            code: 'BAD_GATEWAY',
            message: "L'analyse IA a échoué, réessaie dans un instant.",
          });
        }
        throw error;
      }

      // Si l'IA n'a pas renvoyé de tags, on retombe sur les hashtags de la légende.
      const tags =
        analysis.tags.length > 0 ? analysis.tags : caption ? extractHashtags(caption) : [];

      // Chaque lieu détecté devient un « élément lieu » réutilisable (dédupliqué), que
      // l'on pourra sélectionner plus tard dans le remplacement d'activités.
      const previewImageUrl = media.imageUrls[0] ?? null;
      await Promise.all(
        analysis.places.map((place) =>
          upsertImportedPlace(ctx.db, ctx.user.id, place, previewImageUrl),
        ),
      );

      const [inspiration] = await ctx.db
        .insert(importedInspiration)
        .values({
          userId: ctx.user.id,
          platform,
          originalUrl: input.url,
          description: caption ? stripHashtags(caption) || null : null,
          extracted_location: summariseLocation(analysis.places),
          extracted_tags: tags,
          report: analysis.summary || null,
          places: analysis.places,
          status: 'analyzed',
        })
        .returning();

      return {
        success: true,
        alreadyImported: false,
        inspiration: {
          id: inspiration.id,
          platform: inspiration.platform,
          originalUrl: inspiration.originalUrl,
          description: inspiration.description,
          report: inspiration.report,
          places: analysis.places,
          tags,
        },
      };
    }),

  /**
   * Ajoute les lieux des inspirations sélectionnées au bucket « lieux likés » (jour 0)
   * d'un voyage de l'utilisateur. Une activité est créée par lieu extrait ; elles sont
   * ensuite prises en compte par la génération de l'itinéraire.
   */
  addToTrip: protectedProcedure
    .input(
      z.object({
        tripId: z.uuid(),
        inspirationIds: z.array(z.uuid()).min(1, 'Sélectionne au moins un post.'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Périmètre à l'utilisateur : on ne touche qu'un voyage et des inspirations à lui.
      const [tripRow] = await ctx.db
        .select({ id: trip.id })
        .from(trip)
        .where(and(eq(trip.id, input.tripId), eq(trip.userId, ctx.user.id)));

      if (!tripRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: "Ce voyage n'existe pas." });
      }

      const inspirations = await ctx.db
        .select({ places: importedInspiration.places })
        .from(importedInspiration)
        .where(
          and(
            eq(importedInspiration.userId, ctx.user.id),
            inArray(importedInspiration.id, input.inspirationIds),
          ),
        );

      const places = inspirations.flatMap((row) =>
        Array.isArray(row.places) ? (row.places as ExtractedPlace[]) : [],
      );

      if (places.length === 0) {
        return { success: true, tripId: input.tripId, added: 0 };
      }

      // On rattache chaque lieu à son « élément lieu » (créé/dédupliqué), pour que les
      // activités partagent la même identité que les candidats du remplacement.
      const placesWithContent = await Promise.all(
        places.map(async (place) => ({
          place,
          discoveryContentId: await upsertImportedPlace(ctx.db, ctx.user.id, place),
        })),
      );

      const added = await ctx.db.transaction(async (tx) => {
        // Le bucket « lieux likés » (jour 0) peut ne pas exister encore.
        let [likedDay] = await tx
          .select({ id: tripDay.id })
          .from(tripDay)
          .where(and(eq(tripDay.tripId, input.tripId), eq(tripDay.dayIndex, LIKED_DAY_INDEX)));

        if (!likedDay) {
          [likedDay] = await tx
            .insert(tripDay)
            .values({ tripId: input.tripId, dayIndex: LIKED_DAY_INDEX, summary: 'Lieux likés' })
            .returning({ id: tripDay.id });
        }

        // On ajoute à la suite des activités déjà présentes dans le bucket.
        const [{ maxOrder } = { maxOrder: null }] = await tx
          .select({ maxOrder: max(activity.orderIndex) })
          .from(activity)
          .where(eq(activity.tripDayId, likedDay.id));

        const startIndex = (maxOrder ?? -1) + 1;

        await tx.insert(activity).values(
          placesWithContent.map(({ place, discoveryContentId }, i) => ({
            tripDayId: likedDay.id,
            discoveryContentId: discoveryContentId ?? undefined,
            title: place.name,
            description: place.description ?? undefined,
            locationName: placeLocation(place) ?? undefined,
            orderIndex: startIndex + i,
          })),
        );

        return places.length;
      });

      return { success: true, tripId: input.tripId, added };
    }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: importedInspiration.id,
        platform: importedInspiration.platform,
        originalUrl: importedInspiration.originalUrl,
        description: importedInspiration.description,
        report: importedInspiration.report,
        places: importedInspiration.places,
        tags: importedInspiration.extracted_tags,
        status: importedInspiration.status,
        createdAt: importedInspiration.createdAt,
      })
      .from(importedInspiration)
      .where(eq(importedInspiration.userId, ctx.user.id))
      .orderBy(desc(importedInspiration.createdAt))
      .limit(100);

    // Appartenances aux groupes (N-N) des inspirations listées.
    const ids = rows.map((r) => r.id);
    const members = ids.length
      ? await ctx.db
          .select({
            inspirationId: inspirationGroupMember.inspirationId,
            groupId: inspirationGroupMember.groupId,
          })
          .from(inspirationGroupMember)
          .where(inArray(inspirationGroupMember.inspirationId, ids))
      : [];

    const groupsByInspiration = new Map<string, string[]>();
    for (const m of members) {
      const list = groupsByInspiration.get(m.inspirationId) ?? [];
      list.push(m.groupId);
      groupsByInspiration.set(m.inspirationId, list);
    }

    // `extracted_tags` / `places` sont des jsonb : on normalise à la lecture.
    return rows.map((row) => ({
      ...row,
      tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
      places: Array.isArray(row.places) ? (row.places as ExtractedPlace[]) : [],
      groupIds: groupsByInspiration.get(row.id) ?? [],
    }));
  }),

  /** Supprime une publication analysée. Les lieux déjà ajoutés à des voyages sont conservés. */
  delete: protectedProcedure.input(z.object({ id: z.uuid() })).mutation(async ({ ctx, input }) => {
    const deleted = await ctx.db
      .delete(importedInspiration)
      .where(and(eq(importedInspiration.id, input.id), eq(importedInspiration.userId, ctx.user.id)))
      .returning({ id: importedInspiration.id });

    if (deleted.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Publication introuvable.' });
    }

    return { success: true };
  }),

  listGroups: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: inspirationGroup.id,
        name: inspirationGroup.name,
        createdAt: inspirationGroup.createdAt,
      })
      .from(inspirationGroup)
      .where(eq(inspirationGroup.userId, ctx.user.id))
      .orderBy(desc(inspirationGroup.createdAt));
  }),

  createGroup: protectedProcedure
    .input(z.object({ name: z.string().trim().min(1, 'Donne un nom au groupe.').max(60) }))
    .mutation(async ({ ctx, input }) => {
      const [group] = await ctx.db
        .insert(inspirationGroup)
        .values({ userId: ctx.user.id, name: input.name })
        .returning({ id: inspirationGroup.id, name: inspirationGroup.name });

      return { success: true, group };
    }),

  deleteGroup: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Les appartenances sont supprimées en cascade ; les publications sont conservées.
      const deleted = await ctx.db
        .delete(inspirationGroup)
        .where(and(eq(inspirationGroup.id, input.id), eq(inspirationGroup.userId, ctx.user.id)))
        .returning({ id: inspirationGroup.id });

      if (deleted.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Groupe introuvable.' });
      }

      return { success: true };
    }),

  /** Ajoute des publications à un groupe (relation N-N, idempotent). */
  addToGroup: protectedProcedure
    .input(
      z.object({
        inspirationIds: z.array(z.uuid()).min(1, 'Sélectionne au moins une publication.'),
        groupId: z.uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ensureGroupOwned(ctx.db, ctx.user.id, input.groupId);

      // On ne lie que des inspirations appartenant à l'utilisateur.
      const owned = await ctx.db
        .select({ id: importedInspiration.id })
        .from(importedInspiration)
        .where(
          and(
            eq(importedInspiration.userId, ctx.user.id),
            inArray(importedInspiration.id, input.inspirationIds),
          ),
        );

      if (owned.length > 0) {
        await ctx.db
          .insert(inspirationGroupMember)
          .values(owned.map((o) => ({ inspirationId: o.id, groupId: input.groupId })))
          .onConflictDoNothing();
      }

      return { success: true, added: owned.length };
    }),

  /** Retire des publications d'un groupe (sans les supprimer). */
  removeFromGroup: protectedProcedure
    .input(
      z.object({
        inspirationIds: z.array(z.uuid()).min(1, 'Sélectionne au moins une publication.'),
        groupId: z.uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ensureGroupOwned(ctx.db, ctx.user.id, input.groupId);

      const removed = await ctx.db
        .delete(inspirationGroupMember)
        .where(
          and(
            eq(inspirationGroupMember.groupId, input.groupId),
            inArray(inspirationGroupMember.inspirationId, input.inspirationIds),
          ),
        )
        .returning({ inspirationId: inspirationGroupMember.inspirationId });

      return { success: true, removed: removed.length };
    }),
});
