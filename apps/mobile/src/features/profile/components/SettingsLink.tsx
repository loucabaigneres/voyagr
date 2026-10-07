import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { colors } from '@/theme/tokens';
import { Text } from '@/ui';
import { CaretRightIcon, GearSixIcon } from '@/ui/icons';

import { PROFILE_COPY } from '../constants';

export function SettingsLink() {
  return (
    <Pressable
      role="link"
      onPress={() => router.push('/settings')}
      className="min-h-14 flex-row items-center gap-3 rounded-field bg-surface-raised px-4 active:opacity-80"
    >
      <GearSixIcon size={24} color={colors.brand} />
      <Text variant="label" className="flex-1">
        {PROFILE_COPY.settings.title}
      </Text>
      <CaretRightIcon size={20} color={colors.ink.muted} />
    </Pressable>
  );
}
