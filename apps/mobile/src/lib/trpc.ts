import { QueryClient } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
// Type-only import: no server code ends up in the app bundle.
import type { AppRouter } from '@voyagr/api/src/trpc/router';
import { Platform } from 'react-native';

import { env } from '@/env';

import { getAuthHeaders } from './auth-client';

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
      headers: getAuthHeaders,
      // Native sends the session cookie by hand (see `getAuthHeaders`); `omit` avoids a clash.
      fetch: (url, options) =>
        fetch(url, { ...options, credentials: Platform.OS === 'web' ? 'include' : 'omit' }),
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
