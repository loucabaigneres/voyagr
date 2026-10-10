import { router } from 'expo-router';

import { ChoiceCard } from '@/features/home/components/ChoiceCard';
import { HomeHero } from '@/features/home/components/HomeHero';
import { useStartDirectTrip } from '@/features/home/hooks/useStartDirectTrip';
import { Notice, Reveal, Screen, Wordmark } from '@/ui';
import { CompassIcon, ShuffleIcon } from '@/ui/icons';

export default function HomeScreen() {
  const directTrip = useStartDirectTrip();

  return (
    <Screen scroll edges={['top']} contentClassName="gap-8">
      <Reveal order={0}>
        <Wordmark />
      </Reveal>
      <Reveal order={1}>
        <HomeHero />
      </Reveal>

      <Reveal order={2}>
        <ChoiceCard
          featured
          icon={CompassIcon}
          badge="Recommandé"
          title="Guide-moi"
          description="Quatre questions express — ambiance, météo, compagnie — pour viser juste du premier coup."
          cta="Lancer le quiz"
          onPress={() => router.push('/onboarding')}
        />
      </Reveal>
      <Reveal order={3} className="-mt-4">
        <ChoiceCard
          icon={ShuffleIcon}
          title="Surprends-moi"
          description="Envie d’explorer sans filtre ? Swipe directement sur nos destinations phares."
          cta="Swiper directement"
          loadingLabel="On prépare ton deck…"
          loading={directTrip.isStarting}
          disabled={!directTrip.isReady}
          onPress={directTrip.start}
        />
      </Reveal>

      {directTrip.hasFailed && (
        <Notice message="Impossible de préparer ton deck pour le moment. Vérifie ta connexion et réessaie." />
      )}
    </Screen>
  );
}
