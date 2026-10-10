import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * E-mails collected on the mobile-app teaser landing page (`apps/landing-page`).
 *
 * `email` is unique so repeat sign-ups are idempotent (handled with
 * `onConflictDoNothing` on insert). `source` records where the sign-up came from
 * (e.g. `'landing-page'`) in case other surfaces start feeding the same waitlist.
 */
export const waitlistSubscriber = pgTable('waitlist_subscriber', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  source: text('source'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
