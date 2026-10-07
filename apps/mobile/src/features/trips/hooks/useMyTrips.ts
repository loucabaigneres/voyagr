import { useQuery } from '@tanstack/react-query';

import { trpc } from '@/lib/trpc';

export function useMyTrips({ enabled = true }: { enabled?: boolean } = {}) {
  const query = useQuery({ ...trpc.user.getTrips.queryOptions(), enabled });

  return {
    trips: query.data ?? [],
    isLoading: enabled && query.isPending,
    hasFailed: query.isError,
    retry: () => query.refetch(),
  };
}
