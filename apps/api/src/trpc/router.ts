import { initTRPC } from "@trpc/server";
import * as z from "zod";
import { Context } from "./context.js";

// Init tRPC with the context type
const t = initTRPC.context<Context>().create();

// Create a public procedure (accessible without authentication)
const publicProcedure = t.procedure;

// Main router of the application
export const appRouter = t.router({
  // 1. Example of a public procedure that returns a greeting message
  hello: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => {
      return { message: `Hello ${input.name}, welcome to Voyagr API!` };
    }),

  getInspirations: publicProcedure.query(async ({ ctx }) => {
    const inspirations = await ctx.db.query.importedInspiration.findMany();
    return inspirations;
  }),
});

export type AppRouter = typeof appRouter;
