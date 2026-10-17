import { useQuery } from '@tanstack/react-query';

import { useAuthSession } from '@/features/auth/hooks/useAuthSession';
import { trpc } from '@/lib/trpc';

export function useProfile() {
  const session = useAuthSession();
  const query = useQuery({
    ...trpc.user.getProfile.queryOptions(),
    enabled: session.isSignedIn,
  });

  return {
    isSessionPending: session.isPending,
    isSignedIn: session.isSignedIn,
    profile: query.data,
    isLoading: session.isSignedIn && query.isPending,
    hasFailed: query.isError,
    retry: () => query.refetch(),
  };
}
