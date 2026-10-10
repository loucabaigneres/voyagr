import * as z from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.url(),
});

// Expo only inlines EXPO_PUBLIC_* variables that are referenced literally,
// so each one must be listed here rather than passing `process.env` as a whole.
const parsedEnv = envSchema.safeParse({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
});

if (!parsedEnv.success) {
  throw new Error(
    `Variables d'environnement invalides (voir apps/mobile/.env.example) :\n${z.prettifyError(parsedEnv.error)}`,
  );
}

export const env = parsedEnv.data;
