import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { formatDate } from '@/domain/date';
import type { RouterOutputs } from '@/lib/trpc';
import { colors } from '@/theme/tokens';
import { Badge, Text } from '@/ui';
import { CaretRightIcon } from '@/ui/icons';

import { tripDisplayTitle, tripStatusMeta } from '../lib/trip-summary';

export type TripListItem = RouterOutputs['user']['getTrips'][number];

export function TripCard({ trip }: { trip: TripListItem }) {
  const status = tripStatusMeta(trip.status);
  const title = tripDisplayTitle(trip);
  const createdAt = formatDate(trip.createdAt);

  return (
    <Pressable
      role="link"
      aria-label={`${title}, ${status.label}`}
      onPress={() => router.push({ pathname: '/trip/[tripId]', params: { tripId: trip.id } })}
      className="flex-row items-center gap-3 rounded-card bg-surface p-5 active:opacity-80"
    >
      <View className="flex-1 gap-2">
        <Text variant="label" numberOfLines={2}>
          {title}
        </Text>
        <View className="flex-row flex-wrap items-center gap-2">
          <Badge label={status.label} tone={status.tone} />
          {createdAt && <Text variant="caption">{createdAt}</Text>}
        </View>
      </View>
      <CaretRightIcon size={20} color={colors.ink.muted} />
    </Pressable>
  );
}
