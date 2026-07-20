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
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute top-0 w-full p-4 flex justify-between items-center z-50">
          <div className="text-white font-bold">Voyagr</div>
          <div className="flex items-center gap-2">
            {session ? (
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-600 text-white font-semibold rounded-xl transition"
              >
                Déconnexion
              </button>
            ) : (
              <button
                onClick={() => navigate({ to: '/login' })}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-600 text-white font-semibold rounded-xl transition"
              >
                Se connecter
              </button>
            )}
          </div>
        </div>
        {/* Container de la pile de cartes */}
        <div className="relative w-full max-w-sm h-[70vh] flex items-center justify-center">
          {isLoading ? (
            <div className="text-white animate-pulse">Recherche d'inspirations...</div>
          ) : localCards.length === 0 ? (
            <div className="text-white text-center">
              <h3 className="text-2xl font-bold mb-2">Plus d'inspirations !</h3>
              <p className="text-gray-400 mb-6">Vous avez tout vu.</p>
              <button 
                onClick={() => refetch()} 
                className="px-6 py-2 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition"
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
    );
  }
});
