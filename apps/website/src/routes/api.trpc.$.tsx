import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { createFileRoute } from '@tanstack/react-router'

import { voyagrDb } from '#/db/voyagr'
import { auth } from '#/lib/auth'
import { trpcRouter } from '#/integrations/trpc/router'
import type { TRPCContext } from '#/integrations/trpc/init'

/**
 * Resolves the acting user id. Authenticated users get their session id;
 * everyone else falls back to a shared `'guest'` bucket.
 */
async function resolveUserId(request: Request): Promise<string> {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    return session?.user.id ?? 'guest'
  } catch {
    return 'guest'
  }
}

async function handler({ request }: { request: Request }) {
  return fetchRequestHandler({
    req: request,
    router: trpcRouter,
    endpoint: '/api/trpc',
    createContext: async (): Promise<TRPCContext> => ({
      db: voyagrDb,
      userId: await resolveUserId(request),
    }),
  })
}

export const Route = createFileRoute('/api/trpc/$')({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
    },
  },
})
