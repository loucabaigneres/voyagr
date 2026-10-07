import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { colors } from '@/theme/tokens';
import { Text } from '@/ui';
import { ArrowLeftIcon } from '@/ui/icons';

import { PROFILE_COPY } from '../constants';

export function SettingsHeader() {
  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        role="button"
        aria-label={PROFILE_COPY.settings.back}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
        hitSlop={8}
        className="-ml-2 size-11 items-center justify-center rounded-full active:bg-surface"
      >
        <ArrowLeftIcon size={24} color={colors.ink.DEFAULT} />
      </Pressable>
      <Text variant="section" role="heading">
        {PROFILE_COPY.settings.title}
      </Text>
    </View>
  );
}
