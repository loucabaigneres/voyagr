import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { env } from '../env.js';
import { db } from './db.js';

// Origins only reachable while developing the mobile app.
const mobileDevOrigins = [
  // Expo Go
  'exp://',
  'exp://**',
  'exp://192.168.*.*:*/**',
  // Expo web preview.
  'http://localhost:8081',
];

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  // Lets the mobile app send its session cookie and receive OAuth redirects on its deep link.
  plugins: [expo()],
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
    // Mobile app scheme (`scheme` in apps/mobile/app.json).
    'voyagr://',
    ...(env.NODE_ENV === 'development' ? mobileDevOrigins : []),
  ],
});
