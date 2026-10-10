import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { env } from '../env.js';
import { db } from './db.js';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
    // ...(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
    //   ? {
    //       apple: {
    //         clientId: process.env.APPLE_CLIENT_ID,
    //         clientSecret: process.env.APPLE_CLIENT_SECRET,
    //       },
    //     }
    //   : {}),
  },
  trustedOrigins: [
    'https://voyagr-web-mu.vercel.app',
    'https://voyagr-web-*.vercel.app',
    'voyagr-*-arthurgramonts-projects.vercel.app',
    env.FRONTEND_URL,
  ],
});
