import { router } from 'expo-router';

import { ChoiceCard } from '@/features/home/components/ChoiceCard';
import { HomeHero } from '@/features/home/components/HomeHero';
import { HOME_COPY } from '@/features/home/constants';
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
          badge={HOME_COPY.guided.badge}
          title={HOME_COPY.guided.title}
          description={HOME_COPY.guided.description}
          cta={HOME_COPY.guided.cta}
          onPress={() => router.push('/onboarding')}
        />
      </Reveal>
      <Reveal order={3} className="-mt-4">
        <ChoiceCard
          icon={ShuffleIcon}
          title={HOME_COPY.surprise.title}
          description={HOME_COPY.surprise.description}
          cta={HOME_COPY.surprise.cta}
          loadingLabel={HOME_COPY.surprise.loading}
          loading={directTrip.isStarting}
          disabled={!directTrip.isReady}
          onPress={directTrip.start}
        />
      </Reveal>

      {directTrip.hasFailed && <Notice message={HOME_COPY.error} />}
    </Screen>
  );
}
