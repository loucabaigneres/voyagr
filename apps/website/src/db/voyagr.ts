/**
 * Shared Voyagr database client (used only by write paths, e.g. saving a trip).
 *
 * The swipe + recommendation flow runs entirely off `data.json` and needs no
 * database. Importing this module does NOT open a connection — postgres-js
 * connects lazily on the first query — so the no-DB swipe experience keeps
 * working even when Postgres isn't running.
 */
import { createClient, schema } from '@voyagr/database'

export const voyagrDb = createClient(process.env.DATABASE_URL ?? '')

export { schema }
export const { discoveryContent, trip, tripDay, activity, swipes } = schema

export type VoyagrDb = typeof voyagrDb
