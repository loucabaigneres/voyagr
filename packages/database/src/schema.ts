import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const platformEnum = pgEnum("platform", [
  "tiktok",
  "instagram",
  "other",
]);

export const processingStatus = pgEnum("processing_status", [
  "pending",
  "analyzed",
  "failed",
]);

export const importedInspiration = pgTable("imported_inspiration", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  platform: platformEnum("platform").notNull(),
  originalUrl: text("original_url").notNull(),
  extracted_location: text("extracted_location").notNull(),
  extracted_tags: jsonb("extracted_tags").notNull(),
  status: processingStatus("status").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
