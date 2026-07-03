import { createTRPCContext } from '@trpc/tanstack-react-query'
import type { AppRouter } from '../../../../api/src/trpc/router'

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>()
