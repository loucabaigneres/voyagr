import { initTRPC } from '@trpc/server'
import superjson from 'superjson'

import type { VoyagrDb } from '#/db/voyagr'

/**
 * Per-request tRPC context.
 * - `db`: shared Voyagr database client (used by write paths like saveTrip).
 * - `userId`: resolved from the better-auth session, or `'guest'` when
 *   unauthenticated.
 */
export interface TRPCContext {
  db: VoyagrDb
  userId: string
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
})

export const createTRPCRouter = t.router
export const publicProcedure = t.procedure
