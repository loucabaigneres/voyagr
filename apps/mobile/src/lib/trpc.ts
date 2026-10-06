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
      // En mobile, le "Window Focus" n'a pas de sens strict.
      // Si on veut re-fetch au retour de l'app en premier plan, on utilise AppState.
      // Le mettre à false ici est la bonne pratique.
      refetchOnWindowFocus: false,
    },
  },
});

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.EXPO_PUBLIC_API_URL}/trpc`,
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          // React Native gère les cookies reçus par l'API grâce à son moteur réseau natif
          credentials: 'include',
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
