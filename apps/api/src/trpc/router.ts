import { initTRPC, TRPCError } from '@trpc/server';
import * as z from 'zod';
import { Context } from './context.js';

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
});

export type AppRouter = typeof appRouter;
