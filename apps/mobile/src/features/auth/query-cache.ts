import { queryClient, trpc } from '@/lib/trpc';

/**
 * Keeps React Query in step with the session: every query may answer differently
 * once signed in, and account data must not survive a sign-out.
 */
export function syncQueriesWithSession(event: 'signed-in' | 'signed-out') {
  if (event === 'signed-in') {
    return queryClient.invalidateQueries();
  }
  queryClient.removeQueries({ queryKey: trpc.user.pathKey() });
}
