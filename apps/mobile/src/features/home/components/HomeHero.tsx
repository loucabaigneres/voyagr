import { View } from 'react-native';

import { Text } from '@/ui';

import { HOME_COPY } from '../constants';

export function HomeHero() {
  return (
    <View className="gap-3">
      <Text variant="overline">{HOME_COPY.overline}</Text>
      <Text variant="title" role="heading">
        {HOME_COPY.title}
      </Text>
      <Text tone="muted">{HOME_COPY.subtitle}</Text>
    </View>
  );
}
