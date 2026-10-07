import { Pressable, type PressableProps } from 'react-native';

import { colors } from '@/theme/tokens';

import { cn } from './cn';
import type { AppIcon } from './icons';
import { Spinner } from './Spinner';
import { Text } from './Text';


const VARIANTS = {
  primary: { container: 'bg-primary', text: 'text-ink', icon: colors.ink.DEFAULT },
  secondary: { container: 'bg-brand', text: 'text-ink-inverse', icon: colors.ink.inverse },
  outline: { container: 'border border-brand', text: 'text-brand', icon: colors.brand },
  ghost: { container: '', text: 'text-brand underline', icon: colors.brand },
} as const;

const SIZES = {
  md: 'min-h-14 px-6',
  sm: 'min-h-11 px-4',
} as const;

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  loading?: boolean;
  /** Phosphor icon rendered after the label. */
  icon?: AppIcon;
  className?: string;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon: Icon,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const styles = VARIANTS[variant];
  const spinnerTone = variant === 'secondary' ? 'inverse' : 'brand';

  return (
    <Pressable
      role="button"
      aria-disabled={isDisabled}
      aria-busy={loading}
      disabled={isDisabled}
      className={cn(
        'flex-row items-center justify-center gap-2 rounded-button active:opacity-80',
        styles.container,
        SIZES[size],
        isDisabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      {loading && <Spinner tone={spinnerTone} />}
      <Text variant="label" className={styles.text}>
        {label}
      </Text>
      {!loading && Icon && <Icon size={20} color={styles.icon} />}
    </Pressable>
  );
}
