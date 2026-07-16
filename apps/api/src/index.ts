import { env } from './env.js';

import cors from '@fastify/cors';
import { fastifyTRPCPlugin, FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify';
import { fromNodeHeaders } from 'better-auth/node';
import Fastify from 'fastify';
import { auth } from './lib/auth.js';
import { createContext } from './trpc/context.js';
import { AppRouter, appRouter } from './trpc/router.js';

const server = Fastify({ logger: true });

await server.register(cors, {
  origin: [
    'https://voyagr-web-mu.vercel.app',
    'https://voyagr-web-*.vercel.app',
    'voyagr-*-arthurgramonts-projects.vercel.app',
    'http://localhost:3001',
  ], // Allow requests from the frontend URL
  credentials: true, // Allow cookies to be sent in cross-origin requests
  allowedHeaders: ['Content-Type', 'Authorization', 'trpc-accept'], // Allow these headers in requests
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allow these HTTP methods
});

server.route({
  method: ['GET', 'POST'],
  url: '/api/auth/*',
  async handler(request, reply) {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const headers = fromNodeHeaders(request.headers);

      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      });

      const response = await auth.handler(req);

      reply.status(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));
      return reply.send(response.body ? await response.text() : null);
    } catch (error) {
      server.log.error(error, 'Authentication Error');
      return reply.status(500).send({ error: 'Internal authentication error' });
    }
  },
});

// Register the tRPC plugin with the Fastify server
await server.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: {
    router: appRouter,
    createContext,
    onError({ path, error }) {
      console.error(`Error in tRPC handler on path '${path}':`, error);
    },
  } satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions'],
});

(async () => {
  try {
    // Listen on port 3000 and bind to all network interfaces for Docker compatibility
    await server.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
})();
