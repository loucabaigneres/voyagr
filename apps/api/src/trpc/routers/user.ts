import { TRPCError } from '@trpc/server';
import { count, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { swipes, trip, user } from '../../lib/tables.js';
import { createTRPCRouter, protectedProcedure } from '../init.js';

export const userRouter = createTRPCRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
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

  getTrips: protectedProcedure.query(async ({ ctx }) => {
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

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2, 'Le nom doit comporter au moins 2 caractères'),
        image: z.string().url().optional().or(z.literal('')),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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

  saveTripToAccount: protectedProcedure
    .input(z.object({ tripId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updatedTrip] = await ctx.db
        .update(trip)
        .set({
          userId: ctx.user.id,
          status: 'finalized',
          updatedAt: new Date(),
        })
        .where(eq(trip.id, input.tripId))
        .returning();

      if (!updatedTrip) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Voyage introuvable.' });
      }

      return { success: true, trip: updatedTrip };
    }),
});
