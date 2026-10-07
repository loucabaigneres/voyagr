import { useState } from 'react';
import { RefreshControl } from 'react-native';

import { GuestInvite } from '@/features/profile/components/GuestInvite';
import { ProfileContent } from '@/features/profile/components/ProfileContent';
import { ProfileHeader } from '@/features/profile/components/ProfileHeader';
import { ProfileSkeleton } from '@/features/profile/components/ProfileSkeleton';
import { ProfileStats } from '@/features/profile/components/ProfileStats';
import { SettingsLink } from '@/features/profile/components/SettingsLink';
import { PROFILE_COPY, type ProfileSegment } from '@/features/profile/constants';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { useProfileRefresh } from '@/features/profile/hooks/useProfileRefresh';
import { colors } from '@/theme/tokens';
import { ErrorState, Screen } from '@/ui';

export default function ProfileScreen() {
  const { isSessionPending, isSignedIn, profile, isLoading, hasFailed, retry } = useProfile();
  const { isRefreshing, refresh } = useProfileRefresh();
  const [segment, setSegment] = useState<ProfileSegment>('trips');

  if (isSessionPending || isLoading) {
    return (
      <Screen edges={['top']}>
        <ProfileSkeleton />
      </Screen>
    );
  }

  if (!isSignedIn) {
    return (
      <Screen edges={['top']}>
        <GuestInvite />
      </Screen>
    );
  }

  if (hasFailed || !profile?.user) {
    return (
      <Screen edges={['top']}>
        <ErrorState
          title={PROFILE_COPY.loadError.title}
          message={PROFILE_COPY.loadError.message}
          onRetry={retry}
        />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      edges={['top']}
      contentClassName="gap-8"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={refresh}
          tintColor={colors.brand}
          colors={[colors.brand]}
        />
      }
    >
      <ProfileHeader user={profile.user} />
      <ProfileStats stats={profile.stats} onPressTrips={() => setSegment('trips')} />
      <ProfileContent segment={segment} onSegmentChange={setSegment} />
      <SettingsLink />
    </Screen>
  );
}
