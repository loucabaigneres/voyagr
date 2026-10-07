import { useState } from 'react';
import { Platform } from 'react-native';

import { authClient } from '@/lib/auth-client';

import { authCallbackURL } from '../lib/callback-url';
import { authErrorMessage } from '../lib/errors';
import { closeAuth } from '../navigation';
import { syncQueriesWithSession } from '../query-cache';

const CALLBACK_PATH = '/profile';

/**
 * Google through the browser (redirect flow): works in Expo Go, no native SDK.
 * Native opens an auth session and resolves once it closes; web leaves the page for Google.
 */
export function useGoogleSignIn() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    if (isPending) return;
    setIsPending(true);
    setError(null);

    const isWeb = Platform.OS === 'web';
    try {
      const callbackURL = authCallbackURL(
        CALLBACK_PATH,
        Platform.OS,
        isWeb ? window.location.origin : undefined,
      );
      const result = await authClient.signIn.social({ provider: 'google', callbackURL });
      if (result.error) {
        setError(authErrorMessage(result.error));
        setIsPending(false);
        return;
      }
      // The browser is on its way to Google: stay in the loading state until the page unloads.
      if (isWeb) return;

      // The plugin does not report a cancelled session: the stored session tells.
      const { data: session } = await authClient.getSession();
      setIsPending(false);
      if (!session?.user) return;
      await syncQueriesWithSession('signed-in');
      closeAuth();
    } catch {
      setError(authErrorMessage(null));
      setIsPending(false);
    }
  };

  return { signIn, isPending, error };
}
