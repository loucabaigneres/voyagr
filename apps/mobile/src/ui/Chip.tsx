import { Pressable, type PressableProps } from 'react-native';

import { colors } from '@/theme/tokens';

import { cn } from './cn';
import { CheckIcon, type AppIcon } from './icons';
import { Text } from './Text';

export interface ChipProps extends Omit<PressableProps, 'children'> {
  label: string;
  selected?: boolean;
  icon?: AppIcon;
  className?: string;
}


export function Chip({ label, selected = false, icon, className, ...props }: ChipProps) {
  const Icon = icon ?? (selected ? CheckIcon : undefined);

  return (
    <Pressable
      role="checkbox"
      aria-checked={selected}
      className={cn(
        'min-h-11 flex-row items-center gap-2 rounded-full border px-4 active:opacity-80',
        selected ? 'border-brand bg-brand' : 'border-line-strong',
        className,
      )}
      {...props}
    >
      {Icon && (
        <Icon
          size={20}
          weight={selected ? 'fill' : 'regular'}
          color={selected ? colors.ink.inverse : colors.brand}
        />
      )}
      <Text
        className={cn(
          'font-sans-medium text-control',
          selected ? 'text-ink-inverse' : 'text-brand',
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}
