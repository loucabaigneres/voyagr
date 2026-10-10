import { View } from 'react-native';

import { Em, Text } from '@/ui';

export function HomeHero() {
  return (
    <View className="gap-3">
      <Text variant="overline">Ton voyage commence ici</Text>
      <Text variant="title" role="heading">
        Comment veux-tu trouver ta prochaine <Em>escapade</Em> ?
      </Text>
      <Text tone="muted">
        {"Trouve ton séjour sur mesure en quelques swipes, ou laisse l'inspiration faire le reste."}
      </Text>
    </View>
  );
}
