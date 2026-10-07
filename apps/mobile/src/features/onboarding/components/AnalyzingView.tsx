import { View } from 'react-native';

import { colors } from '@/theme/tokens';
import { Em, Reveal, Spinner, Text } from '@/ui';
import { SparkleIcon } from '@/ui/icons';

import { ONBOARDING_COPY } from '../constants';

/** Shown while the answers are saved and the deck is prepared. */
export function AnalyzingView() {
  const [before, emphasis, after] = ONBOARDING_COPY.analyzing.title;

  return (
    <View className="flex-1 items-center justify-center gap-4 px-6" aria-live="polite">
      <Reveal order={0}>
        <SparkleIcon size={28} color={colors.brand} weight="fill" />
      </Reveal>
      <Reveal order={1} className="items-center gap-2">
        <Text variant="title" className="text-center">
          {before}
          <Em>{emphasis}</Em>
          {after}
        </Text>
        <Text tone="muted" className="text-center">
          {ONBOARDING_COPY.analyzing.subtitle}
        </Text>
      </Reveal>
      <Spinner size="large" />
    </View>
  );
}
