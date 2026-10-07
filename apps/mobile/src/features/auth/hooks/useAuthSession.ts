import { authClient } from '@/lib/auth-client';

export function useAuthSession() {
  const { data, isPending, refetch } = authClient.useSession();

  return {
    user: data?.user ?? null,
    isSignedIn: !!data?.user,
    isPending,
    refetch,
  };
}
