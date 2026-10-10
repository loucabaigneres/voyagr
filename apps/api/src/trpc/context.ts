import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth.js';
import { db } from '../lib/db.js';

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  return {
    req,
    res,
    db,
    user: session?.user || null,
    session: session || null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
