import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Text } from '@/ui';

import { PROFILE_COPY } from '../constants';

export function GuestInvite() {
  const copy = PROFILE_COPY.guest;

  return (
    <View className="flex-1 justify-center gap-8">
      <View className="gap-3">
        <Text variant="overline">{copy.overline}</Text>
        <Text variant="title" role="heading">
          {copy.title}
        </Text>
        <Text tone="muted">{copy.description}</Text>
      </View>

      <View className="gap-3">
        <Button label={copy.signIn} onPress={() => router.push('/auth/sign-in')} />
        <Button
          label={copy.signUp}
          variant="outline"
          onPress={() => router.push('/auth/sign-up')}
        />
      </View>
    </View>
  );
}
