import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';

import { useGuestId } from '@/lib/guest-id';
import { trpc } from '@/lib/trpc';

/** "Surprends-moi": creates an empty trip for the guest, then opens the swipe deck. */
export function useStartDirectTrip() {
  const guestId = useGuestId();

  const mutation = useMutation(
    trpc.onboarding.startDirectTrip.mutationOptions({
      onSuccess: ({ tripId }) => {
        router.push({ pathname: '/discovery', params: { tripId } });
      },
    }),
  );

  return {
    start: () => {
      if (guestId) mutation.mutate({ guestId });
    },
    isReady: !!guestId,
    isStarting: mutation.isPending,
    hasFailed: mutation.isError,
  };
}
