import { useQuery } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';

import { STORAGE_KEYS, storage } from './storage';

/** Anonymous identity used by the API until the user signs in. */
export async function getOrCreateGuestId(): Promise<string> {
  const stored = await storage.get(STORAGE_KEYS.guestId);
  if (stored) return stored;

  const created = `guest_${randomUUID()}`;
  await storage.set(STORAGE_KEYS.guestId, created);
  return created;
}

/** `guestId` is `undefined` until it has been read from storage. */
export function useGuestId() {
  const { data } = useQuery({
    queryKey: ['guestId'],
    queryFn: getOrCreateGuestId,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return data;
}
