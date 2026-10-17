import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { colors } from '@/theme/tokens';
import { Text } from '@/ui';
import { ArrowLeftIcon } from '@/ui/icons';

export function SettingsHeader() {
  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        role="button"
        aria-label="Retour"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
        hitSlop={8}
        className="-ml-2 size-11 items-center justify-center rounded-full active:bg-surface"
      >
        <ArrowLeftIcon size={24} color={colors.ink.DEFAULT} />
      </Pressable>
      <Text variant="section" role="heading">
        Paramètres
      </Text>
    </View>
  );
}
