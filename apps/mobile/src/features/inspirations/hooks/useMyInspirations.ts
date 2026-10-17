import { useQuery } from '@tanstack/react-query';

import { trpc } from '@/lib/trpc';

/** The signed-in user's imported inspirations (20 most recent, as the API returns them). */
export function useMyInspirations({ enabled = true }: { enabled?: boolean } = {}) {
  const query = useQuery({ ...trpc.inspiration.listMine.queryOptions(), enabled });

  return {
    inspirations: query.data ?? [],
    isLoading: enabled && query.isPending,
    hasFailed: query.isError,
    retry: () => query.refetch(),
  };
}
