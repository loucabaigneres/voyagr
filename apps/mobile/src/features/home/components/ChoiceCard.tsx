import { Pressable, View } from 'react-native';

import { colors } from '@/theme/tokens';
import { Badge, cn, Spinner, Text } from '@/ui';
import { ArrowRightIcon, type AppIcon } from '@/ui/icons';

export interface ChoiceCardProps {
  icon: AppIcon;
  title: string;
  description: string;
  cta: string;
  onPress: () => void;
  /** Vino card for the recommended path; travertino otherwise. */
  featured?: boolean;
  badge?: string;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
}

/** One of the two ways to start a trip on the home screen. */
export function ChoiceCard({
  icon: Icon,
  title,
  description,
  cta,
  onPress,
  featured = false,
  badge,
  loading = false,
  loadingLabel,
  disabled = false,
}: ChoiceCardProps) {
  const isDisabled = disabled || loading;
  // On vino, accents switch to pesca and text to crema (charte: "accents sur fond sombre").
  const accentColor = featured ? colors.accent : colors.brand;

  return (
    <Pressable
      role="button"
      aria-label={title}
      accessibilityHint={description}
      aria-disabled={isDisabled}
      aria-busy={loading}
      disabled={isDisabled}
      onPress={onPress}
      className={cn(
        'gap-5 rounded-card p-6 active:opacity-90',
        featured ? 'bg-brand' : 'bg-surface',
        disabled && 'opacity-60',
      )}
    >
      <View className="flex-row items-start justify-between">
        <Icon size={28} color={accentColor} />
        {badge && <Badge label={badge} tone={featured ? 'accent' : 'brand'} />}
      </View>

      <View className="gap-1.5">
        <Text variant="section" tone={featured ? 'inverse' : 'brand'}>
          {title}
        </Text>
        <Text variant="caption" tone={featured ? 'inverse' : 'muted'} className="opacity-90">
          {description}
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        {loading ? (
          <>
            <Spinner tone={featured ? 'inverse' : 'brand'} />
            <Text variant="label" tone={featured ? 'accent' : 'brand'}>
              {loadingLabel}
            </Text>
          </>
        ) : (
          <>
            <Text variant="label" tone={featured ? 'accent' : 'brand'}>
              {cta}
            </Text>
            <ArrowRightIcon size={20} color={accentColor} />
          </>
        )}
      </View>
    </Pressable>
  );
}
