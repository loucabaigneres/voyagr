import { createTRPCRouter, publicProcedure } from '../init.js';
import { submitOnboardingSchema } from '../schemas/onboarding.js';
import { trip, userOnboarding } from '@voyagr/database';
import { z } from 'zod';

export const onboardingRouter = createTRPCRouter({
  startDirectTrip: publicProcedure
    .input(
      z
        .object({
          guestId: z.string().optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const targetUserId = ctx.user?.id ?? input?.guestId ?? 'guest';

      const [newTrip] = await ctx.db
        .insert(trip)
        .values({
          userId: targetUserId,
          status: 'draft',
        })
        .returning({ id: trip.id });

      return {
        tripId: newTrip.id,
      };
    }),

  submit: publicProcedure.input(submitOnboardingSchema).mutation(async ({ ctx, input }) => {
    const targetUserId = ctx.user?.id ?? input.guestId ?? 'guest';

    const [newTrip] = await ctx.db
      .insert(trip)
      .values({
        userId: targetUserId,
        status: 'draft',
        interests: input.vibes,
      })
      .returning({ id: trip.id });

    await ctx.db.insert(userOnboarding).values({
      tripId: newTrip.id,
      userId: ctx.user?.id ?? null,
      landscapes: input.landscapes,
      vibes: input.vibes,
      travelWith: input.travelWith,
      climates: input.climates,
    });

    return {
      success: true,
      tripId: newTrip.id,
    };
  }),
});
