import { useCallback, useState } from 'react';

const STORAGE_KEY = 'seego_waitlist_email';

/** Pragmatic email check — good enough to catch typos without rejecting valid addresses. */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function readStoredEmail(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeEmail(email: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, email);
  } catch {
    // Private mode / storage disabled — non blocking.
  }
}

/**
 * Submits a waitlist sign-up.
 *
 * When `VITE_WAITLIST_ENDPOINT` is configured the email is POSTed there.
 * Otherwise it is only persisted locally, so the page stays fully functional
 * during local dev / preview without any backend.
 */
export async function submitWaitlist(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const endpoint = import.meta.env.VITE_WAITLIST_ENDPOINT;

  if (endpoint) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalized, source: 'landing-page' }),
    });
    if (!res.ok) {
      throw new Error(`Waitlist request failed with status ${res.status}`);
    }
  } else {
    // Simulate a short round-trip so the UI feedback feels real.
    await new Promise((resolve) => setTimeout(resolve, 650));
  }

  storeEmail(normalized);
}

/** Tracks whether this visitor has already joined the waitlist (persisted locally). */
export function useWaitlistStatus() {
  // Client-only SPA: reading localStorage lazily at init is safe (no SSR hydration).
  const [joinedEmail, setJoinedEmail] = useState<string | null>(() => readStoredEmail());

  const markJoined = useCallback((email: string) => {
    setJoinedEmail(email.trim().toLowerCase());
  }, []);

  return { joinedEmail, markJoined };
}
