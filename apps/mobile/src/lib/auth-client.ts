import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { env } from '@/env';

/**
 * Better Auth client. On native, the session cookie lives in SecureStore
 * (Keychain / Keystore) and the plugin replays it on every auth request;
 * on web, the browser handles cookies as usual.
 */
export const authClient = createAuthClient({
  baseURL: env.EXPO_PUBLIC_API_URL,
  plugins: [
    expoClient({
      // Must match `scheme` in app.json and `trustedOrigins` in the API.
      scheme: 'voyagr',
      storagePrefix: 'seego',
      storage: SecureStore,
    }),
  ],
});

/**
 * Headers that authenticate a non-auth request (tRPC) with the stored session.
 * Empty on web, where the browser sends the cookie itself.
 */
export function getAuthHeaders(): Record<string, string> {
  if (Platform.OS === 'web') return {};
  const cookie = authClient.getCookie();
  return cookie ? { Cookie: cookie } : {};
}
