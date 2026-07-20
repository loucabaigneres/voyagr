import { TRPCError } from '@trpc/server';
import { swipeDirectionEnum, discoveryContent, swipes, trip } from '@voyagr/database';
import { and, eq, notExists } from 'drizzle-orm';
import * as z from 'zod';
import { createTRPCRouter, protectedProcedure, publicProcedure } from './init.js';
import { discoveryRouter } from './routers/discovery.js';
import { inspirationRouter } from './routers/inspiration.js';
import { itineraryRouter } from './routers/itinerary.js';
import { tripFormSchema } from './schemas/trip.js';

export const appRouter = createTRPCRouter({
  // Example route that requires authentication
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.user.id,
      name: ctx.user.name,
      email: ctx.user.email,
    };
  }),

  getDiscoveryCards: publicProcedure
    .input(
      z.object({
        guestId: z.string().optional(),
        limit: z.number().min(1).max(20).default(5),
      }),
    )
    .query(async ({ ctx, input }) => {
      const identityId = ctx.user?.id ?? input.guestId;
      if (!identityId) return []; // If no user or guest ID is provided, return an empty array.

      const cards = await ctx.db
        .select()
        .from(discoveryContent)
        .where(
          and(
            eq(discoveryContent.isActive, true), // Only fetch active content
            notExists(
              ctx.db
                .select()
                .from(swipes)
                .where(
                  and(
                    eq(swipes.discoveryContentId, discoveryContent.id),
                    eq(swipes.userId, identityId), // Check if the user or guest has already swiped on this content
                  ),
                ),
            ),
          ),
        )
        .limit(input.limit);

      return cards;
    }),

  swipeContent: publicProcedure
    .input(
      z.object({
        guestId: z.string().optional(),
        contentId: z.uuid(),
        direction: z.enum(swipeDirectionEnum.enumValues),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const identityId = ctx.user?.id ?? input.guestId;
      if (!identityId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Un identifiant utilisateur ou invité est requis pour effectuer un swipe.',
        });
      }

      await ctx.db
        .insert(swipes)
        .values({
          userId: identityId,
          discoveryContentId: input.contentId,
          direction: input.direction,
        })
        // Ensures that if a swipe already exists for this user and content, it won't create a duplicate entry. Instead, it will ignore the new swipe attempt.
        .onConflictDoNothing({ target: [swipes.userId, swipes.discoveryContentId] }); // Avoid duplicate swipes

      return { success: true };
    }),

  // Form routes (Arthur)
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

  // Feed and itinerary routers (Leo & Raphael)
  discovery: createTRPCRouter({
    ...discoveryRouter,
    ...itineraryRouter,
  }),

  inspiration: createTRPCRouter({
    ...inspirationRouter,
  }),
});

export type AppRouter = typeof appRouter;
