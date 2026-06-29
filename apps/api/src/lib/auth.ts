import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { db } from './db.js';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
  },
  // TODO: Add OAuth providers (Google, Apple, etc.)
  trustedOrigins: ['http://localhost:5173', 'http://localhost:3000'], // TODO: Update with correct frontend URL
});
