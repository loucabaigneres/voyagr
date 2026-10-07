import { Image } from 'expo-image';
import { View } from 'react-native';

import { formatDate } from '@/domain/date';
import type { RouterOutputs } from '@/lib/trpc';
import { Text } from '@/ui';

import { PROFILE_COPY } from '../constants';
import { avatarInitial } from '../lib/profile';

type ProfileUser = NonNullable<RouterOutputs['user']['getProfile']['user']>;

const AVATAR_SIZE = 72;

export function ProfileHeader({ user }: { user: ProfileUser }) {
  const since = formatDate(user.createdAt, 'long');

  return (
    <View className="flex-row items-center gap-4">
      {user.image ? (
        <Image
          source={user.image}
          accessibilityIgnoresInvertColors
          style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View
          aria-hidden
          className="items-center justify-center rounded-full bg-brand"
          style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
        >
          <Text variant="section" tone="inverse">
            {avatarInitial(user.name, user.email)}
          </Text>
        </View>
      )}

      <View className="flex-1 gap-1">
        <Text variant="section" role="heading" numberOfLines={1}>
          {user.name || PROFILE_COPY.fallbackName}
        </Text>
        <Text tone="muted" numberOfLines={1}>
          {user.email}
        </Text>
        {since && (
          <Text variant="caption">
            {PROFILE_COPY.memberSince} {since}
          </Text>
        )}
      </View>
    </View>
  );
}
