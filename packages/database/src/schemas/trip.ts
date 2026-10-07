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
  varchar,
} from 'drizzle-orm/pg-core';
import { averagePriceEnum, tripIntensityEnum, tripStatusEnum } from '../enums.js';
import { discoveryContent } from './inspiration.js';
import { user } from './auth.js';

export const trip = pgTable('trip', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  title: text('title'),
  destination: text('destination'),
  numberOfPeople: integer('number_people'),
  ages: jsonb('ages'),
  intensity: tripIntensityEnum('intensity'),
  averagePrice: averagePriceEnum('average_price'),
  startDate: date('start_date'),
  durationDays: integer('duration_days'),
  dietaryRestrictions: text('dietary_restrictions'),
  medicalConditions: text('medical_conditions'),
  interests: jsonb('interests'),
  status: tripStatusEnum('status').default('draft'),
  isPremium: boolean('is_premium').default(false),
  confirmed: boolean('confirmed').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  isGroup: boolean('is_group').default(false).notNull(),
  inviteCode: varchar('invite_code', { length: 12 }).unique(),
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
  startTime: time('start_time'),
  endTime: time('end_time'),
  locationName: text('location_name'),
  coordinates: text('coordinates'),
  estimatedCost: numeric('estimated_cost'),
  orderIndex: integer('order_index').notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const tripMembers = pgTable(
  'trip_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trip.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['owner', 'member'] })
      .default('member')
      .notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('trip_user_unique_idx').on(table.tripId, table.userId)],
);
