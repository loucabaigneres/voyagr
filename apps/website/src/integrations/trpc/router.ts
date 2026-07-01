import { createTRPCRouter } from './init'
import { todosRouter } from './routers/todos'
import { discoveryRouter } from './routers/discovery'
import { itineraryRouter } from './routers/itinerary'

export const trpcRouter = createTRPCRouter({
  todos: todosRouter,
  discovery: createTRPCRouter({
    ...discoveryRouter,
    ...itineraryRouter,
  }),
})

export type TRPCRouter = typeof trpcRouter
