import { createAuthClient } from 'better-auth/react';
import { env } from '../env';

export const authClient = createAuthClient({
  // L'URL racine de ton API Fastify où est branché le handler Better Auth
  baseURL: env.VITE_API_URL,
});

// On exporte les méthodes et hooks utiles directement pour simplifier les imports plus tard
export const { signIn, signUp, signOut, useSession } = authClient;
