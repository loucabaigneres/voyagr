import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import superjson from 'superjson'
import { createTRPCClient, httpBatchStreamLink } from '@trpc/client'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'

import type { AppRouter } from '../../../../api/src/trpc/router'
import { TRPCProvider } from '#/integrations/trpc/react'
import { env } from '#/env'

function getUrl() {
  return `${env.VITE_API_URL}/trpc`
}

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchStreamLink({
      transformer: superjson,
      url: getUrl(),
      fetch(url, options) {
        return fetch(url, { ...options, credentials: 'include' })
      },
    }),
  ],
})

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      dehydrate: { serializeData: superjson.serialize },
      hydrate: { deserializeData: superjson.deserialize },
    },
  })

  const serverHelpers = createTRPCOptionsProxy({
    client: trpcClient,
    queryClient: queryClient,
  })
  const context = {
    queryClient,
    trpc: serverHelpers,
  }

  return context
}

export default function TanstackQueryProvider({
  children,
  context,
}: {
  children: ReactNode
  context: ReturnType<typeof getContext>
}) {
  const { queryClient } = context

  return (
    <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
      {children}
    </TRPCProvider>
  )
}
