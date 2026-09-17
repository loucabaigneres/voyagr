import { TRPCError } from '@trpc/server';
import { and, count, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { swipes, trip, user } from '../../lib/tables.js';
import { createTRPCRouter, publicProcedure } from '../init.js';

export const userRouter = createTRPCRouter({
  getProfile: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Vous devez être connecté pour accéder à cette ressource.',
      });
    }

    const [userData] = await ctx.db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.id, ctx.user.id));

    const [tripsCount] = await ctx.db
      .select({ value: count() })
      .from(trip)
      .where(eq(trip.userId, ctx.user.id));

    const [likedCount] = await ctx.db
      .select({ value: count() })
      .from(swipes)
      .where(eq(swipes.userId, ctx.user.id));

    return {
      user: userData,
      stats: {
        tripsCount: Number(tripsCount?.value ?? 0),
        likedPlacesCount: Number(likedCount?.value ?? 0),
      },
    };
  }),

  getTrips: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Non authentifié.' });
    }

    return await ctx.db
      .select({
        id: trip.id,
        title: trip.title,
        destination: trip.destination,
        status: trip.status,
        createdAt: trip.createdAt,
      })
      .from(trip)
      .where(eq(trip.userId, ctx.user.id))
      .orderBy(desc(trip.createdAt));
  }),

  updateProfile: publicProcedure
    .input(
      z.object({
        name: z.string().min(2, 'Le nom doit comporter au moins 2 caractères'),
        image: z.string().url().optional().or(z.literal('')),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Non authentifié.' });
      }

      await ctx.db
        .update(user)
        .set({
          name: input.name,
          image: input.image || null,
          updatedAt: new Date(),
        })
        .where(eq(user.id, ctx.user.id));

      return { success: true };
    }),

  saveTripToAccount: publicProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Vous devez être connecté pour enregistrer ce voyage.',
        });
      }

      const [current] = await ctx.db
        .select({ ownerId: trip.userId, ownerAccount: user.id })
        .from(trip)
        .leftJoin(user, eq(user.id, trip.userId))
        .where(eq(trip.id, input.tripId));

      if (!current) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Voyage introuvable.' });
      }

      // Only guest trips can change hands; an account's trip stays with it.
      if (current.ownerAccount && current.ownerId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Ce voyage appartient à un autre compte.',
        });
      }

      const [updatedTrip] = await ctx.db
        .update(trip)
        .set({
          userId: ctx.user.id,
          status: 'finalized',
          updatedAt: new Date(),
        })
        // Re-checking the owner guards against a concurrent claim.
        .where(and(eq(trip.id, input.tripId), eq(trip.userId, current.ownerId)))
        .returning();

      if (!updatedTrip) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: "Ce voyage vient d'être enregistré par un autre compte.",
        });
      }

      return { success: true, trip: updatedTrip };
    }),
});
