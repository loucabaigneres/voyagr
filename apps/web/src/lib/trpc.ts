import { QueryClient } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
// Only import the AppRouter type from the API package, not the entire router implementation
// So that we avoid bundling unnecessary server-side code into the client bundle.
import type { AppRouter } from '@voyagr/api/src/trpc/router';
import { env } from '../env';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Disable refetching on window focus
    },
  },
});

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.VITE_API_URL}/trpc`,
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          credentials: 'include', // Indispensable pour Better Auth
        });
      },
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
