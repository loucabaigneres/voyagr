import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { paymentStatusEnum } from '../enums.js';
import { trip } from './trip.js';

export const paymentTransaction = pgTable('payment_transaction', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  tripId: uuid('trip_id').references(() => trip.id),
  stripeSessionId: text('stripe_session_id').unique(),
  amount: integer('amount').notNull(),
  currency: text('currency').default('EUR'),
  status: paymentStatusEnum('status').default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
