import { View } from 'react-native';

import { colors } from '@/theme/tokens';

import { Button } from './Button';
import { cn } from './cn';
import { WarningCircleIcon, type AppIcon } from './icons';
import { Spinner } from './Spinner';
import { Text } from './Text';

export function LoadingState({ label, className }: { label?: string; className?: string }) {
  return (
    <View className={cn('flex-1 items-center justify-center gap-3 p-6', className)}>
      <Spinner size="large" />
      {label && <Text tone="muted">{label}</Text>}
    </View>
  );
}

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Oups, ça a coincé',
  message = 'Vérifie ta connexion, puis on réessaie.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <View className={cn('flex-1 items-center justify-center gap-2 p-6', className)}>
      <WarningCircleIcon size={28} color={colors.brand} />
      <Text variant="section" className="text-center">
        {title}
      </Text>
      <Text tone="muted" className="text-center">
        {message}
      </Text>
      {onRetry && <Button label="Réessayer" variant="outline" onPress={onRetry} className="mt-4" />}
    </View>
  );
}

export interface EmptyStateProps {
  icon: AppIcon;
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <View className={cn('flex-1 items-center justify-center gap-2 p-6', className)}>
      <Icon size={28} color={colors.brand} />
      <Text variant="section" className="text-center">
        {title}
      </Text>
      {description && (
        <Text tone="muted" className="text-center">
          {description}
        </Text>
      )}
      {action && (
        <Button
          label={action.label}
          variant="secondary"
          onPress={action.onPress}
          className="mt-4"
        />
      )}
    </View>
  );
}
