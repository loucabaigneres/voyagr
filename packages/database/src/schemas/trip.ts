import { boolean, date, integer, numeric, pgTable, text, time, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { tripStatusEnum } from "../enums.js";
import { discoveryContent } from "./inspiration.js";

export const trip = pgTable("trip", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  title: text("title"),
  destination: text("destination"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: tripStatusEnum("status").default("draft"),
  isPremium: boolean("is_premium").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const tripDay = pgTable("trip_day", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id").references(() => trip.id).notNull(),
  dayIndex: integer("day_index").notNull(),
  targetDate: date("target_date"),
  summary: text("summary"),
}, (table) => [
  uniqueIndex("trip_day_idx").on(table.tripId, table.dayIndex),
]);

export const activity = pgTable("activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripDayId: uuid("trip_day_id").references(() => tripDay.id).notNull(),
  discoveryContentId: uuid("discovery_content_id").references(() => discoveryContent.id),
  title: text("title").notNull(),
  description: text("description"),
  startTime: time("start_time"),
  endTime: time("end_time"),
  locationName: text("location_name"),
  coordinates: text("coordinates"),
  estimatedCost: numeric("estimated_cost"),
  orderIndex: integer("order_index").notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});