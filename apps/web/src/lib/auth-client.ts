import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  // L'URL racine de ton API Fastify où est branché le handler Better Auth
  baseURL: 'http://localhost:3000',
});

// On exporte les méthodes et hooks utiles directement pour simplifier les imports plus tard
export const { signIn, signUp, signOut, useSession } = authClient;
