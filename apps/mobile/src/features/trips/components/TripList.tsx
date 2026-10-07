import { router } from 'expo-router';
import { View } from 'react-native';

import { EmptyState, ErrorState, Skeleton } from '@/ui';
import { MapTrifoldIcon } from '@/ui/icons';

import { TRIPS_COPY } from '../constants';
import { useMyTrips } from '../hooks/useMyTrips';
import { TripCard } from './TripCard';

export function TripList() {
  const { trips, isLoading, hasFailed, retry } = useMyTrips();

  if (isLoading) {
    return (
      <View className="gap-3" aria-busy>
        <Skeleton className="h-24 rounded-card" />
        <Skeleton className="h-24 rounded-card" />
      </View>
    );
  }

  if (hasFailed) {
    return (
      <ErrorState
        className="flex-none"
        title={TRIPS_COPY.error.title}
        message={TRIPS_COPY.error.message}
        onRetry={retry}
      />
    );
  }

  if (trips.length === 0) {
    return (
      <EmptyState
        className="flex-none rounded-card bg-surface py-10"
        icon={MapTrifoldIcon}
        title={TRIPS_COPY.empty.title}
        description={TRIPS_COPY.empty.description}
        action={{ label: TRIPS_COPY.empty.cta, onPress: () => router.navigate('/') }}
      />
    );
  }

  return (
    <View className="gap-3">
      {trips.map((trip) => (
        <TripCard key={trip.id} trip={trip} />
      ))}
    </View>
  );
}
