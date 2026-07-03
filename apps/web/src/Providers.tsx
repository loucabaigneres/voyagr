import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState, type ReactNode } from 'react';
import { env } from './env';
import { trpc } from './lib/trpc';

export function Providers({ children }: { children: ReactNode }) {
  // Initialisation de React Query
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
      },
    },
  }));

  // Initialisation du client tRPC
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${env.VITE_API_URL}/trpc`,
          // On intercepte l'appel fetch de tRPC pour y glisser notre paramètre
          fetch: (url, options) => {
            return fetch(url, {
              ...options,
              credentials: 'include', // Indispensable pour Better Auth
            });
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
