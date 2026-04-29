import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { createClient } from '@voyagr/database';
import { env } from '../env.js';

const db = createClient(env.DATABASE_URL);

export function createContext({ req, res }: CreateFastifyContextOptions) {
  return {
    req,
    res,
    db,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
