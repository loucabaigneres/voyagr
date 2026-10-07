import { View } from 'react-native';

import { colors } from '@/theme/tokens';

import { cn } from './cn';
import { CheckCircleIcon, WarningCircleIcon } from './icons';
import { Text } from './Text';

const TONES = {
  warning: { icon: WarningCircleIcon, color: colors.brand, text: 'brand', role: 'alert' },
  success: { icon: CheckCircleIcon, color: colors.success, text: 'success', role: 'status' },
} as const;

export interface NoticeProps {
  message: string;
  tone?: keyof typeof TONES;
  className?: string;
}

export function Notice({ message, tone = 'warning', className }: NoticeProps) {
  const { icon: Icon, color, text, role } = TONES[tone];

  return (
    <View
      role={role}
      className={cn('flex-row items-center gap-3 rounded-field bg-surface p-4', className)}
    >
      <Icon size={20} color={color} />
      <Text variant="caption" tone={text} className="flex-1">
        {message}
      </Text>
    </View>
  );
}
