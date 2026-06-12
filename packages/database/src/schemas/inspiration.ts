import { boolean, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { platformEnum, processingStatus, swipeDirectionEnum } from '../enums.js';

export const importedInspiration = pgTable('imported_inspiration', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  platform: platformEnum('platform').notNull(),
  originalUrl: text('original_url').notNull(),
  extracted_location: text('extracted_location').notNull(),
  extracted_tags: jsonb('extracted_tags').notNull(),
  status: processingStatus('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const discoveryContent = pgTable('discovery_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  url: text('url').notNull().unique(),
  mainMediaUrl: text('main_media_url').notNull(),
  carousselUrls: text('caroussel_urls').array(),
  locationName: text('location_name'),
  description: text('description'),
  country: text('country'),
  city: text('city'),
  coordinates: text('coordinates'),
  tags: jsonb('tags'),
  isActive: boolean('is_active').default(true),
});

export const swipes = pgTable(
  'swipe',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    discoveryContentId: uuid('discovery_context_id')
      .references(() => discoveryContent.id)
      .notNull(),
    direction: swipeDirectionEnum('direction').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('user_swipe_idx').on(table.userId, table.discoveryContentId)],
);
