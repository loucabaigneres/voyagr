import { boolean, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').notNull(),
  image: text('image'),
  createdAt: timestamp('created_at', { precision: 6, withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { precision: 6, withTimezone: true }).notNull(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { precision: 6, withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { precision: 6, withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { precision: 6, withTimezone: true }).notNull(),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt', { precision: 6, withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', { precision: 6, withTimezone: true }),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: timestamp('created_at', { precision: 6, withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { precision: 6, withTimezone: true }).notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { precision: 6, withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { precision: 6, withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { precision: 6, withTimezone: true }).notNull(),
});
