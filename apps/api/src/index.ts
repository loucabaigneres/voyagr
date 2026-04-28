import { env } from "./env.js";

import cors from "@fastify/cors";
import {
  fastifyTRPCPlugin,
  FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import Fastify from "fastify";
import { createContext } from "./trpc/context.js";
import { AppRouter, appRouter } from "./trpc/router.js";

const server = Fastify({ logger: true });

await server.register(cors, {
  origin: "*", // Allow all origins for development purposes
});

// Register the tRPC plugin with the Fastify server
await server.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: {
    router: appRouter,
    createContext,
    onError({ path, error }) {
      console.error(`Error in tRPC handler on path '${path}':`, error);
    },
  } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
});

(async () => {
  try {
    // Listen on port 3000 and bind to all network interfaces for Docker compatibility
    await server.listen({ port: env.PORT, host: "0.0.0.0" });
    console.log("Server started at http://localhost:3000/trpc");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
})();
