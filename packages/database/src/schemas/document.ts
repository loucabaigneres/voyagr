import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { documentTypeEnum } from '../enums.js';
import { trip } from './trip.js';

export const generatedDocument = pgTable('generated_document', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id')
    .references(() => trip.id)
    .notNull(),
  s3ObjectKey: text('s3_object_key').notNull(),
  version: integer('version').default(1),
  docType: documentTypeEnum('doc_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
