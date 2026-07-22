import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { type DiscoveryCard, SwipeCard } from '../components/SwipeCard';
import { useGuestId } from '../hooks/useGuestId';
import { authClient } from '../lib/auth-client';
import { trpc } from '../lib/trpc';

export const Route = createFileRoute('/')({
  component: function Home() {
    const navigate = useNavigate();
    const guestId = useGuestId();
    const { data: session } = authClient.useSession();

    const [localCards , setLocalCards] = useState<DiscoveryCard[]>([]);

    const { data: dbCards, isLoading, refetch } = useQuery({
      ...trpc.getDiscoveryCards.queryOptions({ guestId, limit: 5 }),
      enabled: !!guestId, // Only fetch if guestId is available
    });

    const swipeMutation = useMutation(
      trpc.swipeContent.mutationOptions()
    );

    useEffect(() => {
      if (dbCards) {
        setLocalCards(dbCards);
      }
    }, [dbCards]);

    const handleSwipe = (id: string, direction: 'like' | 'dislike') => {
      setLocalCards((prev) => prev.filter((card) => card.id !== id));
      swipeMutation.mutate({
        guestId,
        contentId: id,
        direction,
      });
    };

    const handleSignOut = async () => {
      await authClient.signOut();
      navigate({ to: '/login' });
    };

    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink md:bg-surface">
        {/* Branded backdrop behind the frame (tablet + desktop) */}
        <div
          className="pointer-events-none absolute inset-0 hidden md:block"
          style={{
            background:
              'radial-gradient(90% 60% at 50% 0%, rgba(255,123,40,0.10) 0%, rgba(255,78,74,0.06) 40%, transparent 70%)',
          }}
        />

        {/* Phone-like frame: full screen on mobile, centered on tablet/desktop */}
        <div className="relative flex h-screen w-full flex-col overflow-hidden bg-ink md:h-[min(92vh,820px)] md:w-[420px] md:rounded-[2.25rem] md:shadow-2xl md:ring-1 md:ring-black/5">
          {/* Top bar */}
          <div className="absolute inset-x-0 top-0 z-50 flex items-center justify-between px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-3">
            <div className="flex items-center gap-2 text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-base">✈️</span>
              <span className="text-base font-extrabold tracking-tight">Voyagr</span>
            </div>
            {session ? (
              <button
                onClick={handleSignOut}
                className="min-h-9 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-primary shadow-lg shadow-black/20 transition hover:bg-surface active:scale-95"
              >
                Déconnexion
              </button>
            ) : (
              <button
                onClick={() => navigate({ to: '/login' })}
                className="min-h-9 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-primary shadow-lg shadow-black/20 transition hover:bg-surface active:scale-95"
              >
                Se connecter
              </button>
            )}
          </div>

          {/* Card stack */}
          <div className="relative flex flex-1 items-center justify-center px-4">
            <div className="relative flex h-[70vh] max-h-[600px] w-full max-w-sm items-center justify-center">
              {isLoading ? (
                <div className="animate-pulse text-white/80">Recherche d'inspirations…</div>
              ) : localCards.length === 0 ? (
                <div className="px-6 text-center text-white">
                  <h3 className="mb-2 text-2xl font-bold">Plus d'inspirations !</h3>
                  <p className="mb-6 text-white/60">Vous avez tout vu.</p>
                  <button
                    onClick={() => refetch()}
                    className="min-h-11 rounded-full bg-primary px-6 py-2.5 font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-dark active:scale-95"
                  >
                    Recharger
                  </button>
                </div>
              ) : (
                localCards.map((card, index) => (
                  <SwipeCard
                    key={card.id}
                    card={card}
                    isFront={index === 0}
                    onSwipe={handleSwipe}
                  />
                )).reverse()
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
});
