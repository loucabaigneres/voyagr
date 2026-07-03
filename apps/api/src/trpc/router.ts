import { TRPCError } from '@trpc/server';
import { trip } from '@voyagr/database/src/schemas/trip.js';
import { eq } from 'drizzle-orm';
import * as z from 'zod';
import { createTRPCRouter, protectedProcedure, publicProcedure } from './init.js';
import { discoveryRouter } from './routers/discovery.js';
import { itineraryRouter } from './routers/itinerary.js';
import { tripFormSchema } from './schemas/trip.js';

export { protectedProcedure };

// Main router of the application
export const appRouter = createTRPCRouter({
  // 1. Example of a public procedure that returns a greeting message
  hello: publicProcedure.input(z.object({ name: z.string() })).query(({ input }) => {
    return { message: `Hello ${input.name}, welcome to Voyagr API!` };
  }),

  getInspirations: publicProcedure.query(async ({ ctx }) => {
    const inspirations = await ctx.db.query.importedInspiration.findMany();
    return inspirations;
  }),

  // Example route that requires authentication
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.user.id,
      name: ctx.user.name,
      email: ctx.user.email,
    };
  }),

  submitTripConfiguration: publicProcedure
    .input(tripFormSchema.extend({ tripId: z.uuid().optional() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id ?? 'guest';
      const values = {
        destination: input.destination,
        numberOfPeople: input.numberOfPeople,
        ages: input.ages,
        startDate: input.startDate,
        durationDays: input.durationDays,
        averagePrice: input.averagePrice as typeof trip.$inferInsert.averagePrice,
        dietaryRestrictions: input.dietaryRestrictions,
        medicalConditions: input.medicalConditions,
        interests: input.interests,
        intensity: input.intensity as typeof trip.$inferInsert.intensity,
      };

      // A tripId means this trip was already created by the swipe flow
      // (with liked places attached) — fill in the rest instead of forking a new one.
      if (input.tripId) {
        const [updatedTrip] = await ctx.db
          .update(trip)
          .set(values)
          .where(eq(trip.id, input.tripId))
          .returning({ id: trip.id });

        if (!updatedTrip) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Voyage introuvable.' });
        }

        return { success: true, tripId: updatedTrip.id };
      }

      const [newTrip] = await ctx.db
        .insert(trip)
        .values({ userId, ...values, status: 'draft' })
        .returning({ id: trip.id });

      return {
        success: true,
        tripId: newTrip.id,
      };
    }),

  getTripConfiguration: publicProcedure
    .input(
      z.object({
        tripId: z.uuid("L'identifiant du voyage doit être un UUID valide."),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentTrip = await ctx.db.query.trip.findFirst({
        where: (tripFields, { eq: eqField }) => eqField(tripFields.id, input.tripId),
      });

      if (!currentTrip) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: "Ce voyage n'existe pas ou vous n'avez pas l'autorisation d'y accéder.",
        });
      }

      return currentTrip;
    }),

  discovery: createTRPCRouter({
    ...discoveryRouter,
    ...itineraryRouter,
  }),
});

export type AppRouter = typeof appRouter;
