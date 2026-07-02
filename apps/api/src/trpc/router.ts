import { initTRPC, TRPCError } from '@trpc/server';
import * as z from 'zod';
import { Context } from './context.js';
import { trip } from '@voyagr/database/src/schemas/trip.js';
import { tripFormSchema } from './schemas/trip.js';

// Init tRPC with the context type
const t = initTRPC.context<Context>().create();

// Create a public procedure (accessible without authentication)
const publicProcedure = t.procedure;

// Middleware to check if the user is authenticated
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Vous devez être connecté pour effectuer cette action.',
    });
  }

  // If the user is authenticated, proceed to the next middleware or resolver
  return next({
    ctx: {
      user: ctx.user,
      session: ctx.session,
    },
  });
});

// Protected route (requires authentication)
export const protectedProcedure = t.procedure.use(isAuthed);

// Main router of the application
export const appRouter = t.router({
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

  submitTripConfiguration: protectedProcedure
    .input(tripFormSchema)
    .mutation(async ({ ctx, input }) => {
      const [newTrip] = await ctx.db
        .insert(trip)
        .values({
          userId: ctx.user.id,
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
          status: 'draft',
        })
        .returning({ id: trip.id });

      return {
        success: true,
        tripId: newTrip.id,
      };
    }),

  getTripConfiguration: protectedProcedure
    .input(
      z.object({
        tripId: z.uuid("L'identifiant du voyage doit être un UUID valide."),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentTrip = await ctx.db.query.trip.findFirst({
        where: (tripFields, { eq, and }) =>
          and(eq(tripFields.id, input.tripId), eq(tripFields.userId, ctx.user.id)),
      });

      if (!currentTrip) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: "Ce voyage n'existe pas ou vous n'avez pas l'autorisation d'y accéder.",
        });
      }

      return currentTrip;
    }),
});

export type AppRouter = typeof appRouter;
