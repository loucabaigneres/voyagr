import type { DiscoveryTags } from '@voyagr/database';
import { motion, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import type { RouterInputs, RouterOutputs } from '../lib/trpc';

export type DiscoveryCard = RouterOutputs['getDiscoveryCards'][number];

export type SwipeDirection = RouterInputs['swipeContent']['direction'];

interface SwipeCardProps {
  card: DiscoveryCard;
  onSwipe: (id: string, direction: SwipeDirection) => void;
  isFront: boolean; // Permet de savoir si c'est la carte du dessus (la seule qu'on peut glisser)
}

export function SwipeCard({ card, onSwipe, isFront }: SwipeCardProps) {
  // 1. Suivi de la position horizontale de la carte
  const x = useMotionValue(0);

  // 2. Transformation : Plus on glisse loin, plus la carte tourne (de -200px = -18deg à +200px = 18deg)
  const rotate = useTransform(x, [-200, 200], [-18, 18]);

  // 3. Transformation : Plus on glisse loin, plus le tag "LIKE" ou "NOPE" devient opaque
  const opacityLike = useTransform(x, [50, 150], [0, 1]);
  const opacityNope = useTransform(x, [-50, -150], [0, 1]);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const swipeThreshold = 100; // Distance minimum pour valider le swipe

    if (info.offset.x > swipeThreshold) {
      onSwipe(card.id, 'like');
    } else if (info.offset.x < -swipeThreshold) {
      onSwipe(card.id, 'dislike');
    }
  };

  const tags = card.tags as DiscoveryTags | null;

  return (
    <motion.div
      className="absolute w-full h-[70vh] max-h-150 max-w-sm rounded-3xl overflow-hidden shadow-xl bg-border origin-bottom"
      // Configuration de la physique
      style={{ x, rotate }}
      drag={isFront ? "x" : false} // On ne peut glisser que la première carte
      dragConstraints={{ left: 0, right: 0 }} // Force la carte à revenir au centre si on la lâche trop tôt
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
      // Petite animation d'entrée
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: isFront ? 1 : 0.95, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* L'image de fond */}
      <img
        src={card.mainMediaUrl}
        alt={card.locationName || 'Destination inconnue'}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />

      {/* Les indicateurs visuels (LIKE / NOPE) */}
      <motion.div style={{ opacity: opacityLike }} className="absolute top-8 left-8 rounded-lg border-4 border-primary px-4 py-1">
        <span className="-rotate-12 transform text-3xl font-bold tracking-wider text-primary drop-shadow">LIKE</span>
      </motion.div>
      <motion.div style={{ opacity: opacityNope }} className="absolute top-8 right-8 rounded-lg border-4 border-white px-4 py-1">
        <span className="rotate-12 transform text-3xl font-bold tracking-wider text-white drop-shadow">NOPE</span>
      </motion.div>

      {/* Le dégradé sombre en bas pour rendre le texte lisible */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/80 to-transparent pointer-events-none" />

      {/* Les informations de la destination */}
      <div className="absolute inset-x-0 bottom-0 p-6 text-white pointer-events-none">
        <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
          {card.locationName}
        </h2>
        
        <div className="flex flex-wrap gap-2 mb-3">
          {tags?.subcategory?.map((tag: string) => (
            <span key={tag} className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-medium">
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
