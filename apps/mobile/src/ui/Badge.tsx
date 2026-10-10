import { View } from 'react-native';

import { cn } from './cn';
import { Text } from './Text';

const TONES = {
  /** On light backgrounds. */
  brand: { container: 'bg-brand', text: 'text-ink-inverse' },
  /** On vino or photos. */
  accent: { container: 'bg-accent', text: 'text-brand' },
  success: { container: 'bg-success', text: 'text-ink-inverse' },
  neutral: { container: 'bg-surface', text: 'text-ink' },
  /** Premium. */
  night: { container: 'bg-ink', text: 'text-accent' },
} as const;

export interface BadgeProps {
  label: string;
  tone?: keyof typeof TONES;
  className?: string;
}

export function Badge({ label, tone = 'brand', className }: BadgeProps) {
  return (
    <View className={cn('self-start rounded-full px-3 py-1', TONES[tone].container, className)}>
      <Text variant="overline" className={TONES[tone].text}>
        {label}
      </Text>
    </View>
  );
}
