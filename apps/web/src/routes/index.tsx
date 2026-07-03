import { createFileRoute, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import { type InspirationCard, SwipeCard } from '../components/SwipeCard';
import { authClient } from '../lib/auth-client';

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (!session) {
      throw redirect({ to: '/login' });
    }
  },
  component: function Home() {
    // Fausses données pour le design (à remplacer par tRPC plus tard)
    const [cards, setCards] = useState<InspirationCard[]>([
      {
        id: '1',
        mediaUrl: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=1000&auto=format&fit=crop',
        locationName: 'Tour Eiffel, Paris',
        tags: ['Must-see', 'Romantique'],
      },
      {
        id: '2',
        mediaUrl: 'https://images.unsplash.com/photo-1522083111828-971c0800b65f?q=80&w=1000&auto=format&fit=crop',
        locationName: 'Kyoto, Japon',
        tags: ['Culture', 'Nature', 'Temple'],
      },
      {
        id: '3',
        mediaUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1000&auto=format&fit=crop',
        locationName: 'Dubaï, EAU',
        tags: ['Luxe', 'Désert'],
      }
    ]);

    const handleSwipe = (id: string, direction: 'like' | 'dislike') => {
      // TODO: Remove the console.log in production and replace it with an API call to record the swipe action
      // eslint-disable-next-line no-console
      console.log(`Swiped ${direction} on card ${id}`);
      // On retire la carte du dessus pour révéler la suivante
      setCards((prev) => prev.filter((card) => card.id !== id));
    };

    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center overflow-hidden">
        {/* Container de la pile de cartes */}
        <div className="relative w-full max-w-sm h-[70vh] flex items-center justify-center">
          {cards.length === 0 ? (
            <div className="text-white text-center">
              <h3 className="text-2xl font-bold mb-2">Plus d'inspirations !</h3>
              <p className="text-gray-400">Revenez plus tard pour de nouveaux lieux.</p>
            </div>
          ) : (
            // On map à l'envers pour que le premier élément du tableau soit affiché par-dessus (z-index)
            cards.map((card, index) => (
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
