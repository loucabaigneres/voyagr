import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export * from "./schema.js";

export const createClient = (connectionString: string) => {
  const client = postgres(connectionString);
  return drizzle({ client, schema });
};
