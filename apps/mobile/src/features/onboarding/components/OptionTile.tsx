import { Pressable, View } from 'react-native';

import { colors } from '@/theme/tokens';
import { cn, Text } from '@/ui';
import { CheckCircleIcon, CircleIcon, type AppIcon } from '@/ui/icons';

export interface OptionTileProps {
  icon: AppIcon;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}


export function OptionTile({ icon: Icon, title, description, selected, onPress }: OptionTileProps) {
  const Mark = selected ? CheckCircleIcon : CircleIcon;

  return (
    <Pressable
      role="checkbox"
      aria-checked={selected}
      aria-label={title}
      accessibilityHint={description}
      onPress={onPress}
      className={cn(
        'min-h-11 flex-row items-center gap-4 rounded-card p-4 active:opacity-80',
        selected ? 'bg-brand' : 'bg-surface-raised',
      )}
    >
      <Icon
        size={24}
        weight={selected ? 'fill' : 'regular'}
        color={selected ? colors.accent : colors.brand}
      />
      <View className="flex-1 gap-0.5">
        <Text variant="label" tone={selected ? 'inverse' : 'default'}>
          {title}
        </Text>
        <Text variant="caption" tone={selected ? 'inverse' : 'muted'}>
          {description}
        </Text>
      </View>
      <Mark
        size={24}
        weight={selected ? 'fill' : 'regular'}
        color={selected ? colors.accent : colors.line.strong}
      />
    </Pressable>
  );
}
