import { QueryClient } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
// Type-only import: no server code ends up in the app bundle.
import type { AppRouter } from '@voyagr/api/src/trpc/router';

import { env } from '@/env';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Opt-in per query: refetching on resume would, for instance, reshuffle the swipe deck.
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.EXPO_PUBLIC_API_URL}/trpc`,
      fetch: (url, options) => fetch(url, { ...options, credentials: 'include' }),
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
