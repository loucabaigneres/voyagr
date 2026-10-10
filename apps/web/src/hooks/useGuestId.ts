import { useState } from 'react';

const GUEST_ID_KEY = 'voyagr_guest_id';

export function useGuestId() {
  // Pass function to useState to avoid generating a new UUID on every render
  const [guestId] = useState<string>(() => {
    // Check if we're running in a browser environment
    if (typeof window === 'undefined') return '';

    let storedId = localStorage.getItem(GUEST_ID_KEY);

    if (!storedId) {
      storedId = `guest_${crypto.randomUUID()}`;
      localStorage.setItem(GUEST_ID_KEY, storedId);
    }

    return storedId;
  });

  return guestId;
}
