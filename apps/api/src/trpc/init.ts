import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from './context.js';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;

// Create a public procedure (accessible without authentication)
export const publicProcedure = t.procedure;

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
