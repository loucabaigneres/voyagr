import { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { createClient } from "@voyagr/database";

const db = createClient(process.env.DATABASE_URL!);

export function createContext({ req, res }: CreateFastifyContextOptions) {
  return {
    req,
    res,
    db,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
