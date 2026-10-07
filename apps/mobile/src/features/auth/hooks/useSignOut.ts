import { useMutation } from '@tanstack/react-query';

import { authClient } from '@/lib/auth-client';

import { syncQueriesWithSession } from '../query-cache';

export function useSignOut({ onSignedOut }: { onSignedOut?: () => void } = {}) {
  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.signOut();
      if (error) throw error;
    },
    // Even if the server call fails, the local session is gone: drop account data anyway.
    onSettled: () => {
      syncQueriesWithSession('signed-out');
      onSignedOut?.();
    },
  });

  return {
    signOut: () => mutation.mutate(),
    isSigningOut: mutation.isPending,
  };
}
