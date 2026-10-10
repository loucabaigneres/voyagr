import { View } from 'react-native';

import { colors } from '@/theme/tokens';
import { Em, Reveal, Spinner, Text } from '@/ui';
import { SparkleIcon } from '@/ui/icons';

/** Shown while the answers are saved and the deck is prepared. */
export function AnalyzingView() {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-6" aria-live="polite">
      <Reveal order={0}>
        <SparkleIcon size={28} color={colors.brand} weight="fill" />
      </Reveal>
      <Reveal order={1} className="items-center gap-2">
        <Text variant="title" className="text-center">
          On analyse tes <Em>envies</Em>…
        </Text>
        <Text tone="muted" className="text-center">
          On sélectionne les destinations et les lieux qui te ressemblent.
        </Text>
      </Reveal>
      <Spinner size="large" />
    </View>
  );
}
