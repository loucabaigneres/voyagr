import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { trpc } from '@/lib/trpc';

/** Pull-to-refresh: refetches what the profile shows (account, trips, inspirations). */
export function useProfileRefresh() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: trpc.user.pathKey(), type: 'active' }),
        queryClient.refetchQueries({ queryKey: trpc.inspiration.pathKey(), type: 'active' }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  return { isRefreshing, refresh };
}
