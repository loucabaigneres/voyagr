import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useAuthSession } from '@/features/auth/hooks/useAuthSession';
import { trpc } from '@/lib/trpc';

import { PROFILE_COPY } from '../constants';
import { nameChange } from '../lib/profile';

/** Draft + save for the display name. The draft follows the server value until edited. */
export function useEditName(currentName: string | undefined) {
  const queryClient = useQueryClient();
  const session = useAuthSession();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const mutation = useMutation(
    trpc.user.updateProfile.mutationOptions({
      onSuccess: async () => {
        setSaved(true);
        await queryClient.invalidateQueries(trpc.user.getProfile.queryFilter());
        // Only now, or the field would flash the old name until the refetch lands.
        setDraft(null);
        // The cached session carries the name too.
        await session.refetch();
      },
      onError: () => setError(PROFILE_COPY.editName.error),
    }),
  );

  const value = draft ?? currentName ?? '';

  return {
    value,
    setValue: (next: string) => {
      setDraft(next);
      setError(null);
      setSaved(false);
    },
    error,
    saved,
    isSaving: mutation.isPending,
    canSave: nameChange(value, currentName).status !== 'unchanged',
    save: () => {
      const change = nameChange(value, currentName);
      if (change.status === 'invalid') return setError(change.error);
      if (change.status === 'ready') mutation.mutate({ name: change.name });
    },
  };
}
