import { View } from 'react-native';

import { colors } from '@/theme/tokens';

import { cn } from './cn';
import { WarningCircleIcon } from './icons';
import { Text } from './Text';

export function Notice({ message, className }: { message: string; className?: string }) {
  return (
    <View
      role="alert"
      className={cn('flex-row items-center gap-3 rounded-field bg-surface p-4', className)}
    >
      <WarningCircleIcon size={20} color={colors.brand} />
      <Text variant="caption" tone="brand" className="flex-1">
        {message}
      </Text>
    </View>
  );
}
