import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { averagePriceEnum, tripIntensityEnum, tripStatusEnum } from '../enums.js';
import { discoveryContent } from './inspiration.js';

export const trip = pgTable('trip', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  title: text('title'),
  destination: text('destination'),
  numberOfPeople: integer('number_people'),
  /** != MVP */
  ages: jsonb('ages'),
  intensity: tripIntensityEnum('intensity'),
  averagePrice: averagePriceEnum('average_price'),
  startDate: date('start_date'),
  durationDays: integer('duration_days'),
  /** != MVP */
  dietaryRestrictions: text('dietary_restrictions'),
  /** != MVP */
  medicalConditions: text('medical_conditions'),
  /** != MVP */
  interests: jsonb('interests'),
  status: tripStatusEnum('status').default('draft'),
  isPremium: boolean('is_premium').default(false),
  confirmed: boolean('confirmed').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const tripDay = pgTable(
  'trip_day',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .references(() => trip.id)
      .notNull(),
    dayIndex: integer('day_index').notNull(),
    targetDate: date('target_date'),
    summary: text('summary'),
  },
  (table) => [uniqueIndex('trip_day_idx').on(table.tripId, table.dayIndex)],
);

export const activity = pgTable('activity', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripDayId: uuid('trip_day_id')
    .references(() => tripDay.id)
    .notNull(),
  discoveryContentId: uuid('discovery_content_id').references(() => discoveryContent.id),
  title: text('title').notNull(),
  description: text('description'),
  /** != MVP */
  startTime: time('start_time'),
  /** != MVP */
  endTime: time('end_time'),
  locationName: text('location_name'),
  coordinates: text('coordinates'),
  estimatedCost: numeric('estimated_cost'),
  orderIndex: integer('order_index').notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
