import { Pressable, View } from 'react-native';

import type { RouterOutputs } from '@/lib/trpc';
import { Card, Text } from '@/ui';

type Stats = RouterOutputs['user']['getProfile']['stats'];

interface StatProps {
  value: number;
  label: { singular: string; plural: string };
  onPress?: () => void;
}

function Stat({ value, label, onPress }: StatProps) {
  const text = value > 1 ? label.plural : label.singular;
  const content = (
    <>
      <Text variant="title">{value}</Text>
      <Text variant="caption">{text}</Text>
    </>
  );

  if (!onPress) return <Card className="flex-1 gap-1">{content}</Card>;

  return (
    <Pressable
      role="button"
      aria-label={`${value} ${text}`}
      onPress={onPress}
      className="flex-1 gap-1 rounded-card bg-surface p-5 active:opacity-80"
    >
      {content}
    </Pressable>
  );
}

export function ProfileStats({ stats, onPressTrips }: { stats: Stats; onPressTrips?: () => void }) {
  return (
    <View className="flex-row gap-3">
      <Stat
        value={stats.tripsCount}
        label={{ singular: 'Voyage créé', plural: 'Voyages créés' }}
        onPress={onPressTrips}
      />
      <Stat
        value={stats.likedPlacesCount}
        label={{ singular: 'Lieu liké', plural: 'Lieux likés' }}
      />
    </View>
  );
}
