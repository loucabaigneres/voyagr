import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth.js';
import { trip } from './trip.js';

export const userOnboarding = pgTable('user_onboarding', {
  id: uuid('id').defaultRandom().primaryKey(),
  tripId: uuid('trip_id')
    .notNull()
    .references(() => trip.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
  landscapes: text('landscapes').array().notNull().default([]),
  vibes: text('vibes').array().notNull().default([]),
  travelWith: text('travel_with').array().notNull().default([]),
  climates: text('climates').array().notNull().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userOnboardingRelations = relations(userOnboarding, ({ one }) => ({
  user: one(user, {
    fields: [userOnboarding.userId],
    references: [user.id],
  }),
  trip: one(trip, {
    fields: [userOnboarding.tripId],
    references: [trip.id],
  }),
}));
